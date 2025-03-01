---
layout: post
title: 从零入门 cuda 编程？🦴 看这篇就够了！
categories:
  - 💻 抠点代码
tags: [cuda 编程, 并行程序]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/dog0.png
date: 2025-02-23 22:12:23
---

# 实录：从零开始接触 cuda 编程

在写这篇博客之前，我还从来没有深入过 cuda 底层，最多只是在做深度学习的时候会用到它。本学期，学习了《并行程序设计原理》一课，觉得是时候向这个领域发起挑战了。其实，如果单单是将 cuda 当成一种应用编程 API，那只要会用就可以了。然而我不想止步于此，我还搞懂原理，搞清楚背后的逻辑，从“知其然”到“知其所以然”！

- GPU 与 CPU 之间是怎样传递数据的？
- 限制并行能力的 PCle 总线是怎样的？ 🤔
- cuda 是怎样管理和调度 GPU 资源的？
- 编译出来的机器码加了哪些“科技与狠活”？……

## 从底层到抽象：软件堆栈、内存读取、概念模型

CUDA（Compute Unified Device Architecture）统一计算设备架构，是由 nvidia 在 2007 年发布的一个新的硬件和软件架构，时至今日已历经十几年演进。 **在当时，它的诞生统一了图形和非图形应用借助 GUP 进行并行计算的方式**，成功使 nvida 的显卡大卖。然而，nvidia 在 linux 系统下的显卡驱动支持一直存在不足，这导致了 linux 用户对 nvidia 的不满情绪，也引发了 “FUCK YOU! NIVDIA!” 事件 😅……

### 部分基础知识：CUDA 的软件堆栈和内存读写

**软件堆栈 (software stack)** CUDA 的软件堆栈由多层组成，从高到底依次是： 1. 应用程序编程接口 (API) &ensp;&ensp; 2. 两个高级的通用数学库 ( CUFFT 🔧 , CUBLA 🧮 ) &ensp;&ensp; 3. 运行时依赖 (Runtime) &ensp;&ensp; 4. 硬件驱动程序 (Driver) ⚙  。其中，CUDA API 和两个高级库像是 C 语言的扩展，以便最小化学习的时间。硬件被设计成支持轻量级的驱动和 Runtime 层面，因而提高性能。

![CUDA 软件堆栈](0223_cuda-archtecture.png)

**内存读写 (DRAM read/write)** CUDA 最富有意义的设计是其允许 GPU 对 DRAM 进行读写，从而使 GPU 成为可以辅助 CPU 计算的 **协同处理设备**。读写内存的方式有：**寻址**、**缓冲** 和 **共享内存** 。

1) **CUDA 提供一般 DRAM 内存寻址方式：“发散” 和“聚集”内存操作**，从而提供最大的编程灵活性。从编程的观点来看，它可以在 DRAM 的任何区域进行读写数据的操作，就像在 CPU 上一样。
2) **CUDA 还允许并行数据缓冲或者在 On-chip 内存共享**，可以进行快速的常规读写存取，在线程之间共享数据。

### CUDA 的概念模型：线程、块、网格

通常，我们约定 📚：把 CPU 所在的系统称作 **主机 (host)** ， 而把 GPU 称作 **设备 (device)** 。当使用 CUDA 进行编译时，GPU 可被看成能够执行大量并行线程的计算设备，它作为主 CPU 的协处理器来工作。简言之，那些原本在主机上运行的 **并行数据处理** 和 **高密度计算的应用程序部分** ，将被卸载到 GPU 这个设备上执行。 **为了方便管理这些线程，CUDA 将它们分批，若干个线程组成一个块 (block)，而若干个块组成一个网格 (grid)。**

#### 线程：执行运算调度的最小单位

*什么是线程 (thread)？* **线程是指操作系统能够进行运算调度的最小单位，它在单时钟周期内执行单次计算操作。** 线程由单处理器 _(单线程)_ 、多处理器 _(多线程)_ 或者多核处理系统并发地执行。在执行过程中，有四种基本状态：产生 (spawn)、阻塞 (block)、非阻塞 (unblock)、结束 (finish)。每个线程都有其自己的 **程序计数器 (program counter)**、**寄存器 (register)** 和 **数据栈 (stack)** ，**这些部件组成一个 CUDA 核心 (或称 ALU、SP)** 。在多线程的情况下，各线程共享代码、数据和文件。

![比较单线程和多线程](https://www.cs.uic.edu/~jbell/CourseNotes/OperatingSystems/images/Chapter4/4_01_ThreadDiagram.jpg)

#### 块：从概念到硬件的映射

*什么是块？* **块 (block)，即线程批，在概念上是若干线程的组合，在硬件上是流式多处理器 (SM, Streaming Multiprocessor)。** 将一定数量的线程按二维或三维的方式排列便得到了块。譬如，将 $D_x \times D_y$ 个线程排列成二维矩阵 $[D_x, D_y]$，我们便称这个矩阵是一个块。在例子所举的这个块中，坐标位于 $(x, y)$ 的线程，其编号为 $x + yD_x$。如果块是三维矩阵 $[D_x, D_y, D_z]$， 那么坐标为 $(x, y, z)$ 的线程，其编号是 $x + yD_x + zD_xD_y$ 。如图所示：

<div align="center"><img style="height: 388px; width: 666px; object-fit: cover; object-position: 0px -422px;" src="https://upload.wikimedia.org/wikipedia/commons/5/5b/Block-thread.svg"/><p style="color: gray; font-size: 14px;">线程编号与块的位置关系：二维</p></div>

*为什么要分块？*

## kernel：理解 cuda 的关键

## 部分 C 式应用编程 API
