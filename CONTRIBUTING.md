# 贡献指南 | Contributing Guide

[English](#english) | [简体中文](#简体中文)

---

## 简体中文

感谢您对 Yaklang VS Code 扩展的关注！我们欢迎并感激任何形式的贡献。

### 📋 目录
- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发设置](#开发设置)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [代码风格](#代码风格)
- [测试](#测试)
- [社区](#社区)

---

### 🤝 行为准则

参与本项目即表示您同意遵守我们的行为准则：

- **尊重他人**：尊重不同的观点和经验
- **接受建设性批评**：优雅地接受批评并提供建设性反馈
- **关注社区利益**：做对社区最有利的事情
- **展现同理心**：对其他社区成员表示同理心

不可接受的行为包括：
- 使用性化语言或图像
- 人身攻击或侮辱性评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息

---

### 💡 如何贡献

#### 报告 Bug

发现 Bug？请帮助我们改进！

1. **搜索现有 Issues**：确认问题尚未被报告
2. **创建 Issue**：使用 Bug 报告模板
3. **提供详细信息**：
   - VS Code 版本
   - 扩展版本
   - 操作系统
   - 复现步骤
   - 预期行为
   - 实际行为
   - 截图或日志（如有）

#### 建议新功能

有好点子？我们很乐意听到！

1. **搜索现有 Issues**：确认建议尚未提出
2. **创建 Issue**：使用功能请求模板
3. **详细描述**：
   - 功能的用例
   - 期望的行为
   - 可能的实现方式
   - 替代方案

#### 改进文档

文档和代码一样重要！

- 修正拼写或语法错误
- 添加缺失的文档
- 改进示例
- 翻译文档

#### 提交代码

准备好贡献代码了？太好了！

1. Fork 仓库
2. 创建功能分支
3. 编写代码
4. 添加测试
5. 提交 Pull Request

---

### 🛠️ 开发设置

#### 前置要求

- **Node.js**: >= 14.x
- **npm**: >= 6.x
- **VS Code**: >= 1.56.0
- **Git**: 最新稳定版

#### 克隆仓库

```bash
# 克隆您 fork 的仓库
git clone https://github.com/YOUR_USERNAME/yaklang-support.git
cd yaklang-support

# 添加上游仓库
git remote add upstream https://github.com/yaklang/yaklang-support.git
```

#### 安装依赖

```bash
npm install
```

#### 编译项目

```bash
# 一次性编译
npm run compile

# 监听模式（自动重新编译）
npm run watch
```

#### 在 VS Code 中运行

1. 在 VS Code 中打开项目
2. 按 `F5` 启动扩展开发宿主
3. 在新窗口中测试扩展

#### 项目结构

```
yaklang-support/
├── src/                    # 源代码
│   ├── extension.ts        # 扩展入口点
│   ├── commands.ts         # 命令实现
│   ├── lspClient.ts        # LSP 客户端
│   ├── statusbar.ts        # 状态栏
│   ├── simpleCodeLens.ts   # CodeLens 提供器
│   ├── i18n/               # 国际化
│   └── utils/              # 工具函数
├── syntaxes/               # 语法定义
├── snippets/               # 代码片段
├── images/                 # 图片资源
├── out/                    # 编译输出（git ignored）
├── package.json            # 扩展清单
└── tsconfig.json           # TypeScript 配置
```

---

### 📝 提交规范

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

#### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type（类型）

- **feat**: 新功能
- **fix**: Bug 修复
- **docs**: 文档更新
- **style**: 代码格式（不影响代码运行）
- **refactor**: 重构（既不是新功能也不是 Bug 修复）
- **perf**: 性能优化
- **test**: 添加测试
- **chore**: 构建过程或辅助工具的变动

#### Scope（范围）

- `codelens`: CodeLens 相关
- `lsp`: LSP 客户端相关
- `commands`: 命令相关
- `i18n`: 国际化相关
- `debug`: 调试相关
- `ui`: 用户界面相关

#### 示例

```bash
feat(codelens): add run and debug buttons to yak files

fix(lsp): resolve server crash on startup

docs(readme): update installation instructions

style(commands): format code with prettier

refactor(utils): simplify path resolution logic

perf(syntax): optimize syntax highlighting performance
```

---

### 🔄 Pull Request 流程

#### 1. 创建分支

```bash
# 从最新的 main 分支创建功能分支
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

#### 2. 开发

- 编写代码
- 添加测试
- 更新文档
- 遵循代码风格

#### 3. 提交更改

```bash
git add .
git commit -m "feat(scope): your commit message"
```

#### 4. 推送到 Fork

```bash
git push origin feature/your-feature-name
```

#### 5. 创建 Pull Request

1. 访问 GitHub 上您的 fork
2. 点击 "Compare & pull request"
3. 填写 PR 模板
4. 提交 Pull Request

#### PR 检查清单

- [ ] 代码遵循项目风格指南
- [ ] 已添加/更新相关测试
- [ ] 所有测试通过
- [ ] 已更新相关文档
- [ ] 提交消息遵循规范
- [ ] 已解决所有 lint 警告
- [ ] PR 描述清晰，包含必要的上下文

#### PR 审查

- 维护者会审查您的 PR
- 可能会提出修改建议
- 讨论和迭代是正常的
- 一旦批准，PR 将被合并

---

### 🎨 代码风格

#### TypeScript

- 使用 **2 空格**缩进
- 使用**单引号**表示字符串
- 添加**分号**
- 使用 **camelCase** 命名变量和函数
- 使用 **PascalCase** 命名类和接口
- 添加类型注解

#### 示例

```typescript
// ✅ 好的
export function findYakBinary(context: vscode.ExtensionContext): string {
    const config = vscode.workspace.getConfiguration('yaklang');
    const binaryPath = config.get<string>('yakBinaryPath');
    return binaryPath || '';
}

// ❌ 不好的
export function FindYakBinary(context) {
  const config=vscode.workspace.getConfiguration("yaklang")
  const binaryPath=config.get('yakBinaryPath')
  return binaryPath||''
}
```

#### Linting

```bash
# 运行 ESLint
npm run lint

# 自动修复问题
npm run lint -- --fix
```

---

### 🧪 测试

#### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "test name"
```

#### 编写测试

- 为新功能添加测试
- 为 Bug 修复添加回归测试
- 保持高代码覆盖率
- 使用描述性的测试名称

#### 示例

```typescript
import * as assert from 'assert';
import { findYakBinary } from '../utils/path';

suite('Path Utils', () => {
    test('findYakBinary should return binary path', () => {
        const binary = findYakBinary(mockContext);
        assert.ok(binary);
    });
});
```

---

### 🌍 国际化

添加新字符串时，请确保支持国际化：

#### 1. 在 `src/i18n/locales/zh-CN.json` 中添加中文

```json
{
  "command.newCommand": "新命令描述"
}
```

#### 2. 在 `src/i18n/locales/en-US.json` 中添加英文

```json
{
  "command.newCommand": "New command description"
}
```

#### 3. 在代码中使用

```typescript
import { t } from './i18n';

const message = t('command.newCommand');
```

---

### 📦 发布流程

（仅限维护者）

1. 更新版本号：`npm version [major|minor|patch]`
2. 更新 CHANGELOG.md
3. 提交更改：`git commit -am "chore: release v1.x.x"`
4. 创建标签：`git tag v1.x.x`
5. 推送：`git push && git push --tags`
6. 发布到 Marketplace：`npm run publish`

---

### 💬 社区

#### 获取帮助

- 📖 [文档](https://yaklang.com/docs)
- 💬 [Discussions](https://github.com/yaklang/yaklang-support/discussions)
- 🐛 [Issues](https://github.com/yaklang/yaklang-support/issues)

#### 保持联系

- GitHub: [@yaklang](https://github.com/yaklang)
- Website: [yaklang.com](https://yaklang.com)

---

### 🙏 致谢

感谢所有贡献者！您的付出让 Yaklang 变得更好。

#### 贡献者列表

查看 [Contributors](https://github.com/yaklang/yaklang-support/graphs/contributors)

---

### 📄 许可证

贡献到本项目即表示您同意您的贡献将在 [MIT License](LICENSE) 下授权。

---

## English

Thank you for your interest in contributing to the Yaklang VS Code extension! We welcome and appreciate all forms of contributions.

### 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute-1)
- [Development Setup](#development-setup-1)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process-1)
- [Code Style](#code-style-1)
- [Testing](#testing-1)
- [Community](#community-1)

---

### 🤝 Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- **Be respectful**: Respect differing viewpoints and experiences
- **Accept constructive criticism**: Accept criticism gracefully and provide constructive feedback
- **Focus on community**: Do what's best for the community
- **Show empathy**: Show empathy towards other community members

Unacceptable behavior includes:
- Use of sexualized language or imagery
- Personal attacks or insulting comments
- Public or private harassment
- Publishing others' private information without permission

---

### 💡 How to Contribute

#### Reporting Bugs

Found a bug? Help us improve!

1. **Search existing Issues**: Ensure the bug hasn't been reported
2. **Create an Issue**: Use the bug report template
3. **Provide details**:
   - VS Code version
   - Extension version
   - Operating system
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots or logs (if applicable)

#### Suggesting Features

Have a great idea? We'd love to hear it!

1. **Search existing Issues**: Ensure the suggestion hasn't been made
2. **Create an Issue**: Use the feature request template
3. **Describe in detail**:
   - Use case for the feature
   - Expected behavior
   - Possible implementation
   - Alternatives considered

#### Improving Documentation

Documentation is as important as code!

- Fix typos or grammar errors
- Add missing documentation
- Improve examples
- Translate documentation

#### Contributing Code

Ready to contribute code? Awesome!

1. Fork the repository
2. Create a feature branch
3. Write code
4. Add tests
5. Submit a Pull Request

---

### 🛠️ Development Setup

#### Prerequisites

- **Node.js**: >= 14.x
- **npm**: >= 6.x
- **VS Code**: >= 1.56.0
- **Git**: Latest stable version

#### Clone Repository

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/yaklang-support.git
cd yaklang-support

# Add upstream remote
git remote add upstream https://github.com/yaklang/yaklang-support.git
```

#### Install Dependencies

```bash
npm install
```

#### Compile Project

```bash
# One-time compilation
npm run compile

# Watch mode (auto-recompile)
npm run watch
```

#### Run in VS Code

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new window

#### Project Structure

```
yaklang-support/
├── src/                    # Source code
│   ├── extension.ts        # Extension entry point
│   ├── commands.ts         # Command implementations
│   ├── lspClient.ts        # LSP client
│   ├── statusbar.ts        # Status bar
│   ├── simpleCodeLens.ts   # CodeLens provider
│   ├── i18n/               # Internationalization
│   └── utils/              # Utility functions
├── syntaxes/               # Syntax definitions
├── snippets/               # Code snippets
├── images/                 # Image assets
├── out/                    # Compiled output (git ignored)
├── package.json            # Extension manifest
└── tsconfig.json           # TypeScript config
```

---

### 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

#### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation update
- **style**: Code formatting (no code changes)
- **refactor**: Refactoring (neither feature nor bug fix)
- **perf**: Performance optimization
- **test**: Adding tests
- **chore**: Build process or auxiliary tool changes

#### Scope

- `codelens`: CodeLens related
- `lsp`: LSP client related
- `commands`: Command related
- `i18n`: Internationalization related
- `debug`: Debugging related
- `ui`: User interface related

#### Examples

```bash
feat(codelens): add run and debug buttons to yak files

fix(lsp): resolve server crash on startup

docs(readme): update installation instructions

style(commands): format code with prettier

refactor(utils): simplify path resolution logic

perf(syntax): optimize syntax highlighting performance
```

---

### 🔄 Pull Request Process

#### 1. Create Branch

```bash
# Create feature branch from latest main
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

#### 2. Develop

- Write code
- Add tests
- Update documentation
- Follow code style

#### 3. Commit Changes

```bash
git add .
git commit -m "feat(scope): your commit message"
```

#### 4. Push to Fork

```bash
git push origin feature/your-feature-name
```

#### 5. Create Pull Request

1. Visit your fork on GitHub
2. Click "Compare & pull request"
3. Fill out PR template
4. Submit Pull Request

#### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Added/updated relevant tests
- [ ] All tests pass
- [ ] Updated relevant documentation
- [ ] Commit messages follow conventions
- [ ] Resolved all lint warnings
- [ ] PR description is clear with necessary context

#### PR Review

- Maintainers will review your PR
- May request changes
- Discussion and iteration is normal
- Once approved, PR will be merged

---

### 🎨 Code Style

#### TypeScript

- Use **2 spaces** for indentation
- Use **single quotes** for strings
- Add **semicolons**
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and interfaces
- Add type annotations

#### Example

```typescript
// ✅ Good
export function findYakBinary(context: vscode.ExtensionContext): string {
    const config = vscode.workspace.getConfiguration('yaklang');
    const binaryPath = config.get<string>('yakBinaryPath');
    return binaryPath || '';
}

// ❌ Bad
export function FindYakBinary(context) {
  const config=vscode.workspace.getConfiguration("yaklang")
  const binaryPath=config.get('yakBinaryPath')
  return binaryPath||''
}
```

#### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

---

### 🧪 Testing

#### Run Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- --grep "test name"
```

#### Writing Tests

- Add tests for new features
- Add regression tests for bug fixes
- Maintain high code coverage
- Use descriptive test names

#### Example

```typescript
import * as assert from 'assert';
import { findYakBinary } from '../utils/path';

suite('Path Utils', () => {
    test('findYakBinary should return binary path', () => {
        const binary = findYakBinary(mockContext);
        assert.ok(binary);
    });
});
```

---

### 🌍 Internationalization

When adding new strings, ensure i18n support:

#### 1. Add Chinese in `src/i18n/locales/zh-CN.json`

```json
{
  "command.newCommand": "新命令描述"
}
```

#### 2. Add English in `src/i18n/locales/en-US.json`

```json
{
  "command.newCommand": "New command description"
}
```

#### 3. Use in code

```typescript
import { t } from './i18n';

const message = t('command.newCommand');
```

---

### 📦 Release Process

(Maintainers only)

1. Update version: `npm version [major|minor|patch]`
2. Update CHANGELOG.md
3. Commit: `git commit -am "chore: release v1.x.x"`
4. Create tag: `git tag v1.x.x`
5. Push: `git push && git push --tags`
6. Publish to Marketplace: `npm run publish`

---

### 💬 Community

#### Get Help

- 📖 [Documentation](https://yaklang.com/docs)
- 💬 [Discussions](https://github.com/yaklang/yaklang-support/discussions)
- 🐛 [Issues](https://github.com/yaklang/yaklang-support/issues)

#### Stay Connected

- GitHub: [@yaklang](https://github.com/yaklang)
- Website: [yaklang.com](https://yaklang.com)

---

### 🙏 Acknowledgments

Thanks to all contributors! Your contributions make Yaklang better.

#### Contributors

See [Contributors](https://github.com/yaklang/yaklang-support/graphs/contributors)

---

### 📄 License

By contributing to this project, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

<div align="center">

**Thank you for contributing to Yaklang! 🎉**

Made with ❤️ by the Yaklang Team

</div>

