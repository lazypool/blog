---
layout: post
title: 深入理解 Linux 字体配置：我的 fontconfig 实践 🧭
tags:
  - 字体
  - emoji
  - nerd font
  - fontconfig
categories:
  - 🔧 工具使用
  - Oh-my-Linux
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00025.jpg
date: 2025-10-25 12:13:49
---


# 理解 Linux 字体配置：我的 fontconfig 实践 🧭

说来惭愧，linux 系统我也用了将近 4 年了，但是它的字体配置一直没有搞得很清楚。特别是终端中的 emoji 显示，总是时好时坏，让人困扰。最近在查阅资料时，我参考了 luboQAQ 关于 fontconfig 的博客，决定系统性地解决这个问题。

本文将分享我的~抄作业~配置实践，帮助大家理解如何在 Linux 下实现完美的字体渲染。

## 字体的分类

字体的数量可以说是成千上万，但一般在电脑上显示的基本为以下这三类：

- **等宽字体 (monospace)：** 字符宽度相同，适合编程和终端显示。
- **无衬线字体 (sans-serif)：** 笔画简洁，适合屏幕显示。
- **衬线字体 (Serif)：** 笔画末端有装饰，适合印刷阅读。

对于中文用户来说，一个重要的认知是：中文字体本身都是等宽的，所谓的「等宽中文字体」实际上是指其西文部分采用等宽设计，2 个字母对应 1 个汉字。

## 选择字体

这里不做特别多的个人化，参考别人的，选择了以下字体组合：

- 无衬线：西文 Noto Sans，中文 Noto Sans CJK
- 衬线：西文 Noto Serif，中文 Noto Serif CJK
- 等宽：西文 Fira Code，中文 Noto Sans Mono CJK

在 ArchLiunx 上，我们只需要安装 `noto-fonts` 和 `noto-fonts-cjk` 这两个包即可，他们分别提供了西文字体 Noto Sans / Noto Serif 和中文字体 Noto Sans CJK / Noto Serif CJK / Noto Sans Mono CJK 。Fira Code 要单独安装。指令如下：

```bash
sudo pacman -S noto-fonts noto-fonts-cjk ttf-fira-code
```

关于 emoji，我之前使用的是 Noto 的 noto-fonts-emoji，这次换到了 Twitter 推出的字体 Twemoji。

```bash
sudo pacman -S ttf-twemoji
```

其次，有一些终端文件显示的工具，如 yazi，默认需要安装 nerd-ttf-font，这个图标字体也被用的很多。

```bash
sudo pacman -S ttf-nerd-fonts-symbols
```

在我之前的使用中，我一股脑把这些字体安装后就不管理了。这就使得在终端的中文、西文、图标以及 emoji 有时会在几种字体之间切换。具体怎么切换取决于字体的缓存是怎么样的。实际表现就是，有时 emoji 会在终端显示成 nerd symbols，有时又会切换成别的。要实现有序的字体呈现，需要写配置文件。

接下来讲具体怎样在自己的系统上配置字体~

## fontconfig

