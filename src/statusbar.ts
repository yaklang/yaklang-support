import * as vscode from 'vscode';
import { getYakVersionWithReason } from './utils/version';
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
    yakEnvStatusbarItem.text = `$(sync~spin) YAK: 检查中...`;
    yakEnvStatusbarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    yakEnvStatusbarItem.tooltip = '正在检查 Yak 引擎状态...';

    // 异步获取 Yak 版本和详细信息（包括失败原因）
    const versionResult = await getYakVersionWithReason(context);
    const yakBinary = findYakBinary(context);
    const binarySource = getYakBinarySource();
    
    if (versionResult.success && versionResult.version) {
        // 成功获取版本
        yakEnvStatusbarItem.text = `YAK: ${versionResult.version}`;
        yakEnvStatusbarItem.backgroundColor = undefined; // 默认背景色
        
        // Build tooltip with detailed information (without repeating version)
        let tooltip = `二进制模式: ${binarySource === 'auto' ? '自动 (系统 PATH)' : '自定义路径'}\n`;
        if (yakBinary) {
            tooltip += `路径: ${yakBinary}`;
        }
        
        yakEnvStatusbarItem.tooltip = tooltip;
    } else {
        // 获取版本失败
        yakEnvStatusbarItem.text = `YAK: Failed`;
        yakEnvStatusbarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        
        // 显示详细的失败原因
        let tooltip = `Yak 引擎状态检查失败\n`;
        tooltip += `原因: ${versionResult.reason || '未知错误'}\n`;
        tooltip += `\n`;
        tooltip += `二进制模式: ${binarySource === 'auto' ? '自动 (系统 PATH)' : '自定义路径'}\n`;
        if (yakBinary) {
            tooltip += `尝试使用的路径: ${yakBinary}\n`;
        } else {
            tooltip += `未找到 yak 二进制文件\n`;
        }
        tooltip += `\n点击查看如何修复`;
        
        yakEnvStatusbarItem.tooltip = tooltip;
    }
}