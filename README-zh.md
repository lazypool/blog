# 惰池的博客

<p align="center">
  LazyPool 的个人博客 · 记录代码、论文、工具与生活
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Hexo-8.x-0E83CD?style=flat-square&logo=hexo&logoColor=white" alt="Hexo 8">
  <img src="https://img.shields.io/badge/Theme-Tidepool-4C9AFF?style=flat-square" alt="Tidepool">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22-5FA04E?style=flat-square&logo=node.js&logoColor=white" alt="Node.js >= 22">
  <img src="https://img.shields.io/badge/Swup-4-2C4F7C?style=flat-square" alt="Swup 4">
  <img src="https://img.shields.io/badge/KaTeX-0.16-329F5B?style=flat-square" alt="KaTeX">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome">
</p>

<p align="center">
  <a href="./README.md">English</a> | <strong>简体中文</strong>
</p>

<p align="center">
  <img src="./docs/preview.png" alt="Tidepool 主题首页预览" width="100%">
</p>

站点基于 [Hexo](https://hexo.io/) 构建，使用自研的 **Tidepool** 主题。整体是低饱和潮池配色、卡片式布局和克制的微交互；旧版 Fluid 主题及相关配置、资源已经移除。

## 主要特性

- **无刷新导航**：Swup 4 局部替换页面内容，切换文章时保留导航和侧栏。
- **专属视觉**：OKLCH 单色相设计系统，内置 `tide / abyss / coral / kelp` 四套配色，支持明暗模式。
- **文章体验**：悬浮歌词式目录、阅读进度、标题锚点、代码复制、图片灯箱、上一篇 / 下一篇。
- **本地搜索**：构建时生成 `search.json`，支持 `Ctrl/⌘ + K` 或 `/` 唤起命令面板。
- **无限滚动**：首页、分类、标签文章列表分批加载，不再分页。
- **数学公式**：KaTeX 渲染，适配移动端与带 `\tag` 公式的横向滚动。
- **响应式**：移动端隐藏侧栏、压缩首页信息，保留完整阅读体验。
- **关于页**：展示个人资料、写作分类和 GitHub contribution 热力图。

## 技术栈

- **静态站点**：[Hexo 8](https://hexo.io/)
- **主题**：Tidepool（`themes/tidepool/`）
- **模板**：EJS
- **样式**：原生 CSS + CSS Custom Properties
- **交互**：原生 JavaScript、Swup 4
- **数学**：KaTeX
- **搜索**：本地 JSON 索引 + 客户端搜索
- **字体**：LXGW WenKai、JetBrains Mono
- **Node.js**：>= 22

## 快速开始

```bash
git clone https://github.com/lazypool/blog.git
cd blog
npm install
npm run server
```

本地预览默认运行在 <http://localhost:4000/>。

常用命令：

- `npm run server` —— 启动本地开发服务器
- `npm run build` —— 生成静态文件到 `public/`
- `npm run clean` —— 清理生成文件
- `npm run lint` —— EJS、Markdown、公式、站点配置全部检查
- `npm run format` —— Markdown/公式规范化 + Prettier（JSON/YAML）
- `npm run fix` —— 自动修复可安全修复的问题
- `npm run deploy` —— 部署（需先在 `_config.yml` 配置 deploy）

内容质量脚本：

- `post-filters.js`：中文粗体、软换行、公式下划线处理
- `check-math.js`：KaTeX 语法与公式结构检查
- `format-md.js`：段落重排、公式规范化
- `check-site.js`：图片路径、日期目录、标签/分类卫生
- `sync-source.js`：同步 `_pages` / `_assets`

提交前运行 `npm run lint` 和 `npm run format`。当前 `npm run lint` 结果为 **0 error / 0 warning**。

部署：

`npm run build` 会把站点生成到 `public/`。如需使用 `hexo deploy`，先在 `_config.yml` 的
`deploy` 字段配置目标仓库或平台；也可以直接把 `public/` 发布到 GitHub Pages、Cloudflare
Pages 等静态托管服务。

## 项目结构

```text
├── source/
│   ├── _assets/         # 共享图片资源，构建时镜像到 source/
│   ├── _pages/          # 独立页面（about / photo）
│   └── _posts/          # 文章
├── themes/
│   └── tidepool/        # 当前主题
│       ├── layout/      # EJS 布局与 partials
│       ├── scripts/     # helper / 搜索索引 / 404 路由
│       └── source/      # CSS、JS、Swup 依赖
├── scripts/             # 站点级 Hexo 脚本
├── docs/                # README 资源
├── _config.yml          # Hexo 主配置
├── _config.tidepool.yml # Tidepool 主题配置
└── public/              # 构建产物
```

## 主题与配色

主题配置集中在 `_config.tidepool.yml`：

- 导航菜单、作者信息、社交链接
- 首页 Hero、相册数量占位
- 搜索、目录、阅读进度、代码复制、图片灯箱等功能开关
- 默认配色：`tide`、`abyss`、`coral`、`kelp`

颜色 token 统一在 `themes/tidepool/source/css/tokens.css` 中维护。颜色和视觉修改必须通过
`themes/tidepool/` 完成，不要在项目根目录新增 `css/`、`js/`，也不要往 `source/_assets`
放 CSS/JS。

## 致谢

- [Hexo](https://hexo.io/)：静态站点生成
- [Swup](https://swup.js.org/)：无刷新页面导航
- [KaTeX](https://katex.org/)：数学公式渲染
- [LXGW WenKai](https://github.com/lxgw/LxgwWenKai)：正文字体
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/)：代码字体
- [Shields.io](https://shields.io/)：README badges

---

<p align="center">
  <sub>Made with <a href="https://hexo.io/">Hexo</a> · Theme <strong>Tidepool</strong> · 潮起潮落，文字留痕。</sub>
</p>
