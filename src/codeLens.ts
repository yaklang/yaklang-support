import * as vscode from 'vscode';
import { t } from './i18n';

/**
 * CodeLens 提供者，为 Yak 文件提供内联运行按钮
 */
export class YakCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {}

    public provideCodeLenses(
        document: vscode.TextDocument, 
        token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        
        console.log('[YakCodeLens] provideCodeLenses called for:', document.uri.fsPath, 'language:', document.languageId);
        
        // 只为 .yak 文件提供 CodeLens
        if (document.languageId !== 'yak') {
            console.log('[YakCodeLens] Not a yak file, skipping');
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // 在文件开头添加运行按钮（第一行）
        if (lines.length > 0) {
            const range = new vscode.Range(0, 0, 0, 0);
            const runCommand: vscode.Command = {
                title: "Run Yak Script",
                command: 'yak.exec.file',
                arguments: [document.uri.fsPath]
            };
            
            const debugCommand: vscode.Command = {
                title: "Debug Yak Script",
                command: 'yak.debug.file',
                arguments: [document.uri.fsPath]
            };

            codeLenses.push(new vscode.CodeLens(range, runCommand));
            codeLenses.push(new vscode.CodeLens(range, debugCommand));
            console.log('[YakCodeLens] Added file-level CodeLenses:', codeLenses.length);
        }

        // 暂时注释掉函数检测，先确保基本的 CodeLens 工作
        /*
        // 检测函数定义并添加运行按钮
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 匹配函数定义 (简单的正则匹配)
            // 支持: func functionName() {}, func functionName(params) {}, 等
            const funcMatch = line.match(/^\s*(func\s+(\w+)\s*\([^)]*\)\s*\{?)/);
            if (funcMatch) {
                const range = new vscode.Range(i, 0, i, line.length);
                const functionName = funcMatch[2];
                
                const runFuncCommand: vscode.Command = {
                    title: `▶️ Run ${functionName}`,
                    command: 'yak.exec.function',
                    arguments: [document.uri.fsPath, functionName, i]
                };
                
                codeLenses.push(new vscode.CodeLens(range, runFuncCommand));
            }

            // 匹配 main 函数特殊处理
            const mainMatch = line.match(/^\s*(func\s+main\s*\([^)]*\)\s*\{?)/);
            if (mainMatch) {
                const range = new vscode.Range(i, 0, i, line.length);
                
                const runMainCommand: vscode.Command = {
                    title: `🚀 Run Main`,
                    command: 'yak.exec.file',
                    arguments: [document.uri.fsPath]
                };
                
                codeLenses.push(new vscode.CodeLens(range, runMainCommand));
            }
        }
        */

        console.log('[YakCodeLens] Total CodeLenses created:', codeLenses.length);
        return codeLenses;
    }

    public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens {
        return codeLens;
    }

    /**
     * 刷新 CodeLens
     */
    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }
}

/**
 * 注册 CodeLens 提供者
 */
export function registerYakCodeLens(context: vscode.ExtensionContext): void {
    console.log('[YakCodeLens] Registering CodeLens provider');
    const provider = new YakCodeLensProvider();
    
    // 注册 CodeLens 提供者
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
        { language: 'yak', scheme: 'file' },
        provider
    );
    console.log('[YakCodeLens] CodeLens provider registered');
    
    // 注册运行函数的命令
    const runFunctionCommand = vscode.commands.registerCommand(
        'yak.exec.function',
        async (filePath: string, functionName: string, lineNumber: number) => {
            // 创建临时脚本来调用指定函数
            const tempScript = `
// Auto-generated script to run function: ${functionName}
load("${filePath}")
${functionName}()
`;
            
            // 创建临时文件
            const tempUri = vscode.Uri.file(`${filePath}.temp.yak`);
            await vscode.workspace.fs.writeFile(tempUri, Buffer.from(tempScript, 'utf8'));
            
            try {
                // 执行临时文件
                await vscode.commands.executeCommand('yak.exec.file', tempUri.fsPath);
            } finally {
                // 清理临时文件
                try {
                    await vscode.workspace.fs.delete(tempUri);
                } catch (e) {
                    // 忽略删除错误
                }
            }
        }
    );
    
    // 监听配置变化，刷新 CodeLens
    const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('yaklang')) {
            provider.refresh();
        }
    });
    
    // 监听文档变化，刷新 CodeLens
    const docWatcher = vscode.workspace.onDidChangeTextDocument(e => {
        if (e.document.languageId === 'yak') {
            provider.refresh();
        }
    });
    
    context.subscriptions.push(
        codeLensProvider,
        runFunctionCommand,
        configWatcher,
        docWatcher
    );
    
    // 强制刷新 CodeLens
    setTimeout(() => {
        provider.refresh();
        console.log('[YakCodeLens] Forced refresh after registration');
    }, 2000);
}
