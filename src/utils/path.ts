import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

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
    console.log(`[findBinaryFromPATH] Searching for: ${toolName}`);
    if (process.env['PATH']) {
        const PATH = process.env['PATH'].split(path.delimiter);
        console.log(`[findBinaryFromPATH] Number of PATH entries: ${PATH.length}`);
        for (let i = 0; i < PATH.length; i++) {
            const binpath = path.join(PATH[i], toolName);
            console.log(`[findBinaryFromPATH] Checking: ${binpath}`);
            if (fs.existsSync(binpath)) {
                console.log(`[findBinaryFromPATH] Found binary at: ${binpath}`);
                return binpath;
            }
        }
        console.log(`[findBinaryFromPATH] Binary not found in any PATH entry`);
    } else {
        console.log(`[findBinaryFromPATH] WARNING: PATH environment variable is not set`);
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
    console.log("[findYakBinary] Starting yak binary search process");
    console.log(`[findYakBinary] Platform: ${process.platform}, Cache flag: ${cache}`);
    
    const config = vscode.workspace.getConfiguration('yaklang');
    const binarySource = config.get<string>('yakBinarySource', 'auto');
    const configBinaryPath = config.get<string>('yakBinaryPath', '');
    
    console.log(`[findYakBinary] Configuration - binarySource: ${binarySource}, configBinaryPath: ${configBinaryPath || '(empty)'}`);

    // Mode: auto - always use system PATH
    if (binarySource === 'auto') {
        console.log("[findYakBinary] Mode: auto - searching in system PATH");
        let binary = (process.platform === "win32") ? "yak.exe" : "yak";
        console.log(`[findYakBinary] Looking for binary name: ${binary}`);
        binary = findBinaryFromPATH(binary);
        if (binary) {
            console.log(`[findYakBinary] Found yak binary in PATH: ${binary}`);
        } else {
            console.log("[findYakBinary] WARNING: yak binary not found in PATH");
        }
        return binary;
    }

    console.log("[findYakBinary] Mode: custom - checking configured path and workspace cache");

    // Mode: custom - use configured path or workspace cache
    var state: vscode.Memento | undefined = undefined;
    if (context) {
        state = context.workspaceState;
        
        // First check config path
        if (configBinaryPath) {
            console.log(`[findYakBinary] Checking configured path: ${configBinaryPath}`);
            if (executableFileExists(configBinaryPath)) {
                console.log(`[findYakBinary] Configured path is valid and executable, using: ${configBinaryPath}`);
                return configBinaryPath;
            } else {
                console.log(`[findYakBinary] Configured path is not valid or not executable`);
            }
        } else {
            console.log("[findYakBinary] No configured path provided");
        }

        // Then check workspace cache
        const cachedPath = state.get<string>(YAK_BINARY_KEY_NAME);
        console.log(`[findYakBinary] Workspace cached path: ${cachedPath || '(none)'}`);
        if (cachedPath) {
            const cacheExists = executableFileExists(cachedPath);
            console.log(`[findYakBinary] Cache exists check: ${cacheExists}, cache flag: ${cache}`);
            if (cacheExists && !cache) {
                console.log(`[findYakBinary] Using cached path: ${cachedPath}`);
                return cachedPath;
            } else if (!cacheExists) {
                console.log("[findYakBinary] Cached path is no longer valid");
            } else if (cache) {
                console.log("[findYakBinary] Cache refresh requested, skipping cached path");
            }
        }
    } else {
        console.log("[findYakBinary] No extension context provided");
    }

    // Fallback to PATH search
    console.log("[findYakBinary] Falling back to PATH search");
    let binary = (process.platform === "win32") ? "yak.exe" : "yak";
    console.log(`[findYakBinary] Looking for binary name: ${binary}`);
    binary = findBinaryFromPATH(binary);
    if (binary != "") {
        console.log(`[findYakBinary] Found yak binary in PATH: ${binary}`);
        if (state) {
            console.log(`[findYakBinary] Updating workspace cache with: ${binary}`);
            state.update(YAK_BINARY_KEY_NAME, binary);
        }
    } else {
        console.log("[findYakBinary] WARNING: yak binary not found in PATH");
    }
    
    console.log(`[findYakBinary] Final result: ${binary || '(empty)'}`);
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

// ========== Yak Engine Download Management ==========

/**
 * Get the yak home directory path (~/.yak)
 */
export function getYakHomeDir(): string {
    return path.join(os.homedir(), '.yak');
}

/**
 * Get the yak bin directory path (~/.yak/bin)
 */
export function getYakBinDir(): string {
    return path.join(getYakHomeDir(), 'bin');
}

/**
 * Ensure ~/.yak and ~/.yak/bin directories exist
 */
export function ensureYakHomeDir(): void {
    const yakHome = getYakHomeDir();
    const yakBin = getYakBinDir();
    
    console.log(`[ensureYakHomeDir] Checking yak home directory: ${yakHome}`);
    
    if (!fs.existsSync(yakHome)) {
        console.log(`[ensureYakHomeDir] Creating yak home directory: ${yakHome}`);
        fs.mkdirSync(yakHome, { recursive: true });
    }
    
    if (!fs.existsSync(yakBin)) {
        console.log(`[ensureYakHomeDir] Creating yak bin directory: ${yakBin}`);
        fs.mkdirSync(yakBin, { recursive: true });
    }
}

/**
 * Get the versioned yak engine path (~/.yak/bin/yak_${version})
 */
export function getVersionedYakPath(version: string): string {
    const binaryName = process.platform === 'win32' ? `yak_${version}.exe` : `yak_${version}`;
    return path.join(getYakBinDir(), binaryName);
}

/**
 * Get the yak engine symlink path (~/.yak/bin/yak)
 */
export function getYakSymlinkPath(): string {
    const binaryName = process.platform === 'win32' ? 'yak.exe' : 'yak';
    return path.join(getYakBinDir(), binaryName);
}

/**
 * Check if a specific version of yak engine is installed
 */
export function isYakEngineInstalled(version: string): boolean {
    const versionedPath = getVersionedYakPath(version);
    const installed = executableFileExists(versionedPath);
    console.log(`[isYakEngineInstalled] Version ${version} installed: ${installed} at ${versionedPath}`);
    return installed;
}

/**
 * Create symlink from yak to yak_${version}
 */
export function createYakSymlink(version: string): void {
    const versionedPath = getVersionedYakPath(version);
    const symlinkPath = getYakSymlinkPath();
    
    console.log(`[createYakSymlink] Creating symlink from ${symlinkPath} to ${versionedPath}`);
    
    // Remove existing symlink or file if it exists
    if (fs.existsSync(symlinkPath)) {
        console.log(`[createYakSymlink] Removing existing symlink/file: ${symlinkPath}`);
        try {
            // Use unlink for both files and symlinks
            fs.unlinkSync(symlinkPath);
        } catch (e) {
            console.error(`[createYakSymlink] Failed to remove existing symlink: ${e}`);
            throw e;
        }
    }
    
    // Create symlink
    try {
        if (process.platform === 'win32') {
            // On Windows, we need to use junction or hardlink as symlinks require admin privileges
            // Copy file instead for better compatibility
            console.log(`[createYakSymlink] Windows platform - copying file instead of symlink`);
            fs.copyFileSync(versionedPath, symlinkPath);
        } else {
            // On Unix-like systems, use symlink
            const versionedBinaryName = path.basename(versionedPath);
            fs.symlinkSync(versionedBinaryName, symlinkPath);
        }
        
        // Ensure the symlink is executable
        if (process.platform !== 'win32') {
            fs.chmodSync(symlinkPath, 0o755);
        }
        
        console.log(`[createYakSymlink] Symlink created successfully`);
    } catch (e) {
        console.error(`[createYakSymlink] Failed to create symlink: ${e}`);
        throw e;
    }
}

/**
 * Download file from URL with progress reporting
 */
function downloadFile(url: string, destPath: string, onProgress?: (downloaded: number, total: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`[downloadFile] Downloading from ${url} to ${destPath}`);
        
        const protocol = url.startsWith('https') ? https : http;
        
        const file = fs.createWriteStream(destPath);
        
        protocol.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                const redirectUrl = response.headers.location;
                if (redirectUrl) {
                    console.log(`[downloadFile] Following redirect to: ${redirectUrl}`);
                    file.close();
                    fs.unlinkSync(destPath);
                    downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
                    return;
                }
            }
            
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                return;
            }
            
            const totalSize = parseInt(response.headers['content-length'] || '0', 10);
            let downloadedSize = 0;
            
            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (onProgress && totalSize > 0) {
                    onProgress(downloadedSize, totalSize);
                }
            });
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`[downloadFile] Download completed: ${destPath}`);
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
            }
            console.error(`[downloadFile] Download failed: ${err.message}`);
            reject(err);
        });
    });
}

