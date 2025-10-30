/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { registerDebugger } from './activateDebug';
import { registerYakFormatter } from './fmt';
import * as commands from './commands';
import { CompletionSchema, getCompletions } from './completionSchema';
import { registerStatusBar } from './statusbar';
import { findYakBinary, downloadYakEngine, listInstalledYakVersions, getYakSymlinkPath } from './utils/path';
import { registerSyntaxflow } from './syntaxflow';
import { registerYakCodeLens } from './codeLens';
import { registerSimpleYakCodeLens } from './simpleCodeLens';
import { activateLSP, deactivateLSP, isLSPActive } from './lspClient';
import { getAvailableYaklangVersions } from './utils/version';
import { t, initI18n, setLocale, getLocale, getAvailableLocales } from './i18n';

// 用于跟踪是否已经显示过静态补全警告
let staticCompletionWarningShown = false;

export async function activate(context: vscode.ExtensionContext) {
    // 初始化 i18n
    initI18n(context);
    
    // 后台获取可用版本列表并缓存（不阻塞启动流程）
    getAvailableYaklangVersions(context).catch(err => {
        console.error('[Yaklang] Failed to fetch available versions:', err);
    });

    // 监听配置变更，当 yak 二进制配置改变时更新状态栏并重启 LSP
    const configWatcher = vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('yaklang.yakBinarySource') || 
            e.affectsConfiguration('yaklang.yakBinaryPath')) {
            console.log('[Yaklang] Configuration changed, updating status bar and restarting LSP...');
            
            // 先更新状态栏显示新的引擎信息
            const { updateStatusBar } = require('./statusbar');
            await updateStatusBar(context);
            
            // 显示通知
            const yakBinary = findYakBinary(context);
            if (yakBinary) {
                vscode.window.showInformationMessage(t('config.updated', yakBinary));
            }
            
            // 重启 LSP
            const { restartLSP } = require('./lspClient');
            await restartLSP(context);
        }
    });
    context.subscriptions.push(configWatcher);

    // 先注册状态栏并获取 Yak 引擎版本（这样可以先显示引擎状态）
    await registerStatusBar(context);

    // LSP 客户端作为可选功能在后台启动（不阻塞其他功能）
    console.log('[Extension] Starting LSP in background...');
    activateLSP(context).catch(error => {
        console.error('[Extension] LSP startup failed (non-blocking):', error);
        vscode.window.showWarningMessage(t('lsp.startupWarning'));
    });

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
                    console.warn(`[Yaklang] WARNING: ${t('completion.warning')}`);
                    console.warn(`[Yaklang] ${t('completion.features')}`);
                    console.warn(`[Yaklang] ${t('completion.supportLibName')}`);
                    console.warn(`[Yaklang] ${t('completion.supportLibFunc')}`);
                    console.warn(`[Yaklang] ${t('completion.limitedMethod')}`);
                    console.warn(`[Yaklang] ${t('completion.noTypeInfer')}`);
                    console.warn(`[Yaklang] ${t('completion.checkLsp')}`);
                    vscode.window.showWarningMessage(t('completion.warning'), t('common.viewLog')).then(selection => {
                        if (selection === t('common.viewLog')) {
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

    // syntaxflow 
    registerSyntaxflow(context);
    
    // CodeLens - 使用简单版本进行测试（独立于 LSP）
    console.log('[Extension] Registering simple CodeLens (LSP-independent)');
    try {
        registerSimpleYakCodeLens(context);
        console.log('[Extension] Simple CodeLens registered successfully');
    } catch (error) {
        console.error('[Extension] Failed to register CodeLens:', error);
        vscode.window.showErrorMessage('Failed to register CodeLens: ' + error);
    }

    // commands
    let commandExecFile = vscode.commands.registerCommand('yak.exec.file', args => {
        return commands.execFile(context)(args)
    });
    let commandDebugFile = vscode.commands.registerCommand('yak.debug.file', commands.debugFile);
    let commandFmtFile = vscode.commands.registerCommand('yak.fmt.file', commands.formatFile);
    let commandYakEnvStatus =  vscode.commands.registerCommand('yak.environment.status', commands.expandYakStatusBar(context));
    let commandLSPStatus = vscode.commands.registerCommand('yaklang.lsp.showStatus', () => {
        const lspActive = isLSPActive();
        const message = lspActive ? t('lsp.status.running') : t('lsp.status.notRunning');
        
        const action = lspActive ? t('common.viewLog') : t('common.openLog');
        vscode.window.showInformationMessage(message, action, t('common.close')).then(selection => {
            if (selection === action || selection === t('common.viewLog') || selection === t('common.openLog')) {
                vscode.commands.executeCommand('workbench.action.toggleDevTools');
            }
        });
    });
    
    // 添加重启 LSP 服务器命令
    let commandRestartLSP = vscode.commands.registerCommand('yaklang.lsp.restart', async () => {
        const { restartLSP } = require('./lspClient');
        await restartLSP(context);
    });
    
    // 添加下载 Yak 引擎命令
    let commandDownloadEngine = vscode.commands.registerCommand('yaklang.downloadEngine', async (forceRefresh: boolean = false) => {
        try {
            // 获取可用版本列表（支持强制刷新）
            let versionInfos: any[] = [];
            
            if (forceRefresh) {
                await vscode.window.withProgress(
                    {
                        title: t('engine.download.refreshing'),
                        location: vscode.ProgressLocation.Notification
                    },
                    async () => {
                        versionInfos = await getAvailableYaklangVersions(context, true);
                    }
                );
                vscode.window.showInformationMessage(t('engine.download.refreshed'));
            } else {
                versionInfos = await getAvailableYaklangVersions(context);
            }
            
            if (!versionInfos || versionInfos.length === 0) {
                vscode.window.showErrorMessage(t('engine.download.noVersions'));
                return;
            }
            
            // 转换为 QuickPick 项目，添加刷新选项
            const items = [
                {
                    label: '$(sync) ' + t('engine.download.refresh'),
                    description: t('engine.download.refreshDescription'),
                    detail: '__refresh__',
                    version: '__refresh__',
                    alwaysShow: true
                },
                ...versionInfos.map(info => ({
                    label: info.displayName,
                    description: info.isLatest ? t('engine.download.latest') : '',
                    detail: t('engine.download.versionLabel', info.version),
                    version: info.version
                }))
            ];
            
            // 显示版本选择
            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: t('engine.download.selectVersion'),
                ignoreFocusOut: true
            });
            
            if (!selectedItem) {
                return; // 用户取消
            }
            
            // 如果选择了刷新，重新调用命令并强制刷新
            if (selectedItem.version === '__refresh__') {
                return vscode.commands.executeCommand('yaklang.downloadEngine', true);
            }
            
            // 下载引擎
            await downloadYakEngine(selectedItem.version, context);
            
            // 提示是否重启 LSP
            const restart = await vscode.window.showInformationMessage(
                t('engine.download.restartPrompt'),
                t('common.restart'),
                t('common.later')
            );
            
            if (restart === t('common.restart')) {
                const { restartLSP } = require('./lspClient');
                await restartLSP(context);
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(t('engine.download.failed', errorMessage));
            console.error('[yaklang.downloadEngine] Error:', error);
        }
    });
    
    // 添加语言切换命令
    let commandSwitchLanguage = vscode.commands.registerCommand('yaklang.switchLanguage', async () => {
        const locales = getAvailableLocales();
        const currentLocale = getLocale();
        
        const items = locales.map(locale => ({
            label: locale.name,
            description: locale.id === currentLocale ? t('lang.current') : '',
            id: locale.id
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: t('lang.selectLanguage'),
            ignoreFocusOut: true
        });
        
        if (!selected || selected.id === currentLocale) {
            return; // 用户取消或选择当前语言
        }
        
        // 设置新语言
        await setLocale(selected.id, context);
        
        // 通知用户语言已切换
        const langName = selected.id === 'zh-CN' ? t('lang.zhCN') : t('lang.enUS');
        const reloadAction = selected.id === 'zh-CN' ? '立即重载' : 'Reload Now';
        const laterAction = selected.id === 'zh-CN' ? '稍后' : 'Later';
        const message = selected.id === 'zh-CN' 
            ? `语言已切换到 ${langName}` 
            : `Language switched to ${langName}`;
        const reloadMessage = selected.id === 'zh-CN'
            ? '切换语言后需要重新加载窗口才能完全生效'
            : 'Window reload required for language change to take full effect';
        
        const choice = await vscode.window.showInformationMessage(
            `${message}\n${reloadMessage}`,
            reloadAction,
            laterAction
        );
        
        if (choice === reloadAction) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    });
    
    // 添加查看已安装版本命令
    let commandListInstalledVersions = vscode.commands.registerCommand('yaklang.listInstalledVersions', async () => {
        try {
            const versions = listInstalledYakVersions();
            
            if (versions.length === 0) {
                vscode.window.showInformationMessage(t('engine.download.noInstalled'));
                return;
            }
            
            const currentPath = getYakSymlinkPath();
            const items = versions.map(v => ({
                label: v,
                description: `~/.yak/bin/yak_${v}`,
                detail: ''
            }));
            
            vscode.window.showQuickPick(items, {
                placeHolder: t('engine.download.installedVersions', currentPath),
                ignoreFocusOut: true
            });
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(t('engine.download.getInstalledFailed', errorMessage));
            console.error('[yaklang.listInstalledVersions] Error:', error);
        }
    });
    
    context.subscriptions.push(
        commandExecFile, 
        commandDebugFile, 
        commandFmtFile, 
        commandYakEnvStatus, 
        commandLSPStatus, 
        commandRestartLSP,
        commandDownloadEngine,
        commandListInstalledVersions,
        commandSwitchLanguage
    );
}

export function deactivate(): Thenable<void> | undefined {
    return deactivateLSP();
}