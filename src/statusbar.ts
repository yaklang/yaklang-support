import * as vscode from 'vscode';
import { getAndSetYakVersion } from './utils/version';
import { getYakBinarySource, findYakBinary } from './utils/path';

const STATUS_BAR_ITEM_NAME = 'Yak';
export let yakEnvStatusbarItem: vscode.StatusBarItem;

export function registerStatusBar(context: vscode.ExtensionContext): Promise<void> {
    yakEnvStatusbarItem = vscode.window.createStatusBarItem(
        STATUS_BAR_ITEM_NAME,
        vscode.StatusBarAlignment.Left,
        50
    );
    yakEnvStatusbarItem.name = STATUS_BAR_ITEM_NAME;
    yakEnvStatusbarItem.command = "yak.environment.status";

    return new Promise<void>((resolve, reject) => {
        let version = getAndSetYakVersion(context);
        updateStatusBar(context, version).then(() => {
            yakEnvStatusbarItem.show();
            return resolve();
        });
    });
}

export async function updateStatusBar(context: vscode.ExtensionContext, version: string | undefined) {
    const hasVersion = version != "";
    if (!hasVersion) {
        version = "N/A";
    }
    
    // Get binary source mode
    const binarySource = getYakBinarySource();
    const sourceIcon = binarySource === 'auto' ? '[Auto]' : '[Custom]';
    const yakBinary = findYakBinary(context);
    
    if (yakEnvStatusbarItem) {
        yakEnvStatusbarItem.text = `${sourceIcon} Yak: ${version}`;
        
        // Build tooltip with detailed information
        let tooltip = `Yak 版本: ${version}\n`;
        tooltip += `二进制模式: ${binarySource === 'auto' ? '自动 (系统 PATH)' : '自定义路径'}\n`;
        if (yakBinary) {
            tooltip += `当前路径: ${yakBinary}`;
        }
        
        yakEnvStatusbarItem.tooltip = tooltip;
    }
}