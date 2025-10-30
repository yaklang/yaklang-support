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

/**
 * Find yak binary based on configuration and cache
 * Priority: 
 * 1. If yakBinarySource is 'custom': use yakBinaryPath config or workspace cache
 * 2. If yakBinarySource is 'auto': always use PATH (ignore cache)
 * 3. Fallback: search in PATH
 */
export function findYakBinary(context: vscode.ExtensionContext, cache?: boolean): string {
    const config = vscode.workspace.getConfiguration('yaklang');
    const binarySource = config.get<string>('yakBinarySource', 'auto');
    const configBinaryPath = config.get<string>('yakBinaryPath', '');

    // Mode: auto - always use system PATH
    if (binarySource === 'auto') {
        let binary = (process.platform === "win32") ? "yak.exe" : "yak";
        binary = findBinaryFromPATH(binary);
        return binary;
    }

    // Mode: custom - use configured path or workspace cache
    var state: vscode.Memento | undefined = undefined;
    if (context) {
        state = context.workspaceState;
        
        // First check config path
        if (configBinaryPath && executableFileExists(configBinaryPath)) {
            return configBinaryPath;
        }

        // Then check workspace cache
        const cachedPath = state.get<string>(YAK_BINARY_KEY_NAME);
        if (cachedPath && executableFileExists(cachedPath) && !cache) {
            return cachedPath;
        }
    }

    // Fallback to PATH search
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
    // Update workspace state for backward compatibility
    context.workspaceState.update(YAK_BINARY_KEY_NAME, path);
    
    // Also update configuration
    const config = vscode.workspace.getConfiguration('yaklang');
    config.update('yakBinaryPath', path, vscode.ConfigurationTarget.Global);
    config.update('yakBinarySource', 'custom', vscode.ConfigurationTarget.Global);
}

/**
 * Get current yak binary source mode
 */
export function getYakBinarySource(): string {
    const config = vscode.workspace.getConfiguration('yaklang');
    return config.get<string>('yakBinarySource', 'auto');
}

/**
 * Set yak binary source mode
 */
export function setYakBinarySource(mode: 'auto' | 'custom') {
    const config = vscode.workspace.getConfiguration('yaklang');
    config.update('yakBinarySource', mode, vscode.ConfigurationTarget.Global);
}