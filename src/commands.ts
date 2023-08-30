import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

import { getCurrentWorkspaceFolder } from './utils/workspace';
import { getDefaultConfig } from './utils/dap';
import { asyncFetchLatestYaklangVersion, getYakVersion, isValidYakBinary, resetYakVersion, updateYakVersionByBinary } from './utils/version';
import { updateStatusBar, yakEnvStatusbarItem } from './statusbar';
import { executableFileExists, findYakBinary, fixDriveCasingInWindows, getCurrentFilePath, resetYakBinaryPath, setYakBinaryPath } from './utils/path';
import { basename } from 'path';
import { getSystemInfo } from './utils/os';
import { URL } from 'url';


const CHOOSE_FROM_FILE_BROWSER_SELECTION = 'Choose yak binary from file browser';
const DOWNLOAD_LATEST_YAK_BINARY_SELECTION = 'Download latest yak binary';
const CLEAR_YAK_BINARY_SELECTION = 'Clear yak binary selection';

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

function setYakBinary(context: vscode.ExtensionContext, path: string) {
    setYakBinaryPath(context, path);
    updateYakVersionByBinary(context, path);
    updateStatusBar(context, getYakVersion(context));
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
    setYakBinary(context, newYakBin);
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
            downloadURL = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${latestYakVersion || "latest"}/yak_windows_amd64.exe`
            break;
        case 'Linux':
            downloadURL = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${latestYakVersion || "latest"}/yak_linux_amd64`
            break;
        case 'Darwin':
            downloadURL = `https://yaklang.oss-cn-beijing.aliyuncs.com/yak/${latestYakVersion || "latest"}/yak_darwin_amd64`
            break;
    }
    if (downloadURL === "") {
        vscode.window.showErrorMessage("Unsupported platform");
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
    
                    writer.on('close', () => {
                        if (success) {
                            setYakBinary(context, outputPath);
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

export const expandYakStatusBar = (context: vscode.ExtensionContext) => async () => {
    const yakVersion = getYakVersion(context);
    const options = [
        { label: `Current Yak Versoin: ${yakVersion}` },
        { label: CHOOSE_FROM_FILE_BROWSER_SELECTION },
        { label: DOWNLOAD_LATEST_YAK_BINARY_SELECTION },
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
        case CHOOSE_FROM_FILE_BROWSER_SELECTION:
            await chooseYakBinaryLocation(context);
            break;
        case DOWNLOAD_LATEST_YAK_BINARY_SELECTION:
            await downloadLatestYakBinary(context);
            break;
        case CLEAR_YAK_BINARY_SELECTION:
            resetYakBinaryPath(context);
            resetYakVersion(context);
            updateStatusBar(context, "");
            break;
    }
}