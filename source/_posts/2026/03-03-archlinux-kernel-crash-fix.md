---
layout: post
title: 一次 pacman 中断引发的内核崩溃与修复记录
date: 2026-03-03 13:51:23
tags:
    - Archlinux
    - DWM
    - pacman
    - 内核
    - 系统修复
categories:
    - 📢 技术杂谈
    - 纠错日常
index_img: animals/00029.jpg
---

# 一次 pacman 中断引发的内核崩溃与修复记录

> lazypool：不要随便中断 pacman，真的会很麻烦😢

## 事故起因

前天在更新 Arch Linux 系统时，我习惯性地用[我自制的 DWM](https://github.com/lazypool/dwm)状态栏的脚本调用终端运行 `pacman -Syu`。这是因为我的状态栏脚本提供了点击某个模块就可以打开一个终端并运行一条指令的功能，其中有一个就是打开终端后运行 pacman 指令。之前，为了保持桌面整洁，我的脚本逻辑是：当点击打开新的终端时，会先 `kill` 掉同类的其他终端（比如 htop、fetch 等），包括 pacman 终端。

那天我可能操作不当，在 pacman 正在更新内核的时候，我点击了其他模块，触发了脚本中的这一行：

```shell
kill "$(pgrep -f 'st -t statusutil_pacman')"
```

这直接把 pacman 终端给杀了。当时没在意，以为再运行一遍 pacman 就行了。

结果第二天开机就悲剧了……

## 灾难降临

第二天启动电脑，引导进入内核时直接报错：

```txt
error: file '/vmlinuz-linux-lts' not found.
Loading initial ramdisk ...
error: you need to load the kernel first.

Press any key to continue......
```

然后再按什么键都会推出到 grub 界面，怎么也启动不了系统。在技术交流群里问了一些资深的大佬，他们说是因为启动需要这个叫做 `/vmlinux-linux-lts` 的文件，它一般在 `/boot` 下。现在报错是因为找不到这个文件。

## 原因排查

**我在 grub 界面按 c 进入了命令行界面，我想看看我的启动文件都去了哪里。**首先我输入 `ls`，发现有四个分区 (hd0)、(hd0,gpt1)、(hd0,gpt2)、(hd0,gpt3)。其中，(hd0) 是全部硬盘，(hd0,gpt1) 是启动分区，(hd0,gpt2) 是根分区，(hd0,gpt3) 是交换区。**我之前安装这个系统时，将 boot 设为了独立分区，所以在没挂载的情况下，根分区的 /boot 是空的。**我看了下启动分区的文件，输入 `ls (hd0,gpt1)/`，结果如下：

```txt
intel-ucode.img efi/ grub/
```

_What? 只有这三个玩意？_ 正常情况下还会有很重要的另外三个文件：`initramfs-linux-fallback.img`, `initramfs-linux.img`, `vmlinuxz-linux`。

- vmlinuxz-linux 被压缩的内核，没它系统跑不了
- initramfs-linux.img 初始内存文件系统，包含内核启动初期必须的驱动
- initramfs-linux-fallback.img 回退文件，关键时刻能救命

看样子我的内核被错误的删除了，多半是因为 **之前利用 pacman 更新时，把旧的内核删除后，还没来得及安装新的内核就把它中断了。**

知道了原因，接下来就着手修复吧！

## 修复过程

### 制作启动盘

首先我得制作一个启动磁盘，这一步和安装 archlinux 一样。我得到 [Arch 的 download 界面](https://archlinux.org/download/) 找中国的镜像源下载镜像。这里推荐使用清华大学的 tuna 镜像，质量有保障。

![清华大学开源软件镜像站](tuna-tsinghua-mirror.png)

下载其中的 iso 文件，在本地手动进行 sha256 校验，然后拷入一个配备了 Rufu 或其他系统镜像管理器的 U 盘。~（轻车熟路）~

### 进入 LiveCD 终端

把 U 盘插到坏掉的电脑上，在开启电脑的时候狂按 f12，或者是 f2、f6，我一般都按。选择用 U 盘启动就能进入 LiveCD 界面了。

> 我在这里遇到了一个比较坑的地方：
> 因为我的 U 盘使用的是比较老版本的 Ventory，它不支持新的 Normal 模式。
> 所以当他问选择 『Normal Boot Mode』 还是 『Grub2 Boot Mode』 的时候要选后者。

当终端出现 archiso 的提示符就证明进入 U 盘的系统了！

### 联网

使用 `iwctl` 联网的过程如下：

- `iwctl` 进入 iwd 交互界面
- `device list1 查看可用设备（比如 wlan0）
- `stateion wlan0 scan` 进行扫描
- `stateion wlan0 connect [网络名称]` 来联网

联网成功后，使用 `ping baidu.com` 来检测网络的连通性。

### 挂载分区和必备文件

首先使用 `fdisk -l` 来查看你的根分区和引导分区。比如我的根分区在 `/dev/nvme0n1p2`，而我的引导分区在 `/dev/nvme0n1p1`。不同设备不一样。

知道分区后就可以开始挂载分区和系统文件了。需要挂载的系统文件包括 /sys, /dev, /proc 三个文件。

```shell
mount /dev/nvme0n1p2 /mnt # 根分区
mount /dev/nvme0n1p1 /mnt/boot # 引导分区
mount /sys /mnt/sys # 系统
mount /dev /mnt/dev # 设备
mount /proc /mnt/proc # 进程
```

### chroot

挂载完成后，先记得将 `/etc/resolv.conf` 复制到挂载的系统的 /etc 下。不然 chroot 之后连不了网，pacman 没用。

- 输入 `chroot /mnt` 登入挂载的系统。
- 然后 `pacman -S linux` 安装丢失的内核。_就这么简单！_

最后使用 umount 将挂载的分区卸载（不卸载问题也不大）。然后使用 `reboot`，应该就能够正常登入之前登不进去的系统了！

## 教训与改进

这次事故的直接原因是状态栏脚本中暴力 kill 了 pacman 终端。虽然初衷是避免打开过多终端窗口，但这种做法在涉及系统更新的操作中极其危险。更新过程中的原子性必须得到保证，强行中断很可能导致文件不一致甚至系统无法启动。

于是我修改了 statusbar.sh 脚本，去掉了所有 kill "$(pgrep -f 'st -t statusutil_pacman')" 的行，只保留对其他非关键终端（如 htop、fetch）的清理。这样 pacman 终端只能由用户主动退出，不会再被脚本意外杀死。

这次经历让我深刻体会到：**系统更新时必须保证原子性，绝不能随意中断。**同时也提醒我，任何自动化脚本在涉及关键系统操作时都要格外谨慎，宁可让用户手动关闭，也不要自作主张地强制终止。
