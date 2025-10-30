import * as vscode from 'vscode';
import { getYakVersionWithReason } from './utils/version';
import { getYakBinarySource, findYakBinary } from './utils/path';
import { t } from './i18n';

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
        updateStatusBar(context).then(() => {
            yakEnvStatusbarItem.show();
            return resolve();
        });
    });
}

export async function updateStatusBar(context: vscode.ExtensionContext) {
    if (!yakEnvStatusbarItem) {
        return;
    }

    // 显示 Loading 状态（黄色背景）
    yakEnvStatusbarItem.text = `$(sync~spin) ${t('statusbar.checking')}`;
    yakEnvStatusbarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    yakEnvStatusbarItem.tooltip = t('statusbar.checkingTooltip');

    // 异步获取 Yak 版本和详细信息（包括失败原因）
    const versionResult = await getYakVersionWithReason(context);
    const yakBinary = findYakBinary(context);
    const binarySource = getYakBinarySource();
    
    if (versionResult.success && versionResult.version) {
        // 成功获取版本
        yakEnvStatusbarItem.text = `YAK: ${versionResult.version}`;
        yakEnvStatusbarItem.backgroundColor = undefined; // 默认背景色
        
        // Build tooltip with detailed information (without repeating version)
        const modeText = binarySource === 'auto' ? t('statusbar.autoMode') : t('statusbar.customMode');
        let tooltip = `${t('statusbar.binaryMode')}: ${modeText}\n`;
        if (yakBinary) {
            tooltip += `${t('common.path')}: ${yakBinary}`;
        }
        
        yakEnvStatusbarItem.tooltip = tooltip;
    } else {
        // 获取版本失败
        yakEnvStatusbarItem.text = t('statusbar.failed');
        yakEnvStatusbarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        
        // 显示详细的失败原因
        const modeText = binarySource === 'auto' ? t('statusbar.autoMode') : t('statusbar.customMode');
        let tooltip = `${t('statusbar.failedTooltip')}\n`;
        tooltip += `${t('common.reason')}: ${versionResult.reason || '未知错误'}\n`;
        tooltip += `\n`;
        tooltip += `${t('statusbar.binaryMode')}: ${modeText}\n`;
        if (yakBinary) {
            tooltip += `${t('statusbar.tryingPath')}: ${yakBinary}\n`;
        } else {
            tooltip += `${t('statusbar.notFound')}\n`;
        }
        tooltip += `\n${t('statusbar.clickToFix')}`;
        
        yakEnvStatusbarItem.tooltip = tooltip;
    }
}