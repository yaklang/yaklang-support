import * as vscode from 'vscode';
import { CanFmt } from './utils/fmt';
import { findYakBinary, getCurrentFilePath } from './utils/path';
import { spawnSync } from 'child_process';

class YakDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
        let binary = findYakBinary();
        if (binary === "") {
            vscode.window.showErrorMessage("Cannot find yak in PATH");
            return [];
        }

        if (!CanFmt(binary)) {
            const message = "yak binary does not support fmt, please download the latest version from https://github.com/yaklang/yaklang/releases"
            vscode.window.showErrorMessage(message);
            return [];
        }

        const filepath = getCurrentFilePath() || "";
        if (filepath == "") {
            vscode.window.showErrorMessage("Cannot find current file path");
            return [];
        }
        const args = [
            "fmt",
            filepath,
        ];
        const p = spawnSync(binary, args);
        const formattedCode = p.output?.join("");
        const range = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
        if (formattedCode != "") {
            const edit = new vscode.TextEdit(range, formattedCode);
            return [edit];
        }
        return [];
    }
}

export function registerYakFormatter(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider({ language: 'yak', scheme: 'file' }, new YakDocumentFormattingEditProvider()));
}