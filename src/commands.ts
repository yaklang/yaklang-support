import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

import { getCurrentWorkspaceFolder } from './utils/workspace';
import { getDefaultConfig } from './utils/dap';
import { asyncFetchLatestYaklangVersion, getYakVersion, isValidYakBinary, resetYakVersion, updateYakVersionByBinary, getAvailableYaklangVersions, YaklangVersionInfo } from './utils/version';
import { updateStatusBar, yakEnvStatusbarItem } from './statusbar';
import { executableFileExists, findYakBinary, fixDriveCasingInWindows, getCurrentFilePath, resetYakBinaryPath, setYakBinaryPath, getYakBinarySource } from './utils/path';
import { basename } from 'path';
import { getSystemInfo } from './utils/os';
import { URL } from 'url';


const CHOOSE_FROM_FILE_BROWSER_SELECTION = 'Choose yak binary from file browser';
const DOWNLOAD_LATEST_YAK_BINARY_SELECTION = 'Download latest yak binary';
const DOWNLOAD_SPECIFIC_VERSION_SELECTION = 'Download specific version';
const CLEAR_YAK_BINARY_SELECTION = 'Clear yak binary selection';
const USE_SYSTEM_PATH_YAK_SELECTION = 'Use yak from system PATH (auto mode)';

export const outputChannel = vscode.window.createOutputChannel('Yak');
export let YakTerminal = vscode.window.createTerminal({ name: "YAK Runner" });

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

export const execFile = (context: vscode.ExtensionContext) => (args: string) =>  {
    if (YakTerminal.exitStatus) {
        YakTerminal = vscode.window.createTerminal({ name: "YAK Runner" });
    }
    const binary = findYakBinary(context);
    if (binary === "") {
        showErrorMessageWithDownloadOption(context, "Cannot find yak in PATH");
        return;
    }
    YakTerminal.show(true);
    if (args) {
        args = decodeURIComponent(args);
        const urlInstance = new URL(args)
        console.info(urlInstance.pathname)
        args = urlInstance.pathname
        if (process.platform == "win32" && args.startsWith("/")) {
            args = args.substring(1)
        }
        YakTerminal.sendText(`${binary} ${args}`, true);
    } else {
        if (vscode.window.activeTextEditor?.document) {
            YakTerminal.sendText(`${binary} ${vscode.window.activeTextEditor?.document.fileName}`)
        }
    }
}

export async function showErrorMessageWithDownloadOption(context: vscode.ExtensionContext, message: string) {
    let selection = await vscode.window.showErrorMessage(message, "Download", "Cancel");
    if (selection === 'Download') {
        downloadLatestYakBinary(context);
    }
}

async function setYakBinary(context: vscode.ExtensionContext, path: string) {
    // Set to custom mode when manually choosing a binary
    const config = vscode.workspace.getConfiguration('yaklang');
    await config.update('yakBinarySource', 'custom', vscode.ConfigurationTarget.Global);
    await config.update('yakBinaryPath', path, vscode.ConfigurationTarget.Global);
    
    setYakBinaryPath(context, path);
    updateYakVersionByBinary(context, path);
    updateStatusBar(context, getYakVersion(context));
    
    // Restart LSP with new binary
    const { restartLSP } = require('./lspClient');
    await restartLSP(context);
}

async function chooseYakBinaryLocation(context: vscode.ExtensionContext) {
    if (!yakEnvStatusbarItem) {
        return
    }

    const defaultUri = vscode.Uri.file(basename(getCurrentFilePath() || "/"));
    const newGoUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri
    });
    if (!newGoUris || newGoUris.length !== 1) {
        return;
    }
    const newYakBin = fixDriveCasingInWindows(newGoUris[0].fsPath);
    if (!executableFileExists(newYakBin)) {
        vscode.window.showErrorMessage(`${newYakBin} is not an executable`);
        return;
    }
    if (!isValidYakBinary(newYakBin)) {
        vscode.window.showErrorMessage(`failed to get "${newYakBin} version", invalid Yak binary`);
        return;
    }
    await setYakBinary(context, newYakBin);
}

