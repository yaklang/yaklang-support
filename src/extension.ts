/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { registerDebugger } from './activateDebug';
import { registerYakFormatter } from './fmt';
import * as commands from './commands';
import { CompletionSchema, getCompletions } from './completionSchema';
import { registerStatusBar } from './statusbar';
import { findYakBinary } from './utils/path';
import { registerSyntaxflow } from './syntaxflow';
import { activateLSP, deactivateLSP, isLSPActive } from './lspClient';

// 用于跟踪是否已经显示过静态补全警告
let staticCompletionWarningShown = false;

export async function activate(context: vscode.ExtensionContext) {
    // 启动 LSP 客户端（HTTP 模式）
    try {
        await activateLSP(context);
    } catch (error) {
        console.error('Failed to start LSP client:', error);
        vscode.window.showWarningMessage('Yaklang LSP 启动失败，使用静态补全作为后备');
    }

    // 保留静态补全作为后备
    const completions = getCompletions();
    let maxLengthWithPadding: number = 26;
    (completions?.fieldsCompletions||[]).forEach(i => {
        maxLengthWithPadding = i.fieldName.length + 4 > maxLengthWithPadding ? i.fieldName.length + 4 : maxLengthWithPadding
    })
    const hoverProvider = vscode.languages.registerSignatureHelpProvider(
        "yak",
        {
            provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token, context) {
                const helper = new vscode.SignatureHelp();

                const lineText = document.lineAt(position.line);

                let funcNames = [];
                let field = 1;
                let activeParameter = 0;
                let inString = false;

                // 向前寻找
                for (let i = position.character - 1; i >= 0; i--) {
                    const char = lineText.text.charAt(i);
                    if (field > 0) {
                        if (!inString && char == '"') {
                            // 双引号 字符串展开 
                            inString = true
                        } else if (inString && char == '"' && lineText.text.charAt(i - 1) != '\\') {
                            // 双引号 字符串闭合
                            inString = false
                        } else if (!inString && char == '(') {
                            field--;
                        } else if (!inString && char == ')') {
                            field++;
                        } else if (!inString && char == ',') {
                            activeParameter++
                        }
                    } else if (field == 0) {
                        if (funcNames.length == 0 && /\s/.test(char)) {
                            continue;
                        } else if (/\w/.test(char)) {

                            funcNames.push(char)

                            if (funcNames.length > 0 && (/\W/.test(lineText.text.charAt(i - 1)) || i == 0)) {
                                const funcName = funcNames.reverse().join("");
                                // const SignatureInformation = new vscode.SignatureInformation(`${func.id}(${func.takes.length > 0 ? func.takes.map(x => x.origin()).join(", ") : ""}) -> ${func.returns ?? "nothing"}`);
                                // SignatureInformation.documentation = new vscode.MarkdownString().appendText(program.description(func));
                                (completions?.libCompletions||[]).forEach(lib => {
                                    (lib?.functions||[]).forEach(func => {
                                        if (func.functionName.substr(0, func.functionName.indexOf('(')) == funcName) {
                                            const sigInfo = new vscode.SignatureInformation(`Guess: ${func.definitionStr}`);
                                            sigInfo.documentation = new vscode.MarkdownString(func.document || "### sorry no doc for now...")
                                            helper.activeParameter = activeParameter
                                            helper.signatures.push(sigInfo)
                                        }
                                    })
                                })

                                break
                            }
                        }
                    }
                }

                return helper;
            }
        },
        "(", ","
    )
    const provider2 = vscode.languages.registerCompletionItemProvider(
        'yak',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const lspIsActive = isLSPActive();
                
                // 如果 LSP 已激活，返回空列表让 LSP 处理
                if (lspIsActive) {
                    return []; // LSP 补全已激活，使用 LSP
                }
                
                // 检查 LSP 是否已激活，如果未激活则显示警告（仅一次）
                if (!lspIsActive && !staticCompletionWarningShown) {
                    staticCompletionWarningShown = true;
                    console.warn('[Yaklang] ⚠️  LSP 补全未启用，正在使用静态补全（功能受限）');
                    console.warn('[Yaklang] 静态补全特性：');
                    console.warn('[Yaklang]   - ✅ 标准库名称补全');
                    console.warn('[Yaklang]   - ✅ 标准库函数补全');
                    console.warn('[Yaklang]   - ⚠️  对象方法补全（有限）');
                    console.warn('[Yaklang]   - ❌ 实时类型推断');
                    console.warn('[Yaklang] 建议：检查 LSP 服务器是否正常启动');
                    vscode.window.showWarningMessage('LSP 补全未启用，正在使用静态补全（功能受限）', '查看日志').then(selection => {
                        if (selection === '查看日志') {
                            vscode.commands.executeCommand('workbench.action.toggleDevTools');
                        }
                    });
                }

                console.log('[Yaklang Static Completion] Using static completion');
                
                // get all text until the `position` and check if it reads `console.`
                // and if so then complete if `log`, `warn`, and `error`
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                let items: vscode.CompletionItem[] = []

                // 补充内置扩展库的补全提示
                let isLibName: boolean = false;
                (completions?.libCompletions||[]).forEach(e => {
                    if (!linePrefix.endsWith(e.prefix)) {
                        return
                    }
                    isLibName = true
                    items.push(...e.functions.map(i => {
                        let item = new vscode.CompletionItem(i.functionName);
                        item.detail = i.definitionStr
                        item.insertText = new vscode.SnippetString(i.functionName)
                        if (i.document) {
                            item.documentation = new vscode.MarkdownString(i.document);
                        }
                        return item
                    }))
                })

                // 没有内置库，提供一些方法，字段调用的补全（虽然不一定正确，但是能省得用户老查手册）
                if (!isLibName) {
                    (completions?.fieldsCompletions||[]).forEach(e => {
                        let blocks = linePrefix.split(".").map(i => i.trim());
                        if (blocks.length > 0) {
                            let fieldName = e.fieldName.toLowerCase();
                            let targetPrompt = blocks[blocks.length - 1].toLowerCase();
                            if (fieldName.startsWith(targetPrompt)) {
                                let completionItem = new vscode.CompletionItem(`${e.fieldName.padEnd(maxLengthWithPadding)} struct:${e.structNameShort}`);
                                completionItem.documentation = `desc for ${e.fieldName}`
                                if (e.isMethod) {
                                    completionItem.insertText = new vscode.SnippetString(e.methodsCompletion)
                                } else {
                                    completionItem.insertText = new vscode.SnippetString(e.fieldName)
                                }
                                items.push(completionItem)
                            }
                        }
                    })
                }

                if (items.length <= 0) {
                    return completions.libNames.map(i => new vscode.CompletionItem(i))
                }
                return [
                    ...items,
                ]
            }
        },
        '.' // triggered whenever a '.' is being typed
    );

    let execYakShortcut = vscode.languages.registerCodeActionsProvider(
        "yak",
        {
            provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken) {

                let action = new vscode.CodeAction("Yak: Run file", vscode.CodeActionKind.Empty)
                action.isPreferred = true
                action.command = {
                    command: "yak.exec.file",
                    arguments: [document.fileName],
                    title: "Quick Exec Current Yak Script",
                }
                return [action]
            }
        },
    )

    context.subscriptions.push(
        provider2, hoverProvider,
        execYakShortcut,
    );


    // debug
    registerDebugger(context);
    // formatter
    registerYakFormatter(context);
    // statusbar
    registerStatusBar(context);

    // syntaxflow 
    registerSyntaxflow(context);

    // commands
    let commandExecFile = vscode.commands.registerCommand('yak.exec.file', args => {
        return commands.execFile(context)(args)
    });
    let commandDebugFile = vscode.commands.registerCommand('yak.debug.file', commands.debugFile);
    let commandFmtFile = vscode.commands.registerCommand('yak.fmt.file', commands.formatFile);
    let commandYakEnvStatus =  vscode.commands.registerCommand('yak.environment.status', commands.expandYakStatusBar(context));
    let commandLSPStatus = vscode.commands.registerCommand('yaklang.lsp.showStatus', () => {
        const lspActive = isLSPActive();
        const message = lspActive 
            ? '✅ Yaklang LSP HTTP 服务器运行正常\n\n服务地址: http://127.0.0.1:9633\n状态: 已启用\n补全模式: LSP 动态补全'
            : '⚠️  Yaklang LSP 未启用\n\n当前使用: 静态补全（功能受限）\n\n建议:\n1. 检查开发者控制台日志\n2. 确认 yak 命令可用\n3. 检查端口 9633 是否被占用';
        
        const action = lspActive ? '查看日志' : '打开日志';
        vscode.window.showInformationMessage(message, action, '关闭').then(selection => {
            if (selection === action || selection === '查看日志' || selection === '打开日志') {
                vscode.commands.executeCommand('workbench.action.toggleDevTools');
            }
        });
    });
    context.subscriptions.push(commandExecFile,commandDebugFile, commandFmtFile, commandYakEnvStatus, commandLSPStatus);
}

export function deactivate(): Thenable<void> | undefined {
    return deactivateLSP();
}