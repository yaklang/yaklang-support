import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { findYakBinary } from './utils/path';

let lspProcess: cp.ChildProcess | undefined;
let lspActive: boolean = false;
let lspStatusBar: vscode.StatusBarItem | undefined;
let completionProvider: vscode.Disposable | undefined;
let hoverProvider: vscode.Disposable | undefined;
let signatureProvider: vscode.Disposable | undefined;
let definitionProvider: vscode.Disposable | undefined;
let referencesProvider: vscode.Disposable | undefined;
let diagnosticCollection: vscode.DiagnosticCollection | undefined;

const LSP_HOST = '127.0.0.1';
const LSP_PORT = 9633;
const LSP_URL = `http://${LSP_HOST}:${LSP_PORT}`;

// 检查 LSP 是否已激活
export function isLSPActive(): boolean {
    return lspActive;
}

// 更新文档的语法诊断
async function updateDiagnostics(document: vscode.TextDocument): Promise<void> {
    if (!diagnosticCollection) {
        return;
    }
    
    try {
        const code = document.getText();
        const languageId = document.languageId;
        
        // 映射 VSCode 语言 ID 到 Yaklang 脚本类型
        const scriptType = languageId === 'syntaxflow' ? 'syntaxflow' : 'yak';
        
        console.log(`[Yaklang LSP] Checking diagnostics for ${document.uri.toString()}`);
        
        const response = await axios.post(`${LSP_URL}/lsp`, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'textDocument/diagnostics',
            params: {
                textDocument: {
                    uri: document.uri.toString(),
                    languageId: scriptType,
                    text: code
                }
            }
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        
        const result = response.data.result;
        if (result && Array.isArray(result)) {
            const diagnostics: vscode.Diagnostic[] = result.map((item: any) => {
                const startLine = Math.max(0, (item.startLineNumber || 1) - 1);
                const endLine = Math.max(0, (item.endLineNumber || 1) - 1);
                const startColumn = Math.max(0, (item.startColumn || 1) - 1);
                const endColumn = Math.max(0, (item.endColumn || 1) - 1);
                
                const range = new vscode.Range(
                    startLine,
                    startColumn,
                    endLine,
                    endColumn
                );
                
                // 映射严重程度
                let severity = vscode.DiagnosticSeverity.Error;
                if (item.severity) {
                    const sev = item.severity.toLowerCase();
                    if (sev === 'warning') {
                        severity = vscode.DiagnosticSeverity.Warning;
                    } else if (sev === 'information' || sev === 'info') {
                        severity = vscode.DiagnosticSeverity.Information;
                    } else if (sev === 'hint') {
                        severity = vscode.DiagnosticSeverity.Hint;
                    }
                }
                
                const message = item.message || item.rawMessage || 'Unknown error';
                const diagnostic = new vscode.Diagnostic(range, message, severity);
                
                if (item.tag) {
                    diagnostic.source = `yaklang:${item.tag}`;
                } else {
                    diagnostic.source = 'yaklang';
                }
                
                return diagnostic;
            });
            
            diagnosticCollection.set(document.uri, diagnostics);
            console.log(`[Yaklang LSP] ✅ Set ${diagnostics.length} diagnostics for ${document.uri.toString()}`);
        } else {
            // 清除诊断
            diagnosticCollection.set(document.uri, []);
            console.log(`[Yaklang LSP] ✅ Cleared diagnostics for ${document.uri.toString()}`);
        }
    } catch (error) {
        console.error('[Yaklang LSP] Diagnostics request failed:', error);
        // 失败时不清除现有诊断
    }
}

// 更新状态栏
function updateLSPStatusBar(status: 'starting' | 'active' | 'inactive' | 'error', message?: string) {
    if (!lspStatusBar) {
        lspStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        lspStatusBar.command = 'yaklang.lsp.showStatus';
    }

    switch (status) {
        case 'starting':
            lspStatusBar.text = '$(sync~spin) Yaklang LSP: 启动中...';
            lspStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            lspStatusBar.tooltip = '正在启动 Yaklang LSP HTTP 服务器...';
            break;
        case 'active':
            lspStatusBar.text = '$(check) Yaklang LSP: 已启用';
            lspStatusBar.backgroundColor = undefined;
            lspStatusBar.tooltip = 'Yaklang LSP HTTP 服务器运行正常\n点击查看详情';
            break;
        case 'inactive':
            lspStatusBar.text = '$(warning) Yaklang LSP: 未启用';
            lspStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            lspStatusBar.tooltip = message || 'LSP 未启用，使用静态补全\n点击查看详情';
            break;
        case 'error':
            lspStatusBar.text = '$(error) Yaklang LSP: 错误';
            lspStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            lspStatusBar.tooltip = message || 'LSP 启动失败\n点击查看详情';
            break;
    }

    lspStatusBar.show();
}

// 检查 LSP 服务器是否运行
async function checkLSPServer(): Promise<boolean> {
    try {
        const response = await axios.get(`${LSP_URL}/health`, { timeout: 2000 });
        return response.data.status === 'ok';
    } catch (error) {
        return false;
    }
}

// 启动 LSP HTTP 服务器
async function startLSPServer(context: vscode.ExtensionContext, yakBinary: string): Promise<boolean> {
    return new Promise((resolve) => {
        let logFile = context.logUri?.fsPath 
            ? `${context.logUri.fsPath}/yaklang-lsp-http.log`
            : '/tmp/yaklang-lsp-http.log';

        console.log('[Yaklang LSP] Starting server with command:', yakBinary, 'lsp --http --port', LSP_PORT);
        console.log('[Yaklang LSP] Log file:', logFile);

        // 确保日志目录存在
        try {
            const logDir = path.dirname(logFile);
            if (!fs.existsSync(logDir)) {
                console.log('[Yaklang LSP] Creating log directory:', logDir);
                fs.mkdirSync(logDir, { recursive: true });
            }
        } catch (error) {
            console.error('[Yaklang LSP] Failed to create log directory:', error);
            // 如果创建失败，使用 /tmp
            logFile = '/tmp/yaklang-lsp-http.log';
            console.log('[Yaklang LSP] Falling back to:', logFile);
        }

        try {
            lspProcess = cp.spawn(yakBinary, [
                'lsp',
                '--http',
                '--host', LSP_HOST,
                '--port', LSP_PORT.toString(),
                '--log-file', logFile
            ], {
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: process.env
            });

            console.log('[Yaklang LSP] Process spawned with PID:', lspProcess.pid);

            // 捕获输出用于调试
            lspProcess.stdout?.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    console.log('[Yaklang LSP stdout]:', output);
                }
            });

            lspProcess.stderr?.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    console.error('[Yaklang LSP stderr]:', output);
                }
            });

            lspProcess.on('error', (error) => {
                console.error('[Yaklang LSP] Process error:', error);
                console.error('[Yaklang LSP] Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                vscode.window.showErrorMessage(`启动 Yaklang LSP HTTP 失败：${error.message}`);
                resolve(false);
            });

            lspProcess.on('exit', (code, signal) => {
                console.log(`[Yaklang LSP] Server process exited with code ${code}, signal ${signal}`);
                if (code !== 0 && code !== null) {
                    console.error(`[Yaklang LSP] Abnormal exit detected. Check log file: ${logFile}`);
                    vscode.window.showErrorMessage(`Yaklang LSP 服务器异常退出 (code: ${code})`);
                }
                lspProcess = undefined;
            });

            // 等待服务器启动
            console.log('[Yaklang LSP] Waiting for server to start (2 seconds)...');
            setTimeout(async () => {
                const isRunning = await checkLSPServer();
                if (isRunning) {
                    console.log('[Yaklang LSP] ✅ Server health check passed');
                } else {
                    console.error('[Yaklang LSP] ❌ Server health check failed');
                    console.error('[Yaklang LSP] Server may not have started properly. Check log:', logFile);
                }
                resolve(isRunning);
            }, 2000);
        } catch (error) {
            console.error('[Yaklang LSP] Failed to spawn process:', error);
            resolve(false);
        }
    });
}

