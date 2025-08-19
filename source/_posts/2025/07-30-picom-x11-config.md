---
layout: post
title: picom 服务于 X11 协议的窗口渲染器
tags: [x11 ,picom ,compositor ,窗口渲染 ,动画特效]
categories:
  - 🔧 工具使用
  - Oh-my-Linux
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00020.jpg
date: 2025-07-30 15:48:21
---

# picom 服务于 X11 协议的窗口渲染器

如你所见，我是一名重度的 **dwm 依赖者**，而 dwm 本身并不提供诸如阴影、圆角、透明等的窗口渲染功能。因此一个常用的方法就是使用 picom，这是一个功能非常强大的渲染工具，B 站上也有很多教学视频。它和 X11 适配良好，其下有着多种分支~（由民间高手各显神通所创造）~，这里我选用 [Yuxuan Shui](https://github.com/yshui/picom) 的最新分支~（这应该是最“官方”、最纯净的）~。直到 2025 年，该分支仍然在被维护！

> 本博客写于 2025 年 7 月，主要参考 [picom 配置手册](https://picom.app/) 而编写

## X11 和 picom 的关系

picom 是为 X11 协议打造的独立 compositor (渲染器)，适合搭配那些不提供窗口渲染功能的 WM (Window Manager, 窗口管理器) 使用。它起先是 compton 的一个 fork，而 compton 则是 xcompmgr 的一个 fork…… _**(ArchWiki, picom)**_

**现代用户总是在追求一些视觉上的东西，添加一点特效和动画在你的窗口上就足以使你的桌面环境变得相当炫酷！** picom 就是为这个目的而打造的。在安装它之前，我们首先来理解一下它和 X11 之间的关系。相信我，这对于之后的理解是很有帮助的。

![Xorg 架构](x-architecture.webp)

- **X11 是一种通信协议，规定了客户端和服务端之间的通信标准**，如有哪些信号 Atom，以及这些信号都是什么含义。X11 出现相当早，早到 1987 年。
- X11 仅定义了标准，没有规范 X 的实现方式。而 **Xorg 则是基于此协议的桌面软件，提供了一组 API，各厂商只需对其调用即可**。
- Xorg 是典型的主从服务架构，如图所示，一台 Server 可以处理多个 Client 的桌面显示，而 Compositor 则来决定桌面的窗口长啥样。**这里的 Compositor 就是 picom 所处的位置。**

## 安装 XServer, dwm 和 picom

抛开那些久远的历史轨迹不谈，我们来安装 X11 和 picom！通常，picom 需要搭配一个不自带 compositor 的 WM 使用，这里我以 dwm 为例子。首先，运行如下指令安装 XServer 和 dwm。

```bash
sudo pacman -S xorg dwm
```

运行这行指令会询问你安装 xorg 的哪些组建，方便起见全都安装，到时候 xorg 会根据你的硬件自动选择驱动程序。这里简要提及一下 X11 的固有缺陷：

**由于 X11 采用主从式架构，Server 和 Client 间存在频繁的信息传输，且数据流易被键盘录入等其他程序拦截，处理器和显示器存在频率差异，容易导致画面的垂直撕裂。**然而，经过多年的发展，该问题已经被大部分桌面环境和 GPU 驱动程序规避了！👏（除了 Nvidia，`Fuck you! Nvidia`）

```bash
git clone git@github.com:yshui/picom.git
cd picom
meson setup --buildtype=release build
ninja -C build
```

安装 picom 时建议按照上述方式，手动 build 和 install，这样可以避免许多的版本兼容问题。运行最后一行命令时，记得切换为 root 用户，或者提供 sudo 权限。将 `exec dwm` 写入 `~/.xinitrc`，这样每次运行 `startx` 时都可以开启 dwm 界面。

## picom 的使用方式

接下来该使用 picom 了，运行 `picom` 指令，你即能看到默认配置的渲染效果（约等于几乎没有渲染）。默认的配置文件位于 `/etc/xdg/picom.conf`。通常，picom 会优先找寻 `~/.config/picom/picom.conf` 配置文件，否则再去找寻默认的配置文件。因此，你可以通过修改 `~/.config/picom/picom.conf` 内容来控制 picom 的行为，但更通用的做法是在运行 picom 是通过选项 `--config` 制定配置文件的路径。

```bash
picom --config 'path/to/picom.conf'
```

picom 的配置粒度非常细，可以在配置文件中指定 **部分基础视觉设置**（如圆角、阴影、透明、模糊、淡入淡出），还可按照特定规则 **匹配各种窗口类型** 并指定专用于该窗口类型的设置，甚至可以自定义 **窗口开启、关闭、隐藏、显示、移动时的动画特效**。🚚

### 部分基础设置

```picom.conf
# 基础
backend = "glx";
vsync = true;

# 窗口检测
detect-client-leader = true;
detect-client-opacity = true;
detect-transient = true;
detect-rounded-corners = true;
```

- **backend** + **vsync**
    指定渲染后端，可选 `xrender` 和 `glx`。前者更稳定但效率极低，通常选择后者。开启垂直同步。
- **detect-client-leader**
    检测窗口的 WM_CLIENT_LEADER 以保证同组窗口在同一时刻被同时 focused/unfocused。
- **detect-client-transient**
    用法与上类似，主要是检测瞬时窗口，如弹出的提示框、悬浮框等。
- **detect-client-opacity**
    检测窗口的 _NET_WM_WINDOW_OPACITY，避免对默认半透明的窗口施加透明渲染。
- **detect-rounded-corners**
    检测窗口是否本身具有圆角属性，避免对形变窗口继续施加形变。

### 通用的视觉设置

```picom.conf
# 阴影
shadow = false;
shadow-radius = 12;
shadow-offset-x = -15;
shadow-offset-y = -15;
shadow-opacity = 0.0;

# 圆角
corner-radius = 10.0;

# 淡入淡出
fading = true;
fade-in-step = 0.02;
fade-out-step = 0.02;

# 模糊
blur-method = "dual_kawase";
blur-strength = 3;
blur-kern = "3x3box";
```

- **阴影 (shadow)**
    使窗口更加立体化，部分喜欢平面化设计的用户 ~(比如我)~ 会选择禁用它。
    `shadow-radius 阴影的尺寸，单位是像素。`
    `shadow-offset-x/y 阴影的偏移，可以选择阴影显示的地方。`
    `shadow-opacity 阴影的不透明度，可以对阴影施加透明化效果。`

- **圆角 (corner)**
    使窗口四个角圆化，通常作为现代用户的默认喜好。
    `corner-radius 圆角的尺寸，单位是像素，可被 rules 覆盖。`

- **淡入淡出 (fading)**
    当窗口开启或显示时，窗口逐渐由完全透明变得不透明。当窗口关闭或隐藏时，则相反。
    `fade-in/out-step 窗口淡入淡出时，每步窗口透明度增加或减小的量。`
    `fade-delta 窗口淡入淡出时，每步所耗费的时间，单位是毫秒，默认是 12。`

- **模糊 (blur)**
    当窗口半透明时，将桌面背景模糊化，形成类似于毛玻璃似的特效。
    `blur-method 模糊化方法，可选 none、gaussian、box、kernel、dual_kawase 五种。`
    `blur-size 模糊尺寸，gaunssian 和 box 需要，尺寸需要是单数。`
    `deviatioin 高斯偏差，gaunssian 模糊方法需要指定偏差，默认 0.840。`
    `strength 模糊强度，dual_kawase 需要，强度越高模糊力度越大。`
    `kernel 卷积核，kernel 需要，需要自行指定卷积核的大小和卷积矩阵的参数。`

### 匹配窗口类型的设置

详见 [picom 配置手册](https://picom.app/) 中的 **WINDOW RULES** 和 **FORMAT OF CONDITONS** 两节。

#### 窗口规则实际样例

```picom.conf
# 窗口规则
rules = (
# 基础透明度
	{ match = "!focused && !_NET_WM_WINDOW_OPACITY", opacity = 0.65 },
	{ match = "focused || group_focused || wmwin || override_redirect", opacity = 0.95 },
	{ match = "fullscreen", opacity = 1.00, corner-radius = 0.0 },

# 应用窗口配置
	{ match = "class_g = 'dwm'", opacity = 1.00, corner-radius = 12.0, fade = false },
	{ match = "class_g = 'fcitx'", opacity = 1.00, corner-radius = 0.0, fade = false },
	{ match = "class_g = 'obs'", opacity = 1.00, corner-radius = 0.0, fade = false },
	{ match = "class_g = 'Gimp'", opacity = 1.00, corner-radius = 0.0, fade = false },
	{ match = "class_g = 'Rofi'", opacity = 1.00, fade = false },

# 窗口类型设置
	{ match = "window_type = 'dock'", opacity = 1.00, blur-background = false },
	{ match = "window_type = 'desktop'", opacity = 1.00, blur-background = false },
)
```

picom 允许在配置文件中设置 **窗口类型特定的部分设置**，以覆盖前文所提及的通用设置，如上述样例所示。官方指南中，描述其具体的语法形式如下所示：

```picom.conf
rules = (
	{ match = "focused"; opacity = 1; },
	{ match = "name = 'firefox'"; shadow = true; },
	# ... and so on
)
```

#### WINDOW RULES 语法

rules 块中，包含若干个 `{}` 块，而每个 `{}` 块都需要包含 `match` 属性在内。在每个 `{}` 块中，可用的关键字如下。

- **match** 匹配窗口，按照特定的语法，语法规则将在下一节详述。
- **shadow** true 或 false，是否为被匹配窗口绘制阴影。
- **full-shadow** true 或 false，是否为被匹配窗口的不可见区域绘制阴影。
- **fade** true 或 false，是否使被匹配窗口拥有淡入淡出的效果。
- **opacity** 0.0-1.0，设置被匹配窗口的不透明度。
- **dim** 0.0-1.0，设置被匹配窗口的暗化程度。
- **corner-radius** 单位为像素，设置被匹配窗口的圆角大小。
- **blur-backgro*und** true 或 false，是否是被匹配窗口拥有模糊背景的效果。
- **invert-color** true 或 false，是否是被匹配窗口反色。
- **clip-shadow-above** true 或 false，是否防止被匹配窗口被阴影覆盖。
- **unredir** 用于控制被匹配窗口的重定向和非从定向行为，通常不用设置。
- **transparent-clipping** true 或 false，是否使被匹配的透明窗口裁剪而非混合被其覆盖窗口的内容。
- **shader** 指定被匹配窗口的着色器路径，只与 `dim` 和 `invert-color` 有关，通常不用设置。
- **animations** 定义被匹配窗口的动画脚本，动画脚本的语法将在下一章讨论。

#### 匹配规则语法

picom 利用特殊语法的字符串来匹配窗口，其语法形式如下所示：

```txt
Condition <- Term ('||' Term)*
Term <- Item ('&&' Item)*
Item <- '!'? Target '@'? ('[' Index ']')? (Operator Pattern)? | '(' Condition ')'
```

上述规则比较抽象，简单来说：**Condition** 由若干个 **Item**，由逻辑操作符 &&（and）和 ||（or）连接。 **&& 的优先级高于 ||。这两个运算符都是左优先的。括号可以用来提高优先级。**  如果 **Item** 具有前导非运算符（!），则该项的结果取反。

最后，我们注意到：每个 **Item** 都由 **Target**、\[**Index**\] 和 **Operator Pattern** 组成。其中，**Target** 是必须的，\[**Index**\] 和 **Operator Pattern** 则是可选的。⚠️（**Target** 可以是预定义的关键名，也可以是窗口的属性名，如 `_NET_WM_WINDOW_OPACITY` 等）。

**预定义的 Target**

- **x**、**y**、**x2**、**y2**、**width**、**height**、**widthb**、**heightb** 窗口左上/右下角坐标，窗口及其边框的宽高。
- **fullscreen** 当窗口为全屏是为真。其效果等价于窗口属性 `_NET_WM_STATE_FULLSCREEN`。
- **override_redirect** 窗口是否被重定向覆盖了。
- **argb** 窗口是否拥有 ARGB 视觉。
- **focused**、**group_focused** 窗口（或其所在的 group）是否被聚焦。
- **wmwin** 窗口是否看起来像窗口管理器自带的窗口，准确率不高。
- **bounding_shaped** 窗口是否拥有固定的边界形状（不是一般的正方形）。
- **rounded_corners** 窗口是否是默认圆角（隐含 bounding_shaped）。
- **window_type** 字面值，由窗口属性 `_NET_WM_WINDOW_***` 定义，包括 `desktop`、`dock` 等。
- **name** 窗口属性，name 由 `_NET_WM_NAME` 或 `_WM_NAME` 决定。
- **class_i**、**class_g** 窗口属性，分别是 `_WM_CLASS` 属性的第 1 项、第 2 项。
- **role** 窗口属性，由 `WM_WINDOW_ROLE` 决定。

如果要在客户端窗口上查找窗口属性，**Target** 后面可以跟一个可选的 `@`。否则将使用框架窗口。

**Index**

要查找的属性的索引号。例如，`[2]` 返回属性的第三个值。如果未指定，则隐式使用第一个值（索引 `[0]`）。使用特殊值 `[*]` 对所有可用的属性值使用逻辑 OR。**预定义的 Target 都没有多个值，所以不要对它们使用索引。**

**Operator Pattern**

定义 **Target** 将如何匹配，可省略。对于预定义 **Target**，省略 **Operator Pattern** 等价于写入 **!= 0**。对于非预定义 **Target**，省略 **Operator Pattern** 表示检查窗口属性的存在与否。

**Operator** 分为两类：`=`、`>`、`<`、`>=`、`<=` 以及它们的否定（加上 `!` 前缀）是第一类，搭配是数字的 **Target**；`=`（严格相等）、`*=`（子字符串匹配）、`^=`（开头匹配）、`%=`（glob 匹配）、`~=`（正则匹配），以及它们的**不区分大小写**的变体 `?=`、`?*=`、`?^=`、`?%=`、`?~=`，以及他们的否定是第二类，搭配是字符串的 **Target**。

**Pattern** 可以是一个整数，也可以是用单引号或双引号括起来的字符串。字符串支持 python3 风格的转义序列。布尔值被解释为整数，即写真等于 1，写假等于 0。

### 动画特效

详见 [picom 配置手册](https://picom.app/) 中的 **ANIMATIONS** 一节。

#### 动画特效实际样例

```picom.conf
animations = (
# 关闭及隐藏窗口
	{ triggers = ["close", "hide"];
		opacity = {
			curve = "linear";
			duration = 0.4;
			start = "window-raw-opacity-before";
			end = 0;
		};
		shadow-opacity = "opacity";
		scale-x = {
			curve = "cubic-bezier(0.25,0.8,0.25,1)";
			duration = 0.6;
			start = 1;
			end = 0;
		};
		scale-y = "scale-x";
		shadow-scale-x = "scale-x";
		shadow-scale-y = "scale-y";
	},

# 开启及展示窗口
	{	triggers = ["open", "show"];
		opacity = {
			curve = "cubic-bezier(0.25,0.8,0.25,1)";
			duration = 0.8;
			start = 0;
			end = "window-raw-opacity";
		};
		shadow-opacity = "opacity";
		offset-x = "(1 - scale-x) / 2 * window-width";
		offset-y = "(1 - scale-y) / 2 * window-height";
		scale-x = {
			curve = "cubic-bezier(0.25,0.8,0.25,1)";
			duration = 0.8;
			start = 0;
			end = 1;
		};
		scale-y = "scale-x";
		shadow-offset-x = "offset-x";
		shadow-offset-y = "offset-y";
		shadow-scale-x = "scale-x";
		shadow-scale-y = "scale-y";
	},

# 窗口缩放及移动
	{	triggers = ["geometry"];
		scale-x = {
			curve = "cubic-bezier(0.25,0.8,0.25,1)";
			duration = 0.8;
			start = "window-width-before / window-width";
			end = 1;
		};
		scale-y = {
			curve = "cubic-bezier(0.25,0.8,0.25,1)";
			duration = 0.8;
			start = "window-height-before / window-height";
			end = 1;
		};
		offset-x = {
			curve = "cubic-bezier(0.25,0.8,0.25,1)";
			duration = 0.8;
			start = "window-x-before - window-x";
			end = 1;
		};
		offset-y = {
			curve = "cubic-bezier(0.25,0.8,0.25,1)";
			duration = 0.8;
			start = "window-y-before - window-y";
			end = 1;
		};
		shadow-offset-x = "offset-x";
		shadow-offset-y = "offset-y";
		shadow-scale-x = "scale-x";
		shadow-scale-y = "scale-y";
	},
)
```

#### 常用选项

和 rules 一样，animations 块也由若干个 `{}` 块构成，每个 `{}` 中包含一个必须存在的选项 `triggers` 和部分可选的其他选项。animations 块中 `{}` 块中的常用选项列表如下。
*
- **triggers** 触发动画的窗口动作，可选值包括 `open`、`close`、`show`、`hide`、`increase-opacity`、`decrease-opacity`、`size`、`position`、`geometry`。
- **presets** 预设的动画脚本，可选值包括 `slide-in`、`slide-out`、`fly-in`、`fly-out`、`appear`、`disappear`、`geometry-change`。
- **offset-x/y**、**shadow-offset-x/y**、**opacity**、**blur-opacity**、**shadow-opacity**、**scale-x/y**、**shadow-scale-x/y**、**crop-x/y/width/height**、**saved-image-blend** 等，自定义窗口的形状变化，其值是一个 `timing function`。

#### Timing Function

Timing Function 是一个由 `{}` 块定义的时间变化函数，它包括 **start**、**end**、**duration**、**curve** 四个基本属性。Timing Function 描述一个数值的变化过程。

- **start** 和 **end** 数值变化的起点和终点，其值域范围取决于该 Timing Function 是用于窗口的哪个属性值的变化。如透明度的值域是 0.0-1.0。
- **duration** 数值变化的时间，时间越长，变化越慢，反之变化越快。
- **curve** 变化曲线，数值变化可以是线性的（linear，匀速的），也可以是非线性的（非匀速的）。非线性变化常用 `cubic-bezier` 实现。

#### 常量

在定义 Timing Function 时，我们有时候想要调用一些常量（如窗口的默认透明度，窗口的原本位置等），这些数值被以字面值常量的形式存储。

- **window-x/y**、**window-width/height** 窗口最终的 x，y，width，height。
- **window-x/y-before**、**window-width/height-before** 窗口之前的 x，y，width，height。
- **window-monitor-x**、**window-monitor-y**、**window-monitor-width**、**window-monitor-height**。
- **window-raw-opacity-before**、**window-raw-opacity** 窗口的透明度（变化之前和变化之后）。

> Tips：自行定义动画脚本实在是一个很繁琐的工作，为了偷懒，通常我会直接去 github 上看别人是怎么写的。~（小朋友不要学）~

## 其他非官方 picom 的分支

如之前所说，除了官方纯净版本的 Yuxuan Shui 的 Fork，picom 又诞生了许多分支（尽管他们实现了很多炫酷的功能，但维护的积极程度都不如原版）。这里简要介绍一下 picom 的其他 Fork，你不一定要用它们，但你可以试着对照他们实现你自己的 Fork！ ~(OMZ 这太耗时间了)~

- [**dccsillag/picom**](https://github.com/dccsillag/picom/tree/implement-window-animations) 基本上继承了原版 picom 的全部功能，并实现了相当丰富的预设动画。正在积极合并其他 Fork 的新功能。
- [**pijulius/picom**](https://github.com/pijulius/picom) 继承 dccsillag 的动画功能。新增工作区切换动画并提供更多动画类型，适合需要工作区动画的用户。目前该分支的更新已停滞。
- [**jonaburg/picom**](https://github.com/jonaburg/picom) 基于 Sandmark 分支和 Blackcapcoder 的动画代码。专注高刷新率屏幕优化（减少时间差，更平滑）。适合追求极致流畅感的用户。
- [**ibhagwan/picom**](https://github.com/ibhagwan/picom) 曾独家提供圆角和 dual_kawase 模糊。（该两项功能已被官方合并，因此该分支不再具有独特性）
- [**Tanish2002/picom**](https://github.com/Tanish2002/picom) 基于 ibhagwan 的圆角/模糊功能，新增 phisch 的过渡动画代码（窗口状态变化的动画）。依赖 ibhagwan 的过时功能，优先级较低。
