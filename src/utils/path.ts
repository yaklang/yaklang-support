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

export function fixDriveCasingInWindows(pathToFix: string): string {
	return process.platform === 'win32' && pathToFix
		? pathToFix.substr(0, 1).toUpperCase() + pathToFix.substr(1)
		: pathToFix;
}

export function executableFileExists(filePath: string): boolean {
	let exists = true;
	try {
		exists = fs.statSync(filePath).isFile();
		if (exists) {
			fs.accessSync(filePath, fs.constants.F_OK | fs.constants.X_OK);
		}
	} catch (e) {
		exists = false;
	}
	return exists;
}

// yak
const YAK_BINARY_KEY_NAME = "yak_binary_path";
export function findYakBinary(context: vscode.ExtensionContext, cache?: boolean): string {

    var state: vscode.Memento | undefined = undefined;
    if (context) {
        state = context.workspaceState;
        const path = state.get<string>(YAK_BINARY_KEY_NAME);
        if (path && executableFileExists(path) && !cache) {
            return path;
        }
    }

    let binary = (process.platform === "win32") ? "yak.exe" : "yak";
    binary = findBinaryFromPATH(binary);
    if (binary != "" && state) {
        state.update(YAK_BINARY_KEY_NAME, binary);
    }
    return binary;
}

export function resetYakBinaryPath(context: vscode.ExtensionContext) {
    context.workspaceState.update(YAK_BINARY_KEY_NAME, undefined);
}

export function setYakBinaryPath(context: vscode.ExtensionContext, path: string) {
    context.workspaceState.update(YAK_BINARY_KEY_NAME, path);
}