Fontconfig 是 Linux 下字体管理的核心系统，它通过一套灵活的规则机制来管理字体显示。想要深入了解的话可以看看[双猫大佬](https://catcat.cc/post/2020-10-31/)的这篇文章，里面详细介绍了Linux fontconfig 的字体匹配机制。

### 关键概念

- **字体的属性：** 包括字族 (family)、字重 (weight)、倾斜 (slant) 等，后两者统称为样式 (style)。
- **通用字族名：** sans-serif、serif、monospace。通用字族名是配置的关键。它们不是具体的字体，而是让应用程序在 fontconfig 的查询中来获得具体的实际字体。**你可以这样理解：所有应用程序实际上都只使用这三种通用字体，但是这个通用字体具体指向哪一款字取决于你的系统配置。**

### 调试方法

需要传入环境变量 `FC_DEBUG=4` 来看到调试信息，例如：

```bash
# 查看字体匹配过程
FC_DEBUG=4 fc-match 'monospace'

# 在具体程序中调试
FC_DEBUG=4 st
```

调试信息会显示字体匹配的完整过程，包括规则应用和最终结果，这对排查问题非常有帮助。具体的解读方式可以看看 [luoboQAQ](https://lbqaq.top/p/linux-font/#如何调试) 的说明。

### 配置文件

整个配置文件由如下几个部分依次拼接而成：

1. 目录设置(`<dir>`, `<cachedir>`, `<include>`)
2. 杂项设置(`<config>`)
3. 扫描阶段(`<match target="scan">`)
4. 匹配阶段(`<alias>`, `<match target="pattern">`)
5. 渲染阶段(`<match target="font">`)

我们主要关心第四个部分，即匹配阶段，使用 fontconfig 配置如下：

```xml
<match target="pattern">
  <test name="family">
    <string>sans-serif</string>
  </test>
  <edit name="family" mode="prepend" binding="strong">
    <string>Noto Sans CJK SC</string>
    <string>Noto Sans</string>
    <string>Twemoji</string>
  </edit>
</match>
```

这种 font stack 的方式，即可让程序按照以下顺序渲染字体：

`Noto Sans CJK SC` —> `Noto Sans` -> `Twemoji`

这里的``<test>``就是条件判断，`mode="prepend"`指在前添加，`binding="strong"`则是强绑定。

## 开始配置

核心配置思路是：通过定义通用字体的 fallback 顺序，构建一个完整的字体栈。配置文件位于 `~/.config/fontconfig/fonts.conf`。

### 设置默认字体

```xml
<!-- Default system-ui fonts -->
<match target="pattern">
  <test name="family">
    <string>system-ui</string>
  </test>
  <edit name="family" mode="prepend" binding="strong">
    <string>sans-serif</string>
  </edit>
</match>

<!-- Default serif fonts-->
<match target="pattern">
  <test name="family">
    <string>sans-serif</string>
  </test>
  <edit name="family" mode="prepend" binding="strong">
    <string>Noto Sans CJK SC</string>
    <string>Noto Sans</string>
    <string>Twemoji</string>
  </edit>
</match>

<!-- Default monospace fonts-->
<match target="pattern">
  <test name="family">
    <string>monospace</string>
  </test>
  <edit name="family" mode="prepend" binding="strong">
    <string>Noto Sans Mono CJK SC</string>
    <string>Fira Code</string>
    <string>Symbols Nerd Font</string>
    <string>Twemoji</string>
  </edit>
</match>
```

### 设置异形字

什么是异形字？Noto Sans CJK 中的异体字，是在 相同的 Unicode 码位下，不同的语言会使用不同的字形。可以在双猫大佬的这个[测试网站](https://catcat.cc/raw/fontconfig.html)中看到，不同的语言环境下，有些字的显示是不同的。

为了在保留异体字的情况下，让它默认显示中国大陆字形，只在特定语言下显示异体字，可以按如下为不同语言设置不同字体。

```xml
<!-- Replace fonts for Japanese -->
<match target="pattern">
  <test name="lang">
    <string>ja</string>
  </test>
  <test name="family">
    <string>Noto Sans CJK SC</string>
  </test>
  <edit name="family" binding="strong">
    <string>Noto Sans CJK JP</string>
  </edit>
</match>
```

### 解决全角引号

为了让引号只在中文文本中全宽，在其他语言中半角。同样，在双猫大佬的这个[测试网站](https://catcat.cc/raw/fontconfig.html)中可以进行测试。

```xml
<!-- 英文环境下优先使用西文字体显示引号 -->
<match target="pattern">
  <test name="lang" compare="contains">
    <string>en</string>
  </test>
  <test name="family" compare="contains">
    <string>Noto Sans CJK</string>
  </test>
  <edit name="family" mode="prepend" binding="strong">
    <string>Noto Sans</string>
  </edit>
</match>
```

有时，会出现全角引号设置无效的情况，这是由于系统变量中的`LANG`为`en_US.UTF-8`，这会导致传递给 fontconfig 的 lang 是 `lang: zh-cn(s) "en"(w)`。于是就一直匹配西文字体。我选择性地忽视了这个问题，因为我认为将`LANG`改为`zh_CN.UTF-8`有风险。

### 覆盖西文字体

在所有情况下，除了程序名为 msedge 的情况下，优先使用 Fira Code 显示西文，再用 Noto Sans Mono CJK 显示中文，这主要是为了避免程序使用 Noto Sans 显示中文。

```xml
<!-- Replace english fonts-->
<match target="pattern">
  <test name="prgname" compare="not_eq">
    <string>msedge</string>
  </test>
  <test name="family" compare="contains">
    <string>Noto Sans Mono CJK</string>
  </test>
  <edit name="family" mode="prepend" binding="strong">
    <string>Fira Code</string>
  </edit>
</match>
```

### 替换任意字体

当系统里已经安装了一些不需要的字体，但又不想删除或者屏蔽它怎么办呢？替换掉 font pattern 就可以了。这里是用 Noto 替换思源字体

```xml
<match target="pattern">
  <test qual="any" name="family">
    <string>Source Han Sans</string>
  </test>
  <edit name="family" mode="assign" binding="same">
    <string>Noto Sans CJK SC</string>
  </edit>
</match>
```

### 字体渲染参数

看到很多地方都是这样写的，我也把它写了过来：

```xml
<match target="font">
  <edit name="hinting" mode="assign">
    <bool>true</bool>
  </edit>
  <edit name="hintstyle" mode="assign">
    <const>hintslight</const>
  </edit>
  <edit name="antialias" mode="assign">
    <bool>true</bool>
  </edit>
  <edit name="rgba" mode="assign">
    <const>rgb</const>
  </edit>
</match>
```

这里主要设置了一些字体的渲染方式：

- `autohint`：优先使用内嵌微调
- `hinting`：开启微调
- `hintstyle`：微调的程度，轻微
- `antialias`：开启抗锯齿功能
- `lcdfilter`：LCD filter 的风格，默认
- `rgba`：LCD 子像素的排列顺序，rgb

## 不能解决的问题

Linux 不强迫程序必须使用特定的依赖，而是程序主动选择了约定俗成的依赖。老话重谈，程序可以自由选择完全遵守 fontconfig，也可以选择部分使用 fontconfig 的配置，或者完全不遵守它。这也导致了对一些程序无法实现字体的修改。以及上面提到的 chrome 对 fontconfig 并不是很好，或许面对这种程序，就需要合成字体的出场了。

## 参考资料

1. [fontconfig：Linux 下的字体配置 - luboQAQ](https://lbqaq.top/p/linux-font/)
2. [用 fontconfig 治理 Linux 中的字体 - 双猫CC](https://catcat.cc/post/2021-03-07/)
3. [Linux字体美化实战(Fontconfig配置) - 金步国](https://www.jinbuguo.com/gui/linux_fontconfig.html)
4. [Linux 上的字体配置与故障排除 - 依云's blog](https://blog.lilydjwg.me/2023/3/5/linux-fonts.216591.html)
