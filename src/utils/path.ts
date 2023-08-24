import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function expandFilePathInOutput(output: string, cwd: string): string {
	const lines = output.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const matches = lines[i].match(/\s*(\S+\.go):(\d+):/);
		if (matches && matches[1] && !path.isAbsolute(matches[1])) {
			lines[i] = lines[i].replace(matches[1], path.join(cwd, matches[1]));
		}
	}
	return lines.join('\n');
}

export function findBinaryFromPATH(toolName: string): string {
    if (process.env['PATH']) {
        const PATH = process.env['PATH'].split(path.delimiter);
        for (let i = 0; i < PATH.length; i++) {
            const binpath = path.join(PATH[i], toolName);
            if (fs.existsSync(binpath)) {
                return binpath;
            }
        }
    }
    return "";
}

export function getCurrentFilePath(): string | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const document = activeEditor.document;
        if (document) {
            const uri = document.uri;
            if (uri.scheme === 'file') {
                return uri.fsPath;
            }
        }
    }
    return undefined;
}


// yak
export function findYakBinary(): string {
    let binary = (process.platform === "win32") ? "yak.exe" : "yak";
    binary = findBinaryFromPATH(binary);
    return binary;
}