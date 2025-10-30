import * as vscode from 'vscode';

export class SimpleYakCodeLensProvider implements vscode.CodeLensProvider {
    
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        console.log('[SimpleCodeLens] provideCodeLenses called for:', document.uri.fsPath);
        
        if (document.languageId !== 'yak') {
            console.log('[SimpleCodeLens] Not a yak file');
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const range = new vscode.Range(0, 0, 0, 0);
        
        // Run Script CodeLens
        const runCommand: vscode.Command = {
            title: "▶️ Run Yak Script",
            command: 'yak.exec.file',
            arguments: [document.uri.fsPath]
        };
        codeLenses.push(new vscode.CodeLens(range, runCommand));
        
        // Debug Script CodeLens
        const debugCommand: vscode.Command = {
            title: "🐛 Debug Yak Script",
            command: 'yak.debug.file',
            arguments: [document.uri.fsPath]
        };
        codeLenses.push(new vscode.CodeLens(range, debugCommand));
        
        console.log('[SimpleCodeLens] Created CodeLens count:', codeLenses.length);
        
        return codeLenses;
    }
}

export function registerSimpleYakCodeLens(context: vscode.ExtensionContext): void {
    console.log('[SimpleCodeLens] Registering simple CodeLens provider');
    
    const provider = new SimpleYakCodeLensProvider();
    const disposable = vscode.languages.registerCodeLensProvider('yak', provider);
    
    context.subscriptions.push(disposable);
    console.log('[SimpleCodeLens] Simple CodeLens provider registered');
    
    // 注册一个测试命令来检查 CodeLens 状态
    const testCommand = vscode.commands.registerCommand('yak.test.codelens', () => {
        vscode.window.showInformationMessage('CodeLens test command executed!');
        console.log('[SimpleCodeLens] Test command executed');
    });
    
    context.subscriptions.push(testCommand);
    
    // 检查 VS Code 设置
    const config = vscode.workspace.getConfiguration();
    const codeLensEnabled = config.get('editor.codeLens');
    console.log('[SimpleCodeLens] VS Code CodeLens setting:', codeLensEnabled);
    
    if (!codeLensEnabled) {
        vscode.window.showWarningMessage('CodeLens is disabled in VS Code settings. Please enable it in Settings > Editor > Code Lens');
    }
}
