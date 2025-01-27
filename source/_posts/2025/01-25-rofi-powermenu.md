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

这里，定义了电源界面采用的主题、要显示的信息（主机名称和登陆时长）以及可选的选项列表。**各个选项使用 utf-16 编码表示，实际上对应指定的 iconfont。**

```bash
# 主题文件的路径
dir="$HOME/.config/rofi/powermenu/" # 主题文件夹
theme="default"                     # 默认主题

# 部分提示信息：
host="$(hostname)"                        # 主机名称
uptime="$(uptime -p | sed -e 's/up //g')" # 登陆时长

# 选项列表
lock='\uf023'      # 锁屏
reboot='\uf021'    # 重启
shutdown='\uf011'  # 关机
hibernate='\uf186' # 休眠
suspend='\uf0f4'   # 挂起
logout='\uf08b'    # 登出
yes='\uf058'       # 同意
no='\uf057'        # 取消

# 同意符
confrim="$(echo -e $yes)"
```

这样，在字体支持的情况下，电源界面的各个选项就会以图标方式显示。想知道编码对应的图标，可以使用类似于 `echo -e "\uf057"` 的指令查看。

### 呼唤菜单的部分

#### 电源管理菜单

定义了两个函数。run 函数提供了选项列表。cmd 函数指定了 rofi 的提示信息和主题文件。

```bash
run_powermenu() {
  echo -e "$lock\n$reboot\n$shutdown\n$hibernate\n$suspend\n$logout" | powermenu_cmd
}

powermenu_cmd() {
  rofi -dmenu \
    -p "\uf007 $USER@$host" \
    -mesg "\uf017 已运行: $uptime" \
    -theme ${dir}/${theme}.rasi
}
```

#### 确认菜单

与“电源管理菜单”部分相同：定义了两个函数。run 函数提供了选项列表。cmd 函数指定了 rofi 的提示信息和主题文件。不同之处在于，这里通过 -theme-str 指定了少许样式。

```bash
run_confirm() {
  echo -e "$yes\n$no" | confirm_cmd
}

confirm_cmd() {
  rofi -theme-str "window {location: center; anchor: center; fullscreen: false; width: 350px;}" \
    -theme-str "mainbox {orientation: vertical; children: [ "message", "listview" ];}" \
    -theme-str "listview {columns: 2; lines: 1;}" \
    -theme-str "element-text {horizontal-align: 0.5;}" \
    -theme-str "textbox {horizontal-align: 0.5;}" \
    -dmenu \
    -p "确认界面" \
    -mesg "你确定吗？" \
    -theme ${dir}/${theme}.rasi
}
```

由于确认菜单在不同主题间高度可共享，将其部分样式指定放在脚本当中以让不同风格的电源管理界面可以共用一套确认菜单。这里的主题主要指定了确认菜单应该以如图所示的方式呈现：

![确认菜单](confirm_menu.png)

该菜单的配色是由给定的主题文件（也就是 `${dir}/{theme}.rasi`）指定的。这样一来，它将会与电源管理菜单的配色风格保持一致。因此，多重主题的电源管理界面将会共享相似但配色方案不同的确认菜单。

### 执行操作的部分

```bash
# 关机操作
shutdown_action() {
  isconfirm="$(run_confirm)"
  if [[ $isconfirm == $confirm ]]; then
    systemctl poweroff
  fi
}

# 重启操作
reboot_action() {
  isconfirm="$(run_confirm)"
  if [[ $isconfirm == $confirm ]]; then
    systemctl reboot
  fi
}

# 休眠操作
hibernate_action() {
  isconfirm="$(run_confirm)"
  if [[ $isconfirm == $confirm ]]; then
    systemctl hibernate
  fi
}

# 挂起操作
suspend_action() {
  isconfirm="$(run_confirm)"
  if [[ $isconfirm == $confirm ]]; then
    mpc -q pause
    amixer set Master mute
    systemctl suspend
  fi
}

# 登出操作
logout_action() {
  isconfirm="$(run_confirm)"
  if [[ $isconfirm == $confirm ]]; then
    dwm_pid="$(pidof -s dwm)"
    if [[ -n $dwm_pid ]]; then
      kill -TERM $dwm_pid
    fi
  fi
}

# 锁屏操作
lock_action() {
  if [[ -x '/usr/bin/i3lock' ]]; then
    i3lock
  fi
}
```

## rofi 样式配置

## dunst 配置

## 最终成果展示
