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
const LSP_PORT = 9339;
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
        } else {
            // 清除诊断
            diagnosticCollection.set(document.uri, []);
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

// 检查 LSP 服务器是否运行并验证功能
async function checkLSPServer(retries: number = 1, verifyCompletion: boolean = false): Promise<boolean> {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[Yaklang LSP] Health check attempt ${i + 1}/${retries}...`);
            const response = await axios.get(`${LSP_URL}/health`, { timeout: 3000 });
            if (response.data && response.data.status === 'ok') {
                console.log('[Yaklang LSP] Health check passed');
                
                // 如果需要验证补全功能
                if (verifyCompletion) {
                    console.log('[Yaklang LSP] Verifying completion functionality...');
                    const isValid = await verifyLSPCompletion();
                    if (isValid) {
                        console.log('[Yaklang LSP] Completion verification passed');
                        return true;
                    } else {
                        console.log('[Yaklang LSP] Completion verification failed');
                        return false;
                    }
                }
                
                return true;
            }
        } catch (error) {
            console.log(`[Yaklang LSP] Health check attempt ${i + 1} failed:`, error instanceof Error ? error.message : String(error));
            if (i < retries - 1) {
                // 等待 500ms 再重试
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }
    return false;
}

// 验证 LSP 补全功能是否正常工作
async function verifyLSPCompletion(): Promise<boolean> {
    try {
        // 测试代码：输入 "str." 应该能获得字符串方法补全
        const testCode = 'str.';
        const testUri = 'file:///test.yak';
        
        const completionRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'textDocument/completion',
            params: {
                textDocument: { uri: testUri },
                position: { line: 0, character: testCode.length },
                context: { triggerKind: 2, triggerCharacter: '.' }
            }
        };

        const requestPayload = {
            code: testCode,
            request: completionRequest
        };

        console.log('[Yaklang LSP] Sending completion verification request:');
        console.log('[Yaklang LSP] URL:', `${LSP_URL}/lsp`);
        console.log('[Yaklang LSP] Payload:', JSON.stringify(requestPayload, null, 2));

        const response = await axios.post(`${LSP_URL}/lsp`, requestPayload, { timeout: 5000 });

        console.log('[Yaklang LSP] Received response:');
        console.log('[Yaklang LSP] Status:', response.status);
        console.log('[Yaklang LSP] Data:', JSON.stringify(response.data, null, 2));

        // 检查是否有补全结果
        if (response.data && response.data.result) {
            const items = response.data.result.items || response.data.result;
            if (Array.isArray(items) && items.length > 0) {
                console.log(`[Yaklang LSP] Found ${items.length} completion items`);
                console.log('[Yaklang LSP] First 5 items:', items.slice(0, 5).map((i: any) => i.label).join(', '));
                
                // 检查是否包含常见的字符串方法
                const hasStringMethods = items.some((item: any) => 
                    item.label && (
                        item.label.includes('ToLower') ||
                        item.label.includes('ToUpper') ||
                        item.label.includes('Split') ||
                        item.label.includes('Contains') ||
                        item.label.includes('Replace')
                    )
                );
                
                if (hasStringMethods) {
                    console.log(`[Yaklang LSP] Found expected string methods in completion items`);
                    return true;
                } else {
                    console.log(`[Yaklang LSP] No expected string methods found in completion items`);
                    return false;
                }
            } else {
                console.log('[Yaklang LSP] Items array is empty or not an array');
            }
        } else {
            console.log('[Yaklang LSP] No result field in response');
        }
        
        console.log('[Yaklang LSP] No completion results returned');
        return false;
    } catch (error) {
        console.error('[Yaklang LSP] Completion verification error:', error instanceof Error ? error.message : String(error));
        if (axios.isAxiosError(error)) {
            console.error('[Yaklang LSP] Response data:', error.response?.data);
            console.error('[Yaklang LSP] Response status:', error.response?.status);
        }
        return false;
    }
}

// 获取 yak 二进制版本
async function getYakVersion(yakBinary: string): Promise<string> {
    return new Promise((resolve) => {
        try {
            const proc = cp.spawn(yakBinary, ['version'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let output = '';
            proc.stdout?.on('data', (data) => {
                output += data.toString();
            });
            
            proc.on('close', () => {
                resolve(output.trim() || 'unknown');
            });
            
            proc.on('error', () => {
                resolve('error');
            });
            
            // 超时保护
            setTimeout(() => {
                proc.kill();
                resolve('timeout');
            }, 3000);
        } catch (error) {
            resolve('failed');
        }
    });
}

// 启动 LSP HTTP 服务器
async function startLSPServer(context: vscode.ExtensionContext, yakBinary: string): Promise<boolean> {
    return new Promise(async (resolve) => {
        // 打印 yak 版本信息
        const version = await getYakVersion(yakBinary);
        console.log('[Yaklang LSP] Yak binary path:', yakBinary);
        
        // 检查是否为软链接，如果是则打印真实路径
        try {
            const realPath = fs.realpathSync(yakBinary);
            if (realPath !== yakBinary) {
                console.log('[Yaklang LSP] WARNING: Binary is a symlink!');
                console.log('[Yaklang LSP] Symlink:', yakBinary);
                console.log('[Yaklang LSP] Real path:', realPath);
            } else {
                console.log('[Yaklang LSP] Binary is NOT a symlink');
            }
        } catch (err) {
            console.log('[Yaklang LSP] Error checking symlink:', err);
        }
        
        console.log('[Yaklang LSP] Yak version:', version);
        
        // 统一使用 /tmp/lsp-server.log
        const logFile = '/tmp/lsp-server.log';

        console.log('[Yaklang LSP] Starting server with command:', yakBinary, 'lsp --http --host', LSP_HOST, '--port', LSP_PORT);
        console.log('[Yaklang LSP] Log file:', logFile);

        // 准备日志文件并写入 banner
        try {
            const timestamp = new Date().toISOString();
            let realPath = yakBinary;
            try {
                realPath = fs.realpathSync(yakBinary);
            } catch (err) {
                // ignore
            }
            
            const isSymlink = realPath !== yakBinary;
            const banner = `
================================================================================
                    YAKLANG LSP SERVER START
================================================================================
Time: ${timestamp}
Binary: ${yakBinary}
${isSymlink ? `Real Path: ${realPath} (symlink detected)` : 'Real Path: (not a symlink)'}
Version: ${version}
Host: ${LSP_HOST}
Port: ${LSP_PORT}
================================================================================

`;
            
            if (fs.existsSync(logFile)) {
                // 如果文件已存在，追加 banner
                fs.appendFileSync(logFile, banner);
                console.log('[Yaklang LSP] Log file exists, appended banner');
            } else {
                // 如果文件不存在，创建并写入 banner
                fs.writeFileSync(logFile, banner);
                console.log('[Yaklang LSP] Created new log file with banner');
            }
        } catch (error) {
            console.error('[Yaklang LSP] Failed to prepare log file:', error);
        }

        try {
            // 构建增强的环境变量
            // 对于 goenv/nvm/pyenv 等版本管理工具的 shims，需要特殊处理
            const enhancedEnv = { ...process.env };
            
            // 检测是否使用了版本管理工具的 shim
            // shim 是 shell 脚本，需要通过 shell 执行
            let useShell = false;
            const isShim = yakBinary.includes('/shims/') || 
                          yakBinary.includes('.goenv/shims') || 
                          yakBinary.includes('.nvm/') ||
                          yakBinary.includes('.pyenv/shims') ||
                          yakBinary.includes('.rbenv/shims');
            
            if (isShim) {
                useShell = true;
                console.log('[Yaklang LSP] Detected version manager shim, will use shell mode');
                
                // 对于 goenv，确保 GOENV_ROOT 被设置
                if (yakBinary.includes('.goenv')) {
                    const homeDir = process.env.HOME || process.env.USERPROFILE;
                    if (homeDir && !enhancedEnv.GOENV_ROOT) {
                        enhancedEnv.GOENV_ROOT = path.join(homeDir, '.goenv');
                        console.log('[Yaklang LSP] Set GOENV_ROOT:', enhancedEnv.GOENV_ROOT);
                    }
                }
            }
            
            console.log('[Yaklang LSP] Binary path:', yakBinary);
            console.log('[Yaklang LSP] Using shell:', useShell);
            console.log('[Yaklang LSP] Environment PATH:', enhancedEnv.PATH?.substring(0, 200) + '...');
            
            lspProcess = cp.spawn(yakBinary, [
                'lsp',
                '--http',
                '--host', LSP_HOST,
                '--port', LSP_PORT.toString(),
                '--log-file', logFile
            ], {
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe'],
                env: enhancedEnv,
                shell: useShell  // 对于 goenv shim，使用 shell 模式
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

            // 等待服务器启动并进行健康检查
            console.log('[Yaklang LSP] Waiting for server to start...');
            setTimeout(async () => {
                // 尝试 5 次健康检查，总共最多 3 + 0.5*4 = 5 秒
                const isRunning = await checkLSPServer(5);
                if (isRunning) {
                    console.log('[Yaklang LSP] Server started successfully');
                } else {
                    console.error('[Yaklang LSP] Server health check failed after multiple retries');
                    console.error('[Yaklang LSP] Server may not have started properly. Check log:', logFile);
                }
                resolve(isRunning);
            }, 1500);
        } catch (error) {
            console.error('[Yaklang LSP] Failed to spawn process:', error);
            resolve(false);
        }
    });
}

// 停止 LSP 进程（包括使用 kill 命令强制停止）
async function stopLSPProcess(): Promise<void> {
    console.log('[Yaklang LSP] Stopping LSP server...');
    
    // 如果有我们启动的进程，先尝试正常关闭
    if (lspProcess) {
        console.log('[Yaklang LSP] Killing LSP process (PID:', lspProcess.pid, ')');
        lspProcess.kill('SIGTERM');
        lspProcess = undefined;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 无论如何，尝试通过端口查找并杀死所有占用该端口的进程
    return new Promise((resolve) => {
        try {
            const isWindows = process.platform === 'win32';
            
            if (isWindows) {
                // Windows: 使用 netstat 查找进程
                const cmd = `netstat -ano | findstr :${LSP_PORT}`;
                cp.exec(cmd, (error, stdout) => {
                    if (stdout) {
                        const lines = stdout.trim().split('\n');
                        const pids = new Set<string>();
                        lines.forEach(line => {
                            const match = line.match(/\s+(\d+)\s*$/);
                            if (match) {
                                pids.add(match[1]);
                            }
                        });
                        
                        pids.forEach(pid => {
                            console.log('[Yaklang LSP] Killing process on port', LSP_PORT, 'PID:', pid);
                            cp.exec(`taskkill /F /PID ${pid}`, (err) => {
                                if (err) {
                                    console.error('[Yaklang LSP] Failed to kill process:', err.message);
                                }
                            });
                        });
                    }
                    setTimeout(resolve, 1000);
                });
            } else {
                // Unix-like: 使用 lsof 查找进程
                const cmd = `lsof -ti :${LSP_PORT}`;
                cp.exec(cmd, (error, stdout) => {
                    if (stdout) {
                        const pids = stdout.trim().split('\n').filter(p => p);
                        pids.forEach(pid => {
                            console.log('[Yaklang LSP] Killing process on port', LSP_PORT, 'PID:', pid);
                            try {
                                process.kill(parseInt(pid), 'SIGTERM');
                            } catch (err) {
                                console.error('[Yaklang LSP] Failed to kill process:', err);
                            }
                        });
                    }
                    setTimeout(resolve, 1000);
                });
            }
        } catch (error) {
            console.error('[Yaklang LSP] Error stopping LSP process:', error);
            resolve();
        }
    });
}

export async function activateLSP(context: vscode.ExtensionContext, forceRestart: boolean = false): Promise<void> {
    const yakBinary = findYakBinary(context);
    
    if (!yakBinary) {
        const errorMsg = '没有 Yaklang LSP 服务：未找到 yak 二进制文件';
        console.error('[Yaklang LSP]', errorMsg);
        updateLSPStatusBar('error', '未找到 yak 二进制文件');
        vscode.window.showErrorMessage(errorMsg);
        return;
    }

    console.log('[Yaklang LSP] Found yak binary:', yakBinary);

    // 如果强制重启，先停止现有进程
    if (forceRestart) {
        console.log('[Yaklang LSP] Force restart requested, stopping existing processes...');
        vscode.window.showInformationMessage('正在重启 Yaklang LSP 服务器...');
        await stopLSPProcess();
        console.log('[Yaklang LSP] Existing processes stopped');
    }

    // 检查服务器是否已经运行
    console.log('[Yaklang LSP] Checking if LSP server is already running...');
    updateLSPStatusBar('starting');
    
    let isRunning = await checkLSPServer(3, false);
    
    if (!isRunning) {
        console.log('[Yaklang LSP] Server not running, starting new instance...');
        isRunning = await startLSPServer(context, yakBinary);
        if (!isRunning) {
            const errorMsg = 'Failed to start Yaklang LSP HTTP server';
            console.error('[Yaklang LSP]', errorMsg);
            updateLSPStatusBar('error', errorMsg);
            vscode.window.showErrorMessage(errorMsg);
            return;
        }
    } else {
        console.log('[Yaklang LSP] Server already running');
        vscode.window.showInformationMessage('Yaklang LSP 服务器已在运行');
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
                        const params = {
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
                        };
                        const response = await axios.post(`${LSP_URL}/lsp`, params, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 5000
                        });
                        
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
                                // Check if insertText contains snippet placeholders like ${1:...}
                                if (/\$\{\d+(?::[^}]*)?\}/.test(item.insertText)) {
                                    // Use SnippetString for snippet format
                                    completionItem.insertText = new vscode.SnippetString(item.insertText);
                                } else {
                                    completionItem.insertText = item.insertText;
                                }
                            }
                            return completionItem;
                        });
                    } catch (error) {
                        console.error('[Yaklang LSP] HTTP completion request failed:', error);
                        return [];
                    }
                }
            },
            '.', '(' // 触发字符
        );

        console.log('[Yaklang LSP] LSP completion provider registered');
        
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
        console.log('[Yaklang LSP] LSP hover provider registered');
        
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
        console.log('[Yaklang LSP] LSP signature help provider registered');
        
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
        console.log('[Yaklang LSP] LSP definition provider registered');
        
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
        console.log('[Yaklang LSP] LSP references provider registered');
        
        // 创建 Diagnostic Collection
        diagnosticCollection = vscode.languages.createDiagnosticCollection('yaklang');
        console.log('[Yaklang LSP] Diagnostic collection created');
        
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
        
        console.log('[Yaklang LSP] Document change listeners registered');
        
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
        console.log('[Yaklang LSP] All systems ready!');
    } catch (error) {
        console.error('[Yaklang LSP] Failed to start LSP client:', error);
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

// 导出重启 LSP 服务器的函数
export async function restartLSP(context: vscode.ExtensionContext): Promise<void> {
    console.log('[Yaklang LSP] Restarting LSP server...');
    await activateLSP(context, true);
}

