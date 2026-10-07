# AGENTS.md

## 项目概述

这是一个基于Hexo的静态博客项目，使用Fluid主题，部署在GitHub Pages上。

## 技术栈

- **框架**: Hexo 8.1.2
- **主题**: Fluid
- **模板引擎**: EJS
- **样式预处理器**: Stylus
- **包管理器**: npm
- **Node.js版本**: >=22

## 项目结构

```text
├── source/          # 博客文章和页面源文件
├── themes/          # 主题文件
├── scripts/         # 自定义脚本
├── public/          # 生成的静态文件
├── _config.yml      # Hexo主配置
└── _config.fluid.yml # 主题配置
```

## 常用命令

### 开发命令

- `npm run server` - 启动本地开发服务器
- `npm run build` - 生成静态文件
- `npm run clean` - 清理生成的文件
- `npm run deploy` - 部署到GitHub Pages

### 代码质量

- `npm run lint` - 运行所有lint检查
- `npm run lint:ejs` - 检查EJS模板语法
- `npm run lint:markdown` - 检查Markdown格式
- `npm run lint:math` - 检查数学公式
- `npm run lint:site` - 检查站点配置
- `npm run format` - 格式化代码
- `npm run fix` - 自动修复问题

## 自定义脚本

- `scripts/check-math.js` - 检查数学公式格式
- `scripts/check-site.js` - 检查站点配置和链接
- `scripts/format-md.js` - 格式化Markdown文件
- `scripts/post-filters.js` - 文章过滤器
- `scripts/sync-source.js` - 同步源文件

## 开发规范

### 文章编写

1. 编写文章前，先查看`README.md`确定文章分类体系
2. 文章使用Markdown格式，存放在`source/_posts/`目录
3. 文件名格式：`年/月-日-标题.md`
4. 使用YAML front matter设置文章元数据
5. 数学公式使用KaTeX渲染

### 代码风格

- 使用Prettier格式化Markdown、JSON、YAML文件
- 遵循markdownlint规则
- EJS模板使用ejslint检查

### Git工作流

1. 使用feature分支开发
2. 提交前运行`npm run lint`和`npm run format`
3. 提交信息使用中文，简洁明了

## 部署流程

1. 本地构建：`npm run build`
2. 生成的文件在`public/`目录
3. 使用`npm run deploy`推送到GitHub Pages

## 注意事项

- 修改主题配置使用`_config.fluid.yml`，不要直接修改主题文件
- 数学公式需要正确转义，运行`npm run lint:math`检查
- 图片放在`source/`目录下的对应文章文件夹中
- 使用`post_asset_folder: true`配置，每篇文章有独立的资源文件夹
