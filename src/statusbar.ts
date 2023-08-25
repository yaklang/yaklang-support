import * as vscode from 'vscode';
import { getAndSetYakVersion } from './utils/version';

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
        version = "❌";
    }
    if (yakEnvStatusbarItem) {
        yakEnvStatusbarItem.text = `Yak: ${version}`;
        yakEnvStatusbarItem.tooltip = "yak version";
    }
}