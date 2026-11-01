# AGENTS.md

## 项目概述

这是一个基于 Hexo 的静态博客，使用自研 **Tidepool** 主题（潮池），部署在 GitHub Pages 上。主题强调：

- 局部替换导航（Swup），无整页刷新
- 可切换配色 / 明暗模式
- 卡片式双栏布局、粘性侧栏、文章目录
- 客户端 KaTeX 公式、JSON 本地搜索、代码复制、图片灯箱

旧版 Fluid 主题仍保留在 `themes/fluid/`，但 `_config.yml` 已切换到 `tidepool`。

## 技术栈

- **框架**: Hexo 8.1.2
- **主题**: Tidepool（`themes/tidepool/`）
- **模板引擎**: EJS
- **样式**: 原生 CSS（`themes/tidepool/source/css/`）
- **交互**: 原生 JS + Swup 4 + KaTeX
- **包管理器**: npm
- **Node.js 版本**: >=22

## 项目结构

```text
├── source/                 # 博客文章和页面源文件
│   ├── _assets/            # 旧的 Fluid 自定义资源（新主题不再使用）
│   ├── _pages/             # 独立页面源文件（about / photo）
│   └── _posts/             # 文章
├── themes/
│   ├── tidepool/           # 当前主题
│   │   ├── layout/         # EJS 布局与 partials
│   │   ├── scripts/        # Hexo 主题脚本（helper / 搜索索引）
│   │   └── source/         # CSS / JS / Swup 依赖
│   └── fluid/              # 旧主题（未启用）
├── scripts/                # 站点级 Hexo 脚本
├── public/                 # 生成的静态文件
├── _config.yml             # Hexo 主配置
├── _config.tidepool.yml    # Tidepool 主题配置
└── _config.fluid.yml       # 旧主题配置（未启用）
```

## 常用命令

### 开发命令

- `npm run server` - 启动本地开发服务器
- `npm run build` - 生成静态文件
- `npm run clean` - 清理生成的文件
- `npm run deploy` - 部署到 GitHub Pages

### 代码质量

- `npm run lint` - 运行所有 lint 检查
- `npm run lint:ejs` - 检查 Fluid + Tidepool 的 EJS 模板语法
- `npm run lint:markdown` - 检查 Markdown 格式
- `npm run lint:math` - 检查数学公式
- `npm run lint:site` - 检查站点配置
- `npm run format` - 格式化代码
- `npm run fix` - 自动修复问题

## 自定义脚本

站点级：

- `scripts/check-math.js` - 检查数学公式格式
- `scripts/check-site.js` - 检查站点配置和链接
- `scripts/format-md.js` - 格式化 Markdown 文件
- `scripts/post-filters.js` - 文章过滤器（CJK / 数学）
- `scripts/sync-source.js` - 把 `_pages`、`_assets` 同步到 `source/`

主题级（`themes/tidepool/scripts/`）：

- `helpers.js` - 图标、摘要、字数/阅读时长、分类树、激活状态等 EJS helper
- `search-index.js` - 生成 `/search.json` 本地搜索索引
- `pages.js` - 生成 `/404.html`（避免在 `source/_pages` 放空 markdown）

## 开发规范

### 文章编写

1. 编写文章前，先查看 `README.md` 确定文章分类体系
2. 文章使用 Markdown，存放在 `source/_posts/`
3. 文件名格式：`年/月-日-标题.md`
4. 使用 YAML front matter 设置元数据（`layout`、`title`、`categories`、`tags`、`index_img`）
5. 数学公式使用 `$...$` / `$$...$$`，由客户端 KaTeX 渲染

### 主题开发

- 修改主题配置使用 `_config.tidepool.yml`，不要改 `themes/tidepool/_config.yml` 中的默认值（除非新增默认项）
- 布局在 `themes/tidepool/layout/`，页面类型：`index`、`post`、`page`、`about`、`archive`、`category`、`tag`、`404`
- 样式在 `themes/tidepool/source/css/`，按 tokens / base / layout / components / article / pages 分层
- 交互在 `themes/tidepool/source/js/app.js`，所有随 Swup 替换后需要重新初始化的逻辑都放进 `initPage()`
- 新增图标：在 `layout/_partials/icons.ejs` 添加 `<symbol id="i-xxx">`，模板中用 `tide_icon('xxx')`
- 新增页面：在 `source/_pages/<name>/index.md` 设置 `layout`

### 代码风格

- 使用 Prettier 格式化 Markdown、JSON、YAML 文件
- 遵循 markdownlint 规则
- EJS 模板使用 ejslint 检查
- 不引入 jQuery / Bootstrap 等整包依赖

### Git 工作流

1. 使用 feature 分支开发
2. 提交前运行 `npm run lint` 和 `npm run format`
3. 提交信息使用中文，简洁明了

## 部署流程

1. 本地构建：`npm run build`
2. 生成的文件在 `public/` 目录
3. 使用 `npm run deploy` 推送到 GitHub Pages

## 注意事项

- `source/_pages` 与 `source/_assets` 会在 `after_init` 时同步到 `source/`，所以页面源文件应放在 `_pages`
- 不生成独立的 `/tags/`、`/categories/` 聚合页；标签/分类入口在侧栏，详情页由 Hexo 的 tag/category generator 生成
- 数学公式需要正确转义，运行 `npm run lint:math` 检查
- 图片放在 `source/` 下对应文章文件夹（`post_asset_folder: true`）
- Swup 会替换 `#swup` 的内容，导航/搜索/页脚等全局组件放在 `#swup` 之外
- 搜索索引在构建时生成；改完搜索逻辑后需要重新 `npm run build`
