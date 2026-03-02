---
layout: post
title: 如何写更好的 git 提交信息 (git message)
tags:
  - git
  - 规范化
categories:
  - 🔧 工具使用
  - 实用工具指南
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00027.jpg
date: 2025-12-10 17:31:24
---


# 确保编写有意义的 commit message

最近我在编写我的 dwm 下一代的代码，开了很多 feature 分支，也做了很多 commit。在实际项目中，我注意到我过去提交的很多信息都很混乱，缺乏统一规范，比如有的使用了中文，有的表述不清，等等。实际上，关于 git 的提交信息已经有一个很成熟的约定了，那就是 『[conventional commits](https://www.conventionalcommits.org/zh-hant/v1.0.0/)』。这个约定被大家默默地遵守了很多年，已经可以称得上是现今 git 提交信息的书写规范了。我觉得这个内容比较有趣且重要，所以把它写下来以提醒自己 **时刻保持良好的 commit 信息书写规范**。

## 为什么要写更好的提交信息

想象一下这个场景：你半年前修复了一个棘手的线上问题，现在类似的问题又出现了。你满怀希望地运行 `git log` 查看历史，却只看到满屏的 "Fixed something"，完全不知道应该参考哪一条 commit 的内容。此刻的你，会不会后悔当初自己没有在 commit 信息里多写些东西呢？

**好的提交信息，是为了拯救未来的你，以及你的队友。** 具体来说，它具有以下几个核心价值：

1. **清晰的项目历史** 代码本身只说明了“怎么改”，而优秀的提交信息则解释了“改了什么”和“为什么这么改”。这对于后续的代码审查、问题定位和新人熟悉项目至关重要
2. **高效的团队协作** 在团队开发中，清晰的提交信息让其他成员能快速理解你的工作内容，无需打断你进行询问，大大提升了协作效率
3. **方便回滚与定位** 当需要回退到某个特定功能或修复时，清晰的提交信息能帮你快速定位到准确的提交点，而不是在一堆“update”中盲目尝试

## Conventional Commits

一个被广泛认可和采用的优秀实践是 _conventional commits_ 它为提交信息提供了一个清晰、可扩展的模板，使其变得高度结构化且机器可读。一个标准的约定式提交信息格式如下：

```txt
<type>[optional scope]: <description>

[optional text]

[optional footer(s)]
```

### 类型 (type)

这是提交的核心，用于说明此次提交的性质。常见的类型和含义如下表格所示：
（摘自开源项目 [conventional-changelog-metahub](https://github.com/pvdlg/conventional-changelog-metahub#commit-types)）

| Commit Type | Title                    | Description                                                                                                 | Emoji | Release                        | Include in changelog |
|:-----------:|--------------------------|-------------------------------------------------------------------------------------------------------------|:-----:|--------------------------------|:--------------------:|
|   `feat`    | Features                 | A new feature                                                                                               |   ✨   | `minor`                       |        `true`        |
|    `fix`    | Bug Fixes                | A bug Fix                                                                                                   |  🐛   | `patch`                        |        `true`        |
|   `docs`    | Documentation            | Documentation only changes                                                                                  |  📚   | `patch` if `scope` is `readme` |        `true`        |
|   `style`   | Styles                   | Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)      |  💎   | -                              |        `true`        |
| `refactor`  | Code Refactoring         | A code change that neither fixes a bug nor adds a feature                                                   |  📦   | -                              |        `true`        |
|   `perf`    | Performance Improvements | A code change that improves performance                                                                     |  🚀   | `patch`                        |        `true`        |
|   `test`    | Tests                    | Adding missing tests or correcting existing tests                                                           |  🚨   | -                              |        `true`        |
|   `build`   | Builds                   | Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)         |  🛠   | `patch`                        |        `true`        |
|    `ci`     | Continuous Integrations  | Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs) |  ⚙️   | -                              |        `true`        |
|   `chore`   | Chores                   | Other changes that don't modify src or test files                                                           |  ♻️   | -                              |        `true`        |
|  `revert`   | Reverts                  | Reverts a previous commit                                                                                   |  🗑   | -                              |        `true`        |

### 范围 (scope)

范围是可选的，用于指明此次提交所影响的代码模块、功能区域或文件。它帮助团队更精确地定位变更的上下文，尤其是在大型或模块化项目中。

通常是一个简短的名词，用括号括起来，放在类型之后。例如：`feat(auth):`、`fix(router):`、`docs(readme):`。范围的定义应与团队约定保持一致，如果没有明确的影响范围，或者更改是跨模块的，则可以省略。

确定范围的称呼有以下几种途径：

- 功能模块：如 user、payment、api、ui
- 技术层面：如 build、deps、config、database
- 特定的文件名或组件名：如 readme、dockerfile

### 描述 (description)

这是提交信息的标题，应言简意赅地总结变更内容，通常包括明确的谓语和宾语，如：

- feat: add a user's personal center page
- fix: handle service crashes caused by null pointer exceptions
- refactor(auth): simplifies the logic for verifyign user login status
- docs: correct parameter example in the API interface documentation

### 正文和脚注 (text & footers)

一般来说，正文和脚注都会写的很详细，这使得提交信息很长。 **绝大部分情况下，我们都会避免写正文和脚注，除非内容极其重要。**

正文用于详细描述变更的动机、与之前行为的对比。脚注通常用于引用相关的问题跟踪（如 `Closes #123`）或标记破坏性变更（如 `BREAKING CHANGE:`）。

## 有些通用的原则

1. **让我们说英文** (不要尝试在 commit 信息里写中文，~尽管你看到别人这样做~)
2. description 不应该过长，不要超过 20 个单词
3. 没有规定 description 开头要不要大写，不要纠结
4. 有一点你应当知道，那就是 description 不应该带句号
5. 用空行把 text 和 description 分隔开，相信我这很重要
6. 对 text 进行恰当的 wrap，比如每 72 个单词换行
7. 使用无主句语气来写 description，时态为一般现在时，这有助于阅读者理解

## 来看一个好的 commit 案例

```txt
feat(ui): add dark mode toggle button

This commit introduces a persistent dark/light mode toggle in the
application header. The user's preference is saved to local storage
and persists across sessions.

The implementation uses the new `ThemeContext` provider to manage
state, ensuring all child components update reactively without
prop-drilling. CSS custom properties (variables) are updated
dynamically to switch the color scheme.

Manually tested across Chrome, Firefox, and Safari. Existing unit
tests for the header component have been updated to include the
new toggle.

Closes #142
BREAKING CHANGE: The `useAppTheme` hook has been renamed to
`useTheme`. Update your imports accordingly.
```

遵循约定的提交格式，能将琐碎的开发记录转化为清晰、连贯的项目叙事。这种规范化的实践不仅提升了历史记录的可读性与协作效率，也为后续的变更日志生成、版本管理自动化等工具化流程奠定了可靠基础。坚持有意义的提交信息，是对项目长期可维护性的一项关键投入。
