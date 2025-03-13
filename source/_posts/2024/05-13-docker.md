---
layout: post
title: 科学上网：利用 Docker🐳  搭建 v2raya 客户端
date: 2024-05-13 00:08:04
categories:
    - 🔧 工具使用
tags: [Docker, v2raya, 科学上网]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00006.jpg
---

# 科学上网：Docker + v2raya

自 2023 年 11 月 2 日 Fndroid 在推特发布停止更新 CFW(Clash For Windows) 的消息至今，已经将近半年了。由于我本人经常在 linux 系统下工作，CFW 对我的影响不大，所以仍然使用了较长时间的 clash。但就个人体验来说，clash 还是存在许多不方便的地方，因此在前段时间我还是切换到了 v2ray。

对我来说，使用 v2raya 主要具有以下方便之处：

- 使用 Docker 搭建，开箱即用；
- 透明模式，自动切换代理/非代理模式；
- 成熟的 UI 界面。

这篇博客主要讲述如何使用 Docker 搭建 v2raya 客户端，包括 linux 环境下 docker 的安装及本地配置，以及如何创建 v2raya 的虚拟容器。

## 前期准备：Docker

我们首先需要在 PC 上安装 docker，它的应用场景异常广泛，且功能十分强大，几乎成为业界人士都需要安装的工具。

### 更换镜像及安装

对于 ArchLinux 来说，pacman 的镜像源列表通过文件 /etc/pacman.d/mirrorlist 来管理。因为文件按从头至尾的顺序优先级，所以如要使用清华园镜像，只需要将以下两行代码置于文件首两行。关于换源更详细的说明，可以查看 [tuna 清华开源软件镜像站](https://mirrors.tuna.tsinghua.edu.cn/help/archlinux/)。

```txt
Server = https://mirrors.tuna.tsinghua.edu.cn/archlinux/$repo/os/$arch
Server = https://mirrors.ustc.edu.cn/archlinux/$repo/os/$arch
```

确认使用清华源后，可以通过如下命令方便地安装 docker，pacman 会自动解决其依赖。由于 pacman 是直接下载二进制文件，不经过编译，为确保软件可用，应该在安装 pacman 前更新系统。

```bash
sudo pacman -Syyu
sudo pacman -S docker
```

### 启动 Docker 守护进程

docker 采用经典的 C/S 架构，这意味着如果你想要使用 docker，首先需要在系统后台启动一个 server 进程（也即守护进程，daemon）。 **如果不启动该 daemon 就尝试用 docker 拉取镜像快照或者构建虚拟容器的话，你应当会遇到以下报错：**

```bash
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

通常来说，这个问题可以通过 **systemctl start docker** 来解决，然而为避免每次电脑重启后都需要运行这条指令，好的方法是设置 Docker 开机自动启动。

```bash
systemctl enable docker
```

这条指令会创建一条链接： /etc/systemd/system/multi-user.target.wants/docker.service → /usr/lib/systemd/system/docker.service。这里在 multi-user.target.wants 下创建了 docker.service，它指向 /usr/.. 下的 docker.service，会在电脑开机时自动启动。运行完该指令后之后记得重启电脑确保 daemon 启动。重启后可通过 **systemctl status docker** 来查看 docker.service 是否启动。

### 将工作用户加入 docker 组

docker 仅允许在 docker 组内的用户使用，而 docker 组是由 pacman 方式自动建立的，我们不需要自己添加 docker 组。在不做任何设置的情况下，docker 组内只有 root 用户，为避免总是使用 root 用户操作 docker，建议把当前工作用户加入 docker 组。

```bash
sudo gpasswd -a $USER docker
reboot  #重启后生效
```

### 配置 Docker 镜像

完成上述工作后，正常来说就能够使用 docker 了。鉴于国内网络问题，每次使用 docker pull 命令 pull 镜像时，docker daemon 都会去 docker Hub 拉取镜像快照，十分缓慢，建议配置国内镜像加速。我们可以使用中科大的镜像源来加速，相比阿里云公开免费。详细说明可在 [科大镜像帮助：Docker Hub](https://mirrors.ustc.edu.cn/help/dockerhub.html) 查看，这里简要叙述做法。

1. 首先确保具有 /etc/docker 文件夹，如果没有则创建一个。
2. 编写 daemon.json 文件，内容如下：

```json
{
	"registry-mirrors": ["https://docker.mirrors.ustc.edu.cn"]
}
```

3. 将 daemon.json 移动到 /etc/docker 文件夹下：**sudo mv daemon.json /etc/docker**
4. 重新启动 docker 的守护进程： **systemctl restart docker**
5. 运行 **docker info** 来查看当前 docker 的状态，如果其中包含 Registry Mirrors 字段，且值为 https://docker.mirrors.ustc.edu.cn ，就证明换源成功。

## 构建 v2raya 容器

至此我们终于在电脑上安装了一个方便可用的 docker 工具，接下来可以着手构建 v2raya 容器了。关于使用 docker 启动 v2raya 的详细说明可以参考： https://v2raya.org/docs/prologue/installation/docker/ 。

### 创建容器

首先获取 v2raya 的镜像快照，该快照中集成了v2raya 的内核，因此无需重新额外安装。

```bash
docker pull mzz2017/v2raya
```

之后使用如下命令来运行一个 v2raya 后端。docker 的好处就在于以下的命令可以直接复制运行，而无需考虑宿主系统，因为 docker 构建的虚拟容器是与宿主系统相对隔离的。
然而请注意：这里的各项环境变量：V2RAYA_LOG_FILE, V2RAYA_V2RAY_BIN, V2RAYA_NFTABLES 和 IPTABLES_MODE 都最好不要改变，除非你非常清楚其含义。

```bash
docker run -d \
  --restart=always \
  --privileged \
  --network=host \
  --name v2raya \
  -e V2RAYA_LOG_FILE=/tmp/v2raya.log \
  -e V2RAYA_V2RAY_BIN=/usr/local/bin/v2ray \
  -e V2RAYA_NFTABLES_SUPPORT=off \
  -e IPTABLES_MODE=legacy \
  -v /lib/modules:/lib/modules:ro \
  -v /etc/resolv.conf:/etc/resolv.conf \
  -v /etc/v2raya:/etc/v2raya \
  mzz2017/v2raya
```

运行完成之后，可以通过如下命令来查看容器状态。由于在上述指令中指定了 --name v2ray，因此容器的名字被设置为 v2ray 了。

```bash
docker container status v2ray
```

要启动该容器或关闭该容器，只需要使用如下命令：

```bash
docker restart v2ray # 启动容器
docker stop v2ray # 关闭容器
```

### 使用 v2raya

容器启动后，访问 http://localhost:2017 或者 http://127.0.0.1:2017 就可以进入 v2raya 的客户端 UI 界面。第一次进去会提示你注册用户。请牢记账号和密码，下次再进入时会提示你登入。

![登入界面](https://cdn.jsdelivr.net/gh/lazypool/blog-pics/blogpost/before2024/20240513_login.png)

登陆成功之后就可以导入订阅地址并开启负载均衡等服务了。记得开启透明代理模式，非常好用，相当推荐！关于 v2raya 的详细使用方法可以查看 [v2rayA 用户文档](https://v2raya.org/docs/prologue/introduction/)，文档比较好懂。总的来说，v2rayA 的实际操作比安装它要简单得多。

开启 v2ray 后你就开启了科学上网的生活，可以在国内正常使用 Google 搜索引擎、看 Youtube 视频、刷 Twitter 等。