async function downloadLatestYakBinary(context: vscode.ExtensionContext) {
    const { platform } = getSystemInfo();
    let latestYakVersion = await asyncFetchLatestYaklangVersion();
    if (latestYakVersion.startsWith("v")) {
        latestYakVersion = latestYakVersion.substr(1);
    }

    let downloadURL = "";
    switch (platform) {
        case 'Windows':
            downloadURL = `https://oss-qn.yaklang.com/yak/${latestYakVersion || "latest"}/yak_windows_amd64.exe`
            break;
        case 'Linux':
            downloadURL = `https://oss-qn.yaklang.com/yak/${latestYakVersion || "latest"}/yak_linux_amd64`
            break;
        case 'Darwin':
        case 'Mac':
            downloadURL = `https://oss-qn.yaklang.com/yak/${latestYakVersion || "latest"}/yak_darwin_amd64`
            break;
    }
    if (downloadURL === "") {
        vscode.window.showErrorMessage(`Unsupported platform for ${platform}`);
        return;
    }
    const binaryName = basename(downloadURL);
    const options = [
        { label: "Yes" },
        { label: "No" },
    ];
    const selection = await vscode.window.showQuickPick(options, {
        title: `Download ${binaryName}(${latestYakVersion})?`,
    });
    if (!selection) {
        return
    }

    switch (selection.label) {
        case "Yes":
            const defaultUri = vscode.Uri.file(basename(getCurrentFilePath() || "/"));
            const newGoUris = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: "Select a folder to save yak binary",
                defaultUri
            });
            if (!newGoUris || newGoUris.length !== 1) {
                return;
            }
            const folderPath = fixDriveCasingInWindows(newGoUris[0].fsPath);
            await downloadLatestYakBinaryFromURL(context, binaryName, latestYakVersion, folderPath, downloadURL);
            break;
        case "No":
            break;
    }
}

async function downloadSpecificVersionYakBinary(context: vscode.ExtensionContext, forceRefresh: boolean = false): Promise<void> {
    const { platform } = getSystemInfo();
    
    // 获取可用版本列表（优先从缓存读取，除非强制刷新）
    let versions: YaklangVersionInfo[] = [];
    try {
        if (forceRefresh) {
            await vscode.window.withProgress(
                {
                    title: 'Refreshing version list...',
                    location: vscode.ProgressLocation.Notification
                },
                async () => {
                    versions = await getAvailableYaklangVersions(context, true);
                }
            );
            vscode.window.showInformationMessage('Version list refreshed successfully');
        } else {
            versions = await getAvailableYaklangVersions(context);
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to fetch available versions: ${err}`);
        return;
    }

    if (versions.length === 0) {
        vscode.window.showErrorMessage('No available versions found');
        return;
    }

    // 让用户选择版本，添加刷新选项
    const versionItems = [
        {
            label: '$(sync) Refresh Version List',
            description: 'Fetch latest versions from server',
            detail: 'refresh',
            alwaysShow: true
        },
        ...versions.map(v => ({
            label: v.displayName,
            description: v.isLatest ? '(Latest)' : '',
            detail: v.version
        }))
    ];

    const selectedVersion = await vscode.window.showQuickPick(versionItems, {
        title: 'Select a Yaklang version to download',
        placeHolder: 'Choose version or refresh list...'
    });

    if (!selectedVersion) {
        return;
    }

    // 如果选择了刷新，重新调用此函数并强制刷新
    if (selectedVersion.detail === 'refresh') {
        return downloadSpecificVersionYakBinary(context, true);
    }

    const version = selectedVersion.detail || selectedVersion.label;
    const versionWithoutV = version.startsWith('v') ? version.substring(1) : version;

    // 构建下载 URL
    let downloadURL = "";
    switch (platform) {
        case 'Windows':
            downloadURL = `https://oss-qn.yaklang.com/yak/${versionWithoutV}/yak_windows_amd64.exe`
            break;
        case 'Linux':
            downloadURL = `https://oss-qn.yaklang.com/yak/${versionWithoutV}/yak_linux_amd64`
            break;
        case 'Darwin':
        case 'Mac':
            downloadURL = `https://oss-qn.yaklang.com/yak/${versionWithoutV}/yak_darwin_amd64`
            break;
    }

    if (downloadURL === "") {
        vscode.window.showErrorMessage(`Unsupported platform for ${platform}`);
        return;
    }

    const binaryName = basename(downloadURL);
    const options = [
        { label: "Yes" },
        { label: "No" },
    ];
    const selection = await vscode.window.showQuickPick(options, {
        title: `Download ${binaryName}(${versionWithoutV})?`,
    });
    if (!selection) {
        return
    }

    switch (selection.label) {
        case "Yes":
            const defaultUri = vscode.Uri.file(basename(getCurrentFilePath() || "/"));
            const newGoUris = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: "Select a folder to save yak binary",
                defaultUri
            });
            if (!newGoUris || newGoUris.length !== 1) {
                return;
            }
            const folderPath = fixDriveCasingInWindows(newGoUris[0].fsPath);
            await downloadLatestYakBinaryFromURL(context, binaryName, versionWithoutV, folderPath, downloadURL);
            break;
        case "No":
            break;
    }
}