export async function activateLSP(context: vscode.ExtensionContext): Promise<void> {
    const yakBinary = findYakBinary(context);
    
    if (!yakBinary) {
        const errorMsg = '没有 Yaklang LSP 服务：未找到 yak 二进制文件';
        console.error('[Yaklang LSP]', errorMsg);
        updateLSPStatusBar('error', '未找到 yak 二进制文件');
        vscode.window.showErrorMessage(errorMsg);
        return;
    }

    console.log('[Yaklang LSP] Found yak binary:', yakBinary);

    // 检查服务器是否已经运行
    console.log('[Yaklang LSP] Checking if LSP server is already running...');
    updateLSPStatusBar('starting');
    let isRunning = await checkLSPServer();
    
    // 如果没有运行，尝试启动
    if (!isRunning) {
        console.log('[Yaklang LSP] Server not running, attempting to start...');
        vscode.window.showInformationMessage('正在启动 Yaklang LSP HTTP 服务器...');
        
        isRunning = await startLSPServer(context, yakBinary);
        
        if (!isRunning) {
            const errorMsg = '启动 Yaklang LSP HTTP 失败：无法启动服务器';
            console.error('[Yaklang LSP]', errorMsg);
            console.error('[Yaklang LSP] Please check the log file for details');
            updateLSPStatusBar('error', '无法启动服务器');
            vscode.window.showErrorMessage(errorMsg);
            return;
        }
        
        console.log('[Yaklang LSP] Server started successfully');
    } else {
        console.log('[Yaklang LSP] Server is already running');
    }

    try {
        console.log('[Yaklang LSP] Registering HTTP LSP completion provider...');
        
        // 直接注册补全 provider，使用 HTTP 调用 LSP 服务器
        completionProvider = vscode.languages.registerCompletionItemProvider(
            ['yak', 'syntaxflow'],
            {
                async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                    console.log('[Yaklang LSP] provideCompletionItems called');
                    console.log('[Yaklang LSP] Position:', position.line, position.character);
                    
                    try {
                        const code = document.getText();
                        console.log(`[Yaklang LSP] Sending HTTP completion request to ${LSP_URL}/lsp`);
                        
                        const response = await axios.post(`${LSP_URL}/lsp`, {
                            jsonrpc: '2.0',
                            id: Date.now(),
                            method: 'textDocument/completion',
                            params: {
                                textDocument: {
                                    uri: document.uri.toString(),
                                    text: code  // 直接传递文档内容
                                },
                                position: {
                                    line: position.line,
                                    character: position.character
                                }
                            }
                        }, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 5000
                        });

                        console.log('[Yaklang LSP] ✅ HTTP Response received');
                        
                        const items = response.data.result || [];
                        console.log(`[Yaklang LSP] Got ${items.length} completion items`);
                        
                        // 转换为 VSCode CompletionItem
                        return items.map((item: any) => {
                            const completionItem = new vscode.CompletionItem(
                                item.label,
                                item.kind || vscode.CompletionItemKind.Text
                            );
                            if (item.detail) {
                                completionItem.detail = item.detail;
                            }
                            if (item.documentation) {
                                completionItem.documentation = new vscode.MarkdownString(
                                    typeof item.documentation === 'string' 
                                        ? item.documentation 
                                        : item.documentation.value
                                );
                            }
                            if (item.insertText) {
                                completionItem.insertText = item.insertText;
                            }
                            return completionItem;
                        });
                    } catch (error) {
                        console.error('[Yaklang LSP] ❌ HTTP completion request failed:', error);
                        return [];
                    }
                }
            },
            '.', '(' // 触发字符
        );

        console.log('[Yaklang LSP] ✅ LSP completion provider registered');
        
        // 注册 Hover Provider
        hoverProvider = vscode.languages.registerHoverProvider(
            ['yak', 'syntaxflow'],
            {
                async provideHover(document: vscode.TextDocument, position: vscode.Position) {
                    console.log('[Yaklang LSP] provideHover called');
                    
                    try {
                        const code = document.getText();
                        const line = position.line;
                        const character = position.character;
                        
                        const response = await axios.post(`${LSP_URL}/lsp`, {
                            jsonrpc: '2.0',
                            id: Date.now(),
                            method: 'textDocument/hover',
                            params: {
                                textDocument: { 
                                    uri: document.uri.toString(),
                                    text: code
                                },
                                position: { line, character }
                            }
                        }, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 5000
                        });
                        
                        const result = response.data.result;
                        if (result) {
                            // 检查是否是标准 LSP hover 响应
                            if (result.contents) {
                                const markdown = new vscode.MarkdownString();
                                if (typeof result.contents === 'string') {
                                    markdown.appendMarkdown(result.contents);
                                } else if (result.contents.value) {
                                    markdown.appendMarkdown(result.contents.value);
                                }
                                return new vscode.Hover(markdown);
                            }
                            // 兼容旧格式（SuggestionDescription 数组）
                            else if (Array.isArray(result) && result.length > 0) {
                                const item = result[0];
                                const markdown = new vscode.MarkdownString();
                                if (item.label) {
                                    markdown.appendCodeblock(item.label, 'yak');
                                }
                                if (item.description) {
                                    markdown.appendMarkdown('\n\n' + item.description);
                                }
                                return new vscode.Hover(markdown);
                            }
                        }
                        return null;
                    } catch (error) {
                        console.error('[Yaklang LSP] Hover request failed:', error);
                        return null;
                    }
                }
            }
        );
        console.log('[Yaklang LSP] ✅ LSP hover provider registered');
        
        // 注册 Signature Help Provider
        signatureProvider = vscode.languages.registerSignatureHelpProvider(
            ['yak', 'syntaxflow'],
            {
                async provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
                    console.log('[Yaklang LSP] provideSignatureHelp called');
                    
                    try {
                        const code = document.getText();
                        const line = position.line;
                        const character = position.character;
                        
                        const response = await axios.post(`${LSP_URL}/lsp`, {
                            jsonrpc: '2.0',
                            id: Date.now(),
                            method: 'textDocument/signatureHelp',
                            params: {
                                textDocument: { 
                                    uri: document.uri.toString(),
                                    text: code
                                },
                                position: { line, character }
                            }
                        }, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 5000
                        });
                        
                        const result = response.data.result;
                        if (result) {
                            const signatureHelp = new vscode.SignatureHelp();
                            
                            // 检查是否是标准 LSP signatureHelp 响应
                            if (result.signatures) {
                                result.signatures.forEach((sig: any) => {
                                    const signature = new vscode.SignatureInformation(sig.label || '');
                                    if (sig.documentation) {
                                        if (typeof sig.documentation === 'string') {
                                            signature.documentation = new vscode.MarkdownString(sig.documentation);
                                        } else if (sig.documentation.value) {
                                            signature.documentation = new vscode.MarkdownString(sig.documentation.value);
                                        }
                                    }
                                    signatureHelp.signatures.push(signature);
                                });
                                signatureHelp.activeSignature = result.activeSignature || 0;
                                signatureHelp.activeParameter = result.activeParameter || 0;
                                return signatureHelp;
                            }
                            // 兼容旧格式（SuggestionDescription 数组）
                            else if (Array.isArray(result) && result.length > 0) {
                                result.forEach((item: any) => {
                                    const signature = new vscode.SignatureInformation(item.label || '');
                                    if (item.description) {
                                        signature.documentation = new vscode.MarkdownString(item.description);
                                    }
                                    signatureHelp.signatures.push(signature);
                                });
                                signatureHelp.activeSignature = 0;
                                signatureHelp.activeParameter = 0;
                                return signatureHelp;
                            }
                        }
                        return null;
                    } catch (error) {
                        console.error('[Yaklang LSP] Signature help request failed:', error);
                        return null;
                    }
                }
            },
            '(', ','
        );
        console.log('[Yaklang LSP] ✅ LSP signature help provider registered');
        
        // 注册 Definition Provider
        definitionProvider = vscode.languages.registerDefinitionProvider(
            ['yak', 'syntaxflow'],
            {
                async provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
                    console.log('[Yaklang LSP] provideDefinition called');
                    
                    try {
                        const code = document.getText();
                        const line = position.line;
                        const character = position.character;
                        
                        const response = await axios.post(`${LSP_URL}/lsp`, {
                            jsonrpc: '2.0',
                            id: Date.now(),
                            method: 'textDocument/definition',
                            params: {
                                textDocument: { 
                                    uri: document.uri.toString(),
                                    text: code
                                },
                                position: { line, character }
                            }
                        }, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 5000
                        });
                        
                        const result = response.data.result;
                        if (result && result.uri && result.ranges && result.ranges.length > 0) {
                            const range = result.ranges[0];
                            return new vscode.Location(
                                vscode.Uri.parse(result.uri),
                                new vscode.Range(
                                    range.startLine || 0,
                                    range.startColumn || 0,
                                    range.endLine || 0,
                                    range.endColumn || 0
                                )
                            );
                        }
                        return null;
                    } catch (error) {
                        console.error('[Yaklang LSP] Definition request failed:', error);
                        return null;
                    }
                }
            }
        );
        console.log('[Yaklang LSP] ✅ LSP definition provider registered');
        
        // 注册 References Provider
        referencesProvider = vscode.languages.registerReferenceProvider(
            ['yak', 'syntaxflow'],
            {
                async provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext) {
                    console.log('[Yaklang LSP] provideReferences called');
                    
                    try {
                        const code = document.getText();
                        const line = position.line;
                        const character = position.character;
                        
                        const response = await axios.post(`${LSP_URL}/lsp`, {
                            jsonrpc: '2.0',
                            id: Date.now(),
                            method: 'textDocument/references',
                            params: {
                                textDocument: { 
                                    uri: document.uri.toString(),
                                    text: code
                                },
                                position: { line, character },
                                context: { includeDeclaration: context.includeDeclaration }
                            }
                        }, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 5000
                        });
                        
                        const result = response.data.result;
                        if (result && result.uri && result.ranges) {
                            return result.ranges.map((range: any) => new vscode.Location(
                                vscode.Uri.parse(result.uri),
                                new vscode.Range(
                                    range.startLine || 0,
                                    range.startColumn || 0,
                                    range.endLine || 0,
                                    range.endColumn || 0
                                )
                            ));
                        }
                        return [];
                    } catch (error) {
                        console.error('[Yaklang LSP] References request failed:', error);
                        return [];
                    }
                }
            }
        );
        console.log('[Yaklang LSP] ✅ LSP references provider registered');
        
        // 创建 Diagnostic Collection
        diagnosticCollection = vscode.languages.createDiagnosticCollection('yaklang');
        console.log('[Yaklang LSP] ✅ Diagnostic collection created');
        
        // 注册文档变化监听，自动进行语法检查
        const documentChangeListener = vscode.workspace.onDidChangeTextDocument(async (event) => {
            if (event.document.languageId === 'yak' || event.document.languageId === 'syntaxflow') {
                await updateDiagnostics(event.document);
            }
        });
        
        // 注册文档打开监听
        const documentOpenListener = vscode.workspace.onDidOpenTextDocument(async (document) => {
            if (document.languageId === 'yak' || document.languageId === 'syntaxflow') {
                await updateDiagnostics(document);
            }
        });
        
        // 对当前打开的文档进行语法检查
        vscode.workspace.textDocuments.forEach(async (document) => {
            if (document.languageId === 'yak' || document.languageId === 'syntaxflow') {
                await updateDiagnostics(document);
            }
        });
        
        console.log('[Yaklang LSP] ✅ Document change listeners registered');
        
        // 标记 LSP 已激活
        lspActive = true;
        console.log('[Yaklang LSP] LSP is now ACTIVE with all features');
        updateLSPStatusBar('active');
        
        context.subscriptions.push(
            completionProvider,
            hoverProvider,
            signatureProvider,
            definitionProvider,
            referencesProvider,
            diagnosticCollection,
            documentChangeListener,
            documentOpenListener
        );
        context.subscriptions.push({
            dispose: () => {
                console.log('[Yaklang LSP] Disposing LSP resources...');
                lspActive = false;
                updateLSPStatusBar('inactive');
                if (completionProvider) {
                    completionProvider.dispose();
                    completionProvider = undefined;
                }
                if (lspProcess) {
                    lspProcess.kill();
                    lspProcess = undefined;
                }
                if (lspStatusBar) {
                    lspStatusBar.dispose();
                    lspStatusBar = undefined;
                }
            }
        });

        vscode.window.showInformationMessage('加载 Yaklang LSP HTTP 成功');
        console.log('[Yaklang LSP] 🎉 All systems ready!');
    } catch (error) {
        console.error('[Yaklang LSP] ❌ Failed to start LSP client:', error);
        console.error('[Yaklang LSP] Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
        });
        updateLSPStatusBar('error', (error as Error).message);
        vscode.window.showErrorMessage('启动 Yaklang LSP HTTP 失败：' + (error as Error).message);
        
        // 清理进程
        if (lspProcess) {
            console.log('[Yaklang LSP] Cleaning up LSP server process...');
            lspProcess.kill();
            lspProcess = undefined;
        }
    }
}

export function deactivateLSP(): Thenable<void> | undefined {
    console.log('[Yaklang LSP] Deactivating LSP...');
    lspActive = false;
    
    if (completionProvider) {
        completionProvider.dispose();
        completionProvider = undefined;
    }
    
    if (hoverProvider) {
        hoverProvider.dispose();
        hoverProvider = undefined;
    }
    
    if (signatureProvider) {
        signatureProvider.dispose();
        signatureProvider = undefined;
    }
    
    if (definitionProvider) {
        definitionProvider.dispose();
        definitionProvider = undefined;
    }
    
    if (referencesProvider) {
        referencesProvider.dispose();
        referencesProvider = undefined;
    }
    
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
        diagnosticCollection = undefined;
    }
    
    if (lspProcess) {
        lspProcess.kill();
        lspProcess = undefined;
    }
    
    if (lspStatusBar) {
        lspStatusBar.dispose();
        lspStatusBar = undefined;
    }
    
    return Promise.resolve();
}

