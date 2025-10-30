# Yaklang 插件国际化 (i18n) 指南

## 概述

Yaklang VSCode 插件现在支持中英文双语界面切换。

## 支持的语言

- 简体中文 (zh-CN) - 默认
- English (en-US)

## 如何切换语言

### 方法 1：通过命令面板

1. 打开命令面板（`Cmd/Ctrl + Shift + P`）
2. 输入 "Yaklang: 切换语言" 或 "Yaklang: Switch Language"
3. 选择你想要的语言
4. 根据提示选择是否立即重载窗口

### 方法 2：通过状态栏（新增功能）

1. 点击状态栏中的 YAK 版本信息（例如："YAK: 1.4.4-alpha1029"）
2. 在弹出的快速选择菜单中，选择第一个选项："切换语言 / Switch Language"
3. 选择你想要的语言
4. 根据提示选择是否立即重载窗口

这种方式更加便捷，无需记住命令名称。

## 已国际化的功能

✅ 所有用户可见的消息和提示
✅ 状态栏显示
✅ LSP 服务器状态和错误消息
✅ 引擎下载和版本管理
✅ 静态补全警告
✅ 配置和诊断信息

## 开发者指南

### 添加新的翻译

1. 在 `src/i18n/locales/zh-CN.ts` 中添加中文翻译键值对
2. 在 `src/i18n/locales/en-US.ts` 中添加对应的英文翻译
3. 在代码中使用 `t('translation.key')` 调用翻译

### 使用示例

```typescript
import { t } from './i18n';

// 简单翻译
vscode.window.showInformationMessage(t('lsp.loadSuccess'));

// 带参数的翻译
vscode.window.showErrorMessage(t('lsp.failed', error.message));

// 在翻译文件中定义
// zh-CN: 'lsp.failed': '启动 YAK LSP HTTP 失败：{0}'
// en-US: 'lsp.failed': 'Failed to start YAK LSP HTTP: {0}'
```

### 文件结构

```
src/i18n/
├── index.ts           # i18n 核心功能
└── locales/
    ├── zh-CN.ts       # 简体中文翻译
    └── en-US.ts       # 英文翻译
```

## 注意事项

- 语言偏好保存在 VSCode 全局状态中
- 切换语言后建议重新加载窗口以确保所有界面元素更新
- 新增翻译时请确保两种语言文件的键保持一致

## 贡献

如果你发现翻译错误或有改进建议，欢迎提交 PR 或 Issue。

