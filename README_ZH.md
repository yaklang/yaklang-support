# Yaklang VS Code 扩展

<div align="center">

![Yaklang Logo](images/icon.png)

**为 VS Code 提供完整的 Yaklang 语言支持**

[![Version](https://img.shields.io/visual-studio-marketplace/v/v1ll4n.yak)](https://marketplace.visualstudio.com/items?itemName=v1ll4n.yak)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/v1ll4n.yak)](https://marketplace.visualstudio.com/items?itemName=v1ll4n.yak)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/v1ll4n.yak)](https://marketplace.visualstudio.com/items?itemName=v1ll4n.yak)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | 简体中文

</div>

---

## 重要：版本要求

**要使 LSP（语言服务器协议）功能正常工作，您必须使用 1.4.4-alpha1030b 或更高版本的 Yak 引擎。**

- 扩展版本：1.4.1+
- 最低 Yak 引擎版本：1.4.4-alpha1030b

如果您使用的是旧版本的 Yak 引擎，LSP 功能（智能提示、代码补全、诊断）将无法正常工作。

---

## 特性

### 语言支持
- **Yaklang (.yak)** - 完整的语言支持，包括语法高亮、智能提示和代码补全
- **SyntaxFlow (.sf)** - 专为安全分析设计的领域特定语言

### 核心功能
- **智能感知（IntelliSense）** - 代码自动补全、函数签名提示、参数信息（需要 Yak 引擎 >= 1.4.4-alpha1030b）
- **调试支持** - 完整的调试功能，支持断点、单步执行、变量查看
- **一键运行** - 通过 CodeLens 或快捷键快速运行 Yak 脚本
- **代码格式化** - 自动格式化代码，保持代码风格统一
- **代码片段** - 丰富的代码模板，提升开发效率
- **LSP 服务器** - 基于语言服务器协议的实时代码分析（需要 Yak 引擎 >= 1.4.4-alpha1030b）

### 引擎管理
- **自动检测** - 自动从系统 PATH 检测 Yak 引擎
- **版本管理** - 一键下载、安装、切换不同版本的 Yak 引擎
- **多语言支持** - 中文/English 界面切换
- **状态栏集成** - 实时显示当前 Yak 引擎版本和状态

---

## 安装

### 方式一：从 VS Code Marketplace 安装（推荐）

1. 打开 VS Code
2. 进入扩展视图（`Ctrl+Shift+X` / `Cmd+Shift+X`）
3. 搜索 "Yaklang"
4. 点击 "安装"

### 方式二：命令行安装

```bash
code --install-extension v1ll4n.yak
```

### 方式三：从 VSIX 文件安装

1. 从 [Releases](https://github.com/yaklang/yaklang-support/releases) 下载最新的 `.vsix` 文件
2. 在 VS Code 中：`扩展` → `...` → `从 VSIX 安装...`

---

## 快速开始

### 1. 安装 Yak 引擎（版本 >= 1.4.4-alpha1030b）

**关键要求**：为了使 LSP 功能正常工作，您必须安装 1.4.4-alpha1030b 或更高版本的 Yak 引擎。

**方式 A：通过扩展自动下载**
1. 点击状态栏的 Yak 版本图标
2. 选择 "下载 Yak 引擎"
3. 选择 1.4.4-alpha1030b 或更高版本
4. 等待下载完成

**方式 B：手动安装**
```bash
# Linux/macOS
curl -sfL https://yaklang.com/install.sh | bash

# Windows (PowerShell)
iwr -useb https://yaklang.com/install.ps1 | iex

# 验证版本（必须 >= 1.4.4-alpha1030b）
yak version
```

### 2. 配置引擎路径

扩展支持两种模式：

- **自动模式（推荐）**：自动使用系统 PATH 中的 `yak` 命令
- **自定义模式**：手动指定 Yak 引擎路径

通过状态栏切换模式：点击状态栏的 Yak 图标 → 选择相应选项

### 3. 开始编写代码

创建一个 `.yak` 文件并开始编码：

```yak
// hello.yak
println("Hello, Yaklang!")

// 使用内置函数
http.Get("https://example.com", http.proxy("http://127.0.0.1:7890"))~
```

### 4. 运行脚本

- **CodeLens（推荐）**：点击文件顶部的 `Run Yak Script` 按钮
- **快捷键**：`Cmd+Shift+B` (macOS) / `Ctrl+Shift+B` (Windows/Linux)
- **右键菜单**：右键 → `Yak: Exec file`
- **命令面板**：`Cmd+Shift+P` → `Yak: Exec file`

---

## 功能详解

### CodeLens - 代码镜头

在每个 `.yak` 文件顶部自动显示：
- **Run Yak Script** - 运行当前脚本
- **Debug Yak Script** - 调试当前脚本

### 快捷键

| 功能 | Windows/Linux | macOS |
|------|--------------|-------|
| 运行脚本 | `Ctrl+Shift+B` | `Cmd+Shift+B` |
| 格式化代码 | `Shift+Alt+F` | `Shift+Option+F` |
| 命令面板 | `Ctrl+Shift+P` | `Cmd+Shift+P` |

### 命令列表

通过命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`）访问所有命令：

| 命令 | 说明 |
|------|------|
| `Yak: Exec file` | 运行当前 Yak 脚本 |
| `Yak: Debug file` | 调试当前 Yak 脚本 |
| `Yak: Format file` | 格式化当前文件 |
| `Yak: 配置引擎` | 打开引擎配置面板 |
| `Yaklang: LSP 状态` | 查看 LSP 服务器状态 |
| `Yaklang: 重启 LSP 服务器` | 重启语言服务器 |
| `Yaklang: 下载 Yak 引擎` | 下载指定版本的引擎 |
| `Yaklang: 查看已安装版本` | 查看所有已安装的引擎版本 |
| `Yaklang: 切换语言` | 切换界面语言（中文/English） |

### 右键菜单

在 `.yak` 文件中右键可使用：
- **Yak: Exec file** - 运行脚本
- **Yak: Debug file** - 调试脚本
- **Yak: Format file** - 格式化代码

---

## 配置选项

### 基础配置

```json
{
  // 引擎源模式
  "yaklang.yakBinarySource": "auto",  // "auto" 或 "custom"
  
  // 自定义引擎路径（仅在 custom 模式下使用）
  "yaklang.yakBinaryPath": ""
}
```

### 配置说明

#### `yaklang.yakBinarySource`
- **`auto`**（推荐）：自动从系统 PATH 查找 `yak` 命令
- **`custom`**：使用自定义路径（需配置 `yakBinaryPath`）

#### `yaklang.yakBinaryPath`
自定义 Yak 引擎的完整路径，例如：
- macOS/Linux: `/usr/local/bin/yak`
- Windows: `C:\Program Files\yaklang\yak.exe`

---

## 调试

### 启动调试

1. 在代码中设置断点（点击行号左侧）
2. 按 `F5` 或点击 CodeLens 的 `Debug Yak Script`
3. 使用调试控制台查看变量、堆栈等信息

### 调试配置

在 `.vscode/launch.json` 中自定义调试配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "yak",
      "request": "launch",
      "name": "Debug Yak Script",
      "program": "${file}",
      "args": [],
      "env": []
    }
  ]
}
```

---

## 故障排除

### 问题：LSP 功能无法使用

**最常见原因**：您使用的是旧版本的 Yak 引擎。

**解决方案：**
1. 检查 Yak 引擎版本：在终端运行 `yak version`
2. 如果版本低于 1.4.4-alpha1030b，请升级：
   - 点击状态栏 Yak 图标 → "下载 Yak 引擎"
   - 选择 1.4.4-alpha1030b 或更高版本
3. 升级后重启 VS Code

### 问题：CodeLens 不显示

**解决方案：**
1. 检查 VS Code 设置：`设置` → `编辑器` → 确保 `Editor: Code Lens` 已启用
2. 重新加载窗口：`Cmd+Shift+P` → `Developer: Reload Window`
3. 检查文件语言模式是否为 `Yak`（右下角状态栏）

### 问题：找不到 Yak 引擎

**解决方案：**
1. 点击状态栏的 Yak 图标
2. 选择 "下载 Yak 引擎" 自动下载（版本 >= 1.4.4-alpha1030b）
3. 或手动设置引擎路径：状态栏 → "Choose yak binary from file browser"

### 问题：LSP 服务器未启动

**解决方案：**
1. **首先，确认 Yak 引擎版本 >= 1.4.4-alpha1030b**
2. 打开命令面板：`Cmd+Shift+P`
3. 运行：`Yaklang: 重启 LSP 服务器`
4. 查看输出：`查看` → `输出` → 选择 "Yaklang LSP"

### 问题：代码补全不工作

**解决方案：**
1. **确保 Yak 引擎版本 >= 1.4.4-alpha1030b**（最常见问题）
2. 检查 LSP 服务器状态：`Yaklang: LSP 状态`
3. 重启 LSP：`Yaklang: 重启 LSP 服务器`
4. 重启 VS Code

---

## 更多资源

- **官方网站**: [https://yaklang.com](https://yaklang.com)
- **文档**: [https://yaklang.com/docs](https://yaklang.com/docs)
- **GitHub**: [https://github.com/yaklang/yaklang](https://github.com/yaklang/yaklang)
- **问题反馈**: [https://github.com/yaklang/yaklang-support/issues](https://github.com/yaklang/yaklang-support/issues)

---

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 贡献方式
- 报告 Bug
- 提出新功能建议
- 改进文档
- 提交 Pull Request

---

## 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

## 致谢

感谢所有为 Yaklang 生态系统做出贡献的开发者！

---

## 联系方式

- **问题反馈**: [GitHub Issues](https://github.com/yaklang/yaklang-support/issues)
- **功能建议**: [GitHub Discussions](https://github.com/yaklang/yaklang-support/discussions)

---

<div align="center">

**[回到顶部](#yaklang-vs-code-扩展)**

Made with love by the Yaklang Team

</div>