async function downloadLatestYakBinaryFromURL(context: vscode.ExtensionContext, binary: string, latestVersion: string, folderPath: string, downloadURL: string) {
    binary = binary.includes(".exe") ? "yak.exe" : "yak";
    const binaryName = `${binary}(${latestVersion})`;
    const successMessage = `Download ${binaryName} SUCCEEDED`;
    const failedMessage = `Download ${binaryName} FAILED`;

    await vscode.window.withProgress(
        {
            title: `Downloading ${binaryName}`,
            location: vscode.ProgressLocation.Notification
        },
        async (progress) => {
            return new Promise<void>((resolve, reject) => {
                outputChannel.clear();
                outputChannel.show();
                outputChannel.appendLine(`Download latest ${binaryName}`);
                const outputPath = path.join(folderPath, binary);
    
                const request = https.get(downloadURL, (response) => {
                    const totalBytes = parseInt(response.headers['content-length'] || "0", 10);
                    let downloadedBytes = 0;
    
                    const writer = fs.createWriteStream(outputPath);
                    let success = false;
                    response.pipe(writer);
    
                    response.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        progress.report({
                            message: `${Math.round((downloadedBytes / totalBytes) * 100) }%`,
                            increment: (chunk.length / totalBytes) * 100,
                        });
                    });
    
                    writer.on('finish', () => {
                        outputChannel.appendLine(successMessage);
                        vscode.window.showInformationMessage(successMessage);
                        success = true;
                    });
    
                writer.on('close', async () => {
                    if (success) {
                        if (!outputPath.endsWith(".exe")) {
                            try {
                                fs.chmodSync(outputPath, 0o555)
                                vscode.window.showInformationMessage("Linux/Mac Chmod +x Finished")
                            }catch(e) {
                                vscode.window.showErrorMessage(`Linux/Mac Chmod Failed: ${e}`)
                            }
                        }
                        try {
                            await setYakBinary(context, outputPath)
                            vscode.window.showInformationMessage(`Auto Set use:${latestVersion} Finished`)
                        } catch (e) {
                            vscode.window.showErrorMessage(`Use Version ${latestVersion} Yaklang Engine Failed`)
                        }
                        resolve();
                    }
                })
    
                    writer.on('error', (err) => {
                        outputChannel.appendLine(failedMessage);
                        vscode.window.showErrorMessage(failedMessage);
                        reject(err);
                    });
                });
    
                request.on('error', (err) => {
                    outputChannel.appendLine(failedMessage);
                    vscode.window.showErrorMessage(failedMessage);
                    reject(err);
                });
            });
        }
    )    
    return ;
}

async function useSystemPathYak(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('yaklang');
    
    try {
        // Set binary source to auto
        await config.update('yakBinarySource', 'auto', vscode.ConfigurationTarget.Global);
        
        // Clear custom path
        await config.update('yakBinaryPath', '', vscode.ConfigurationTarget.Global);
        
        vscode.window.showInformationMessage('已切换到自动模式：使用系统 PATH 中的 yak');
        
        // Update status bar and restart LSP
        const { restartLSP } = require('./lspClient');
        await restartLSP(context);
    } catch (error) {
        vscode.window.showErrorMessage(`切换失败: ${error}`);
    }
}

export const expandYakStatusBar = (context: vscode.ExtensionContext) => async () => {
    const yakVersion = getYakVersion(context);
    const binarySource = getYakBinarySource();
    const yakBinary = findYakBinary(context);
    
    // Build current status message
    const sourceMode = binarySource === 'auto' ? '自动 (系统 PATH)' : '自定义路径';
    const currentStatus = `Current Yak Version: ${yakVersion} (${sourceMode})`;
    
    const options = [
        { label: currentStatus },
        { label: USE_SYSTEM_PATH_YAK_SELECTION },
        { label: CHOOSE_FROM_FILE_BROWSER_SELECTION },
        { label: DOWNLOAD_LATEST_YAK_BINARY_SELECTION },
        { label: DOWNLOAD_SPECIFIC_VERSION_SELECTION },
        { label: CLEAR_YAK_BINARY_SELECTION },
    ];
    const selection = await vscode.window.showQuickPick(options);
    if (!selection) {
        return
    }

    if (selection.label.startsWith("Current Yak Version:")) {
        return;
    }

    switch (selection.label) {
        case USE_SYSTEM_PATH_YAK_SELECTION:
            await useSystemPathYak(context);
            break;
        case CHOOSE_FROM_FILE_BROWSER_SELECTION:
            await chooseYakBinaryLocation(context);
            break;
        case DOWNLOAD_LATEST_YAK_BINARY_SELECTION:
            await downloadLatestYakBinary(context);
            break;
        case DOWNLOAD_SPECIFIC_VERSION_SELECTION:
            await downloadSpecificVersionYakBinary(context);
            break;
        case CLEAR_YAK_BINARY_SELECTION:
            resetYakBinaryPath(context);
            resetYakVersion(context);
            updateStatusBar(context, "");
            break;
    }
}