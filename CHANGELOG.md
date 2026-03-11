# 更新日志 | Changelog

本文档记录 Yaklang VS Code 扩展的所有重要变更。

---

## [1.4.2] - 2026-03-11

### Syntax Highlighting
- **Heredoc support**: Added `<<<IDENTIFIER ... IDENTIFIER` heredoc syntax highlighting, fixing broken coloring for files using heredoc strings
- **Single-quote fix**: Replaced broken lookahead/lookbehind single-quote pattern with a robust begin/end pattern
- **F-string support**: Added `f"..."`, `f'...'`, `` f`...` `` template string highlighting with `${expression}` interpolation
- **Hash comments**: Added `#` line comment highlighting (matching Yaklang lexer behavior)
- **Missing keywords**: Added `elif`, `assert`, `not`, `function`, `new`, `class` keyword highlighting

### LSP UX Improvements
- **Simplified status bar**: Changed LSP status bar to concise states: `START` / `DONE` / `STOP` / `FAIL`
- **Crash auto-recovery**: LSP process crash now shows a notification with "Restart" button
- **Click-to-restart**: Status bar in STOP/FAIL state directly triggers LSP restart on click
- **Cleaner notifications**: Removed redundant LSP startup success popup; status bar is sufficient

---

## [1.4.1] - 2025-10-30

### IMPORTANT: Version Requirements
**LSP features require Yak engine version >= 1.4.4-alpha1030b**

This version of the extension requires Yak engine 1.4.4-alpha1030b or later for LSP (Language Server Protocol) features to work properly. If you're using an older version of the Yak engine, please upgrade to ensure full functionality.

### Bug Fixes
- **CodeLens Execution Fix**: Fixed "Invalid URL" error when clicking "Run Yak Script" from CodeLens
  - Optimized `execFile` function to handle both URL format and regular file paths
  - Added intelligent detection logic to automatically identify parameter types
  - Enhanced error handling and logging

### Documentation
- **Complete Documentation**: Added comprehensive README documentation in English and Chinese
- **Professional Package**: Optimized package.json with detailed metadata, keywords, and badges
- **Changelog**: Created CHANGELOG.md to track version changes
- **Contributing Guide**: Added CONTRIBUTING.md to guide developer contributions
- **Version Requirements**: Clearly documented that LSP features require Yak engine >= 1.4.4-alpha1030b

---

## [1.4.0] - 2025-10-29

### ✨ New Features | 新功能
- **简化的 CodeLens**: 实现了新的简化版 CodeLens 提供器
  - ▶️ Run Yak Script - 一键运行脚本
  - 🐛 Debug Yak Script - 一键调试脚本
- **多语言支持**: 添加了中文/English 界面切换功能
  - 新增 `yaklang.switchLanguage` 命令
  - 支持持久化语言设置
  - 所有 UI 文本支持国际化

### 🔧 Improvements | 改进
- **状态栏优化**: 改进了状态栏菜单的用户体验
  - 显示当前引擎版本和模式
  - 更清晰的菜单选项组织
- **LSP 集成**: 增强了语言服务器协议支持
  - 添加 LSP 状态查看命令
  - 添加 LSP 重启命令

---

## [1.3.0] - 2025-10-15

### ✨ New Features | 新功能
- **自动引擎下载**: 实现了全自动的 Yak 引擎下载功能
  - 智能选择适合当前系统的版本
  - 自动安装到 `~/.yak/bin` 目录
  - 版本缓存机制，支持离线查看
- **版本管理**: 添加了完整的版本管理功能
  - 查看所有已安装的版本
  - 一键切换不同版本
  - 删除不需要的版本

### 🔧 Improvements | 改进
- **引擎检测**: 优化了 Yak 引擎的自动检测逻辑
  - 支持从系统 PATH 自动查找
  - 支持从标准安装目录查找
  - 改进了 Windows 平台的兼容性

---

## [1.2.0] - 2025-09-20

### ✨ New Features | 新功能
- **SyntaxFlow 支持**: 添加了对 SyntaxFlow (.sf) 文件的完整支持
  - 语法高亮
  - 基础的 IntelliSense
- **代码片段**: 新增了丰富的 Yak 代码片段
  - HTTP 请求模板
  - 常用函数模板
  - 错误处理模板

### 🔧 Improvements | 改进
- **格式化**: 改进了代码格式化功能
  - 更好的缩进处理
  - 保留空行
  - 优化注释格式

---

## [1.1.0] - 2025-08-10

### ✨ New Features | 新功能
- **调试支持**: 实现了完整的调试功能
  - 断点设置
  - 单步执行
  - 变量查看
  - 调用堆栈
- **快捷键**: 添加了常用操作的快捷键
  - `Cmd/Ctrl+Shift+B`: 运行脚本

### 🐛 Bug Fixes | 修复
- 修复了在 Windows 上路径处理的问题
- 修复了 LSP 服务器在某些情况下无法启动的问题

---

## [1.0.0] - 2025-07-01

### 🎉 Initial Release | 首次发布

#### ✨ Core Features | 核心功能
- **语法高亮**: 完整的 Yaklang 语法高亮支持
- **IntelliSense**: 基于 LSP 的智能代码补全
- **运行脚本**: 右键菜单和命令面板运行 Yak 脚本
- **引擎配置**: 支持自定义 Yak 引擎路径

#### 📦 Language Support | 语言支持
- Yaklang (.yak) 文件支持
- 基础的代码补全
- 函数签名提示

#### 🛠️ Developer Tools | 开发工具
- 语言服务器协议 (LSP) 集成
- 状态栏集成
- 输出通道支持

---

## 版本说明 | Version Notes

### 版本格式 | Version Format
- **主版本号 (Major)**: 不兼容的 API 变更
- **次版本号 (Minor)**: 向下兼容的功能性新增
- **修订号 (Patch)**: 向下兼容的问题修正

### 图例 | Legend
- ✨ **New Features** | 新功能
- 🔧 **Improvements** | 改进
- 🐛 **Bug Fixes** | 修复
- 📝 **Documentation** | 文档
- 🎨 **UI/UX** | 界面/体验
- ⚡ **Performance** | 性能
- 🔒 **Security** | 安全
- 🗑️ **Deprecated** | 废弃
- ❌ **Removed** | 移除

---

## 即将到来 | Upcoming

### 🚀 计划中的功能 | Planned Features

#### v1.5.0
- [ ] 测试框架集成
- [ ] 代码覆盖率显示
- [ ] 性能分析工具
- [ ] 更多代码片段

#### v1.6.0
- [ ] 远程调试支持
- [ ] 协作功能
- [ ] 插件系统
- [ ] 主题自定义

#### v2.0.0
- [ ] 完全重写的 LSP 服务器
- [ ] AI 辅助编程
- [ ] 云端同步
- [ ] 企业版功能

---

## 反馈 | Feedback

有问题或建议？请访问：
- 🐛 [报告 Bug](https://github.com/yaklang/yaklang-support/issues)
- 💡 [功能建议](https://github.com/yaklang/yaklang-support/discussions)
- 📧 [联系我们](mailto:support@yaklang.com)

---

**[⬆ 返回顶部](#更新日志--changelog)**

