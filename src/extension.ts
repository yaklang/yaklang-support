/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { registerDebugger } from './activateDebug';
import { registerYakFormatter } from './fmt';
import * as commands from './commands';
import { CompletionSchema, getCompletions } from './completionSchema';

const completions = getCompletions();
let maxLengthWithPadding: number = 26;
completions.fieldsCompletions.forEach(i => {
    maxLengthWithPadding = i.fieldName.length + 4 > maxLengthWithPadding ? i.fieldName.length + 4 : maxLengthWithPadding
})

export function activate(context: vscode.ExtensionContext) {
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
                                completions.libCompletions.forEach(lib => {
                                    lib.functions.forEach(func => {
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
                // get all text until the `position` and check if it reads `console.`
                // and if so then complete if `log`, `warn`, and `error`
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                let items: vscode.CompletionItem[] = []

                // 补充内置扩展库的补全提示
                let isLibName: boolean = false;
                completions.libCompletions.forEach(e => {
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
                    completions.fieldsCompletions.forEach(e => {
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

    let terminal = vscode.window.createTerminal({ name: "YAK Runner" });
    let execYakCommandProvider = vscode.commands.registerCommand(
        "yak.exec", (args: string) => {
            if (terminal.exitStatus) {
                terminal = vscode.window.createTerminal({ name: "YAK Runner" });
            }
            terminal.show(true);
            if (args) {
                terminal.sendText(`yak ${args}`, true);
            } else {
                if (vscode.window.activeTextEditor?.document) {
                    terminal.sendText(`yak ${vscode.window.activeTextEditor?.document.fileName}`)
                }
            }
        }
    )

    let execYakShortcut = vscode.languages.registerCodeActionsProvider(
        "yak",
        {
            provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken) {

                let action = new vscode.CodeAction("Exec Yak Script", vscode.CodeActionKind.Empty)
                action.isPreferred = true
                action.command = {
                    command: "yak.exec",
                    arguments: [document.fileName],
                    title: "Quick Exec Current Yak Script",
                }
                return [action]
            }
        },
    )

    context.subscriptions.push(
        provider2, hoverProvider, execYakCommandProvider,
        execYakShortcut,
    );


    // debug
    registerDebugger(context);
    // formatter
    registerYakFormatter(context);

    // commands
    let disposable = vscode.commands.registerCommand('yak.debug.file', commands.debugFile);
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('yak.fmt.file', commands.formatFile);
    context.subscriptions.push(disposable);
}