import * as vscode from 'vscode';


export function getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor) {
        const documentUri = activeTextEditor.document.uri;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
        return workspaceFolder;
    }
    return undefined;
}