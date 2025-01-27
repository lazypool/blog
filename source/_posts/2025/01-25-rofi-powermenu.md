---
layout: post
title: 使用 rofi 搭建好看的电源管理界面🐘
date: 2025-01-25 21:58:08
categories:
    - 🔧 工具使用
tags: [dwm, rofi, dunst, 电源管理界面]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/hamster.png
---

# 使用 rofi 搭建好看的电源管理界面

rofi 是一款轻量级的窗口切换器、运行对话框、ssh 启动器以及 dmenu 的替代品。由于其可以用脚本方式调用，且官方提供了高度自由的样式定制方法，许多厉害的大佬会用它来做各种各样炫酷好玩的东西。在本篇博客中，我尝试用它做一个电源管理界面（powermenu），并用 dunst 丰富其视觉效果。

![Rofi](rofi_artfont.png)

一切神话，始于安装。arch 的包管理器可以直接获取最新版本的 rofi 编译后文件。

```bash
sudo pacman -S rofi
```

## 电源管理脚本

### 一些原理的讲解

在正式开始前，我们先简单理解一下我们的需求。**创建一个电源管理界面，实际上就是唤出一个菜单。该菜单提供了关机、重启、锁屏、挂起、睡眠、登出等选项。选定选项后，再发一个 Are you sure ? 的确定菜单。** 如果是在 Windows 环境下，你可能需要用到 Windows API 什么的。但是在 xServer 下的 linux 系统当中，只需搭配一个 rofi 就可以很轻松地呼唤出一个高可定制的菜单。呼唤菜单的常用方式如下：

```bash
echo "选项一\n选项二\n选项三\n选项四" | rofi -dmenu -p "提示文本" -mesg "消息文本"
```

![Rofi 样例](rofi_menu.png)

如上图所示，该指令唤出了一个十分朴素的菜单。该菜单提供了我们指定的提示文本、消息文本、和选项列表。**当我们选中选项后，rofi 指令会将选项文本返回作为指令的返回值。**该值可以在 shell script 脚本中被获取并调用，这就为我们自定义电源管理界面的启动脚本提供了基础。

### 基础变量的赋值

```bash
# 主题文件的路径
dir="$HOME/.config/rofi/powermenu/"

# 部分提示信息：
host=$(hostname)                        # 主机名称
uptime=$(uptime -p | sed -e 's/up //g') # 登陆时长

# 选项列表
hibernate='󰂠' # 休眠
shutdown=''  # 关机
reboot='󰈐'    # 重启
lock=''      # 锁屏
suspend=''   # 挂起
logout='󰍃'    # 登出
yes=''       # 同意
no='󰜺'        # 取消
```

### 呼唤菜单的部分

### 执行操作的部分

## rofi 样式配置

## dunst 配置

## 最终成果展示