/**
 * Get download URL for yak engine based on platform and version
 */
function getYakDownloadURL(version: string): string {
    const platform = process.platform;
    const arch = process.arch;
    
    // 根据平台和架构确定下载 URL
    // 这里需要根据实际的下载地址进行调整
    let osName = '';
    let archName = '';
    
    if (platform === 'darwin') {
        osName = 'darwin';
    } else if (platform === 'linux') {
        osName = 'linux';
    } else if (platform === 'win32') {
        osName = 'windows';
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    if (arch === 'x64') {
        archName = 'amd64';
    } else if (arch === 'arm64') {
        archName = 'arm64';
    } else {
        throw new Error(`Unsupported architecture: ${arch}`);
    }
    
    // 移除版本号前缀的 'v'（如果存在）
    const versionWithoutV = version.startsWith('v') ? version.substring(1) : version;
    
    // 构建下载 URL - 使用正确的 CDN 地址
    // 示例格式：https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${version}/yak_${osName}_${archName}
    const baseURL = 'https://yaklang.oss-cn-beijing.aliyuncs.com/yak';
    let fileName = `yak_${osName}_${archName}`;
    
    // Windows 平台需要添加 .exe 后缀
    if (platform === 'win32') {
        fileName += '.exe';
    }
    
    const url = `${baseURL}/${versionWithoutV}/${fileName}`;
    
    console.log(`[getYakDownloadURL] Generated download URL: ${url}`);
    return url;
}

/**
 * Download yak engine for a specific version
 * If the version already exists, skip download and just create/update symlink
 */
export async function downloadYakEngine(version: string, context?: vscode.ExtensionContext): Promise<string> {
    console.log(`[downloadYakEngine] Starting download process for version: ${version}`);
    
    // Ensure directories exist
    ensureYakHomeDir();
    
    const versionedPath = getVersionedYakPath(version);
    
    // Check if version already exists
    if (isYakEngineInstalled(version)) {
        console.log(`[downloadYakEngine] Version ${version} already installed at ${versionedPath}`);
        console.log(`[downloadYakEngine] Updating symlink to point to this version`);
        createYakSymlink(version);
        
        const symlinkPath = getYakSymlinkPath();
        console.log(`[downloadYakEngine] Using existing installation: ${symlinkPath}`);
        
        // Update configuration to use this binary
        if (context) {
            const config = vscode.workspace.getConfiguration('yaklang');
            await config.update('yakBinarySource', 'custom', vscode.ConfigurationTarget.Global);
            await config.update('yakBinaryPath', symlinkPath, vscode.ConfigurationTarget.Global);
            console.log(`[downloadYakEngine] Updated configuration: yakBinarySource=custom, yakBinaryPath=${symlinkPath}`);
        }
        
        return symlinkPath;
    }
    
    // Download the engine
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `下载 Yak 引擎 ${version}`,
            cancellable: false
        }, async (progress) => {
            progress.report({ message: '准备下载...', increment: 0 });
            
            const downloadURL = getYakDownloadURL(version);
            const tempPath = versionedPath + '.tmp';
            
            let lastPercentage = 0;
            await downloadFile(downloadURL, tempPath, (downloaded, total) => {
                const currentPercentage = (downloaded / total) * 100;
                const increment = currentPercentage - lastPercentage;
                lastPercentage = currentPercentage;
                
                progress.report({ 
                    message: `下载中... ${currentPercentage.toFixed(1)}% (${(downloaded / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB)`,
                    increment: increment
                });
            });
            
            progress.report({ message: '完成下载，正在设置...' });
            
            // Rename temp file to final path
            fs.renameSync(tempPath, versionedPath);
            
            // Make executable on Unix-like systems
            if (process.platform !== 'win32') {
                fs.chmodSync(versionedPath, 0o755);
            }
            
            console.log(`[downloadYakEngine] Download completed: ${versionedPath}`);
        });
        
        // Create symlink
        createYakSymlink(version);
        
        const symlinkPath = getYakSymlinkPath();
        console.log(`[downloadYakEngine] Yak engine installed successfully: ${symlinkPath}`);
        
        // Update configuration to use the downloaded binary
        // Set to custom mode and point to the downloaded symlink
        if (context) {
            const config = vscode.workspace.getConfiguration('yaklang');
            await config.update('yakBinarySource', 'custom', vscode.ConfigurationTarget.Global);
            await config.update('yakBinaryPath', symlinkPath, vscode.ConfigurationTarget.Global);
            console.log(`[downloadYakEngine] Updated configuration: yakBinarySource=custom, yakBinaryPath=${symlinkPath}`);
        }
        
        vscode.window.showInformationMessage(`Yak 引擎 ${version} 下载并安装成功！`);
        
        return symlinkPath;
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[downloadYakEngine] Failed to download yak engine: ${errorMessage}`);
        
        // Clean up temp file if exists
        const tempPath = versionedPath + '.tmp';
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
        
        vscode.window.showErrorMessage(`下载 Yak 引擎失败: ${errorMessage}`);
        throw error;
    }
}

/**
 * Get the current yak engine version from the binary
 */
export async function getYakEngineVersion(binaryPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`"${binaryPath}" version`, (error: Error, stdout: string, stderr: string) => {
            if (error) {
                console.error(`[getYakEngineVersion] Failed to get version: ${error.message}`);
                reject(error);
                return;
            }
            
            // Parse version from output
            const versionMatch = stdout.match(/version[:\s]+([^\s]+)/i) || stdout.match(/v?(\d+\.\d+\.\d+[^\s]*)/);
            if (versionMatch) {
                const version = versionMatch[1];
                console.log(`[getYakEngineVersion] Detected version: ${version}`);
                resolve(version);
            } else {
                console.log(`[getYakEngineVersion] Could not parse version from output: ${stdout}`);
                reject(new Error('Could not parse version from yak binary'));
            }
        });
    });
}

/**
 * List all installed yak engine versions
 */
export function listInstalledYakVersions(): string[] {
    const binDir = getYakBinDir();
    
    if (!fs.existsSync(binDir)) {
        return [];
    }
    
    const files = fs.readdirSync(binDir);
    const versions: string[] = [];
    
    const pattern = process.platform === 'win32' ? /^yak_(.+)\.exe$/ : /^yak_(.+)$/;
    
    for (const file of files) {
        const match = file.match(pattern);
        if (match) {
            versions.push(match[1]);
        }
    }
    
    console.log(`[listInstalledYakVersions] Found installed versions: ${versions.join(', ')}`);
    return versions;
}