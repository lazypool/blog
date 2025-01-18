---
layout: post
title: 一篇博客带你回顾前端发展的 20 年 🫕
date: 2025-01-15 21:01:51
categories:
    - 🌍️ 网络编程
tags: [前端, 技术前瞻]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/squirrel.png
---

# “诸侯纷争，群雄割据”：统一前端为何如此困难？

当初，**网景** _(NetSpace)_ 推出其浏览器 Navigator 和脚本语言 Javascript，后被 **微软** _(Microsoft)_ 反编译而催生出 IE 和 JScript。刚开始，网景凭借技术创新而领先。但微软将 IE 与 Windows 98 捆绑销售，便将它打败了。这被称作 **第一次浏览器大战** _(The First Browser War)_ 。本来，EMCA-262 规范了浏览器对 Javascript 的解释行为。但在此次战争中，它实际上被两家厂商忽视了。这直接导致了后来的 **前端兼容问题** 。在这样的背景下，“前端人士”入场了……

## 最初为解决兼容性问题，后造就 jQuery 工具链 (2005 ~ 2008)

前面提到：由于浏览器大战，微软并没有按照规范来实现 Javascript、HTML 和 CSS，导致前端页面难以兼容不同浏览器。所以 CSS Hack、浏览器判别、特性侦测等技术应运而生。**2005 年，Protype 诞生，它是一个非常优雅的基础类库。** 在当时，它的诞生除了解决兼容问题，还实现了两大影响深远的功能：**动画特效** 和 **Ajax 请求**。自 Protype 之后，Dojo、ExtJS、MooTools 等库也陆续出现。当时前端开发模式是选择一个核心库，找一些组件，或者扒别人的脚本进行开发。

**2006 年，jQuery 发布，它同样是一个 Javascript 基础类库。** 其刚发布之时，并没有如预想般吸引众多人使用。直到 2009 年 **Sizzle 选择器引擎** 研发成功，jQuery 才取得压倒性的优势、击败同期许多竞争对手。jQuery 的主要贡献分为三个方面：

1. 发掘出大量的 **DOM/BOM 兼容方案** （例如 Dean Edwrad 的 addEvent()，IE 的 px 转换方案，domReady 的 doScroll 方案，globalEval 的兼容方案等）。
2. 以 DOM 为中心的 **链式操作**，解放了前端开发者的编程思维。开发者们开始注重前后端分离，并要求不能污染 Object 原型对象，不能污染 window 全局变量。
3. 促使人们对 CSS1~CSS3 选择器的学习，促进了浏览器原生选择器引擎的诞生。

jQuery 的出现让前端工程师开发更加轻松。工程师如果想实现一个功能，可以搜索出一个好用的 jQuery 插件来实现。那时候大家就整天介绍 jQuery 插件，很少讨论一些底层的实现。这时，前端发展进入了 **jQuery 小作坊时代**，人们围绕 jQuery 创造出了一条成熟的工具链。

## 万恶之源？JS 的漫长工程化道路 (2009~2012)

- 2009：ES5 发布（增加方法、特性，没有带来革命性变化）
- 2009：CommonJS（JS 的模块化）
- 2009：NodeJS（使 JS 可用作服务端语言）
- 2010：Backbone.js（MVC 模型、强依赖于 jQuery）
- 2010：AngularJS（数据绑定、MEAN）
- 2010：npm（脚手架、包管理、语法风格检测…… 前端阵营的分裂）
- 2011：Bootstrap（宫格式响应设计）
- 2012：Typescript（使 JS 可以像静态语言一样开发项目）
- 2012：构建工具（Webpack、Gulp 等从无到有、然后泛滥）

## 版本之子入场，前端的业务场景不断膨胀 (2013~2014)

- 2013：React（JSX、虚拟 DOM、组件化、单向数据流）
- 2013：electron（基于 Chromium 和 Nodejs、跨平台桌面应用程序开发框架、使 Web 技术可以无缝衔接程序开发）
- 2014：Vue（结合 AngularJS 和 React、接地气的活跃社区）
- 2014：HTML5（解决了 HTML4 的痼疾，满足现代 Web 应用各方面需求，适应移动端网页）

## JS 从脚本变成语言，React 与 Vue 分庭抗礼 (2015 ~ 2017)

- 2015：ES6 发布（语法改进、类继承、Promise、模块化标准）
- 2015：React Native（使用 JS 和 React 语法来构建原生移动应用）
- 2015：GraphQL（避免多次请求、自描述）
- 2016：Webpack（支持 ES Module、在前端社区迅速流行、成为前端开发标配）
- 2016：Next.js（使得 React 应用更容易扩展、成为构建现代 Web 应用的流行选择）
- 2016：Nuxt（给 Vue 提供了开箱即用的功能和工具）
- 2017：Tailwind CSS（提供原子类快速构建样式）

## 移动应用开发与小程序开发时代 (2017 ~ 2024)

- 2017：Flutter、Nust 等（跨平台移动应用框架）
- 2018：uni-app（基于 Vue，支持一套代码快速发布 APP、H5 和小程序平台）
- 2018：Taro（基于 React，支持多平台发布）
- 2020：Vue3（组合式开发模式、TS 支持、全新 Composition API）
- 2020：Vite（模块热更新、按需编译等等）
- 2021：SvelteKit（和 Next、Nuxt 相同功能的框架，丰富了 Svelte 生态系统）
- 2022：ArkTS（华为推出、鸿蒙 APP 专用）

## 前端已死？未来我们将何去何从？（2025 ~ ?）

// to be continued...
