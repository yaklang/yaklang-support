import * as vscode from 'vscode';
import { getCurrentWorkspaceFolder } from './utils/workspace';
import { getDefaultConfig } from './utils/dap';


export function debugFile() {
    const folder = getCurrentWorkspaceFolder();
    if (folder) {
        vscode.debug.startDebugging(folder, getDefaultConfig());
    } else {
        vscode.window.showErrorMessage("can't find workspace folder");
    }
}

export async function formatFile() {
    await vscode.commands.executeCommand('editor.action.formatDocument');
}