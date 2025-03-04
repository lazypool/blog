---
layout: post
title: 从零入门 cuda 编程？🦴 看这篇就够了！
categories:
  - 💻 抠点代码
tags: [cuda 编程, 并行程序]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/dog0.png
date: 2025-02-23 22:12:23
---

# 实录：从零开始接触 cuda 编程 🐟

在写这篇博客之前，我还从来没有深入过 cuda 底层，最多只是在做深度学习的时候会用到它。本学期，学习了《并行程序设计原理》一课，觉得是时候向这个领域发起挑战了。其实，如果单单是将 cuda 当成一种应用编程 API，那只要会用就可以了。然而我不想止步于此，我还想搞懂原理，搞清楚背后的逻辑，从“知其然”到“知其所以然”！

- GPU 与 CPU 之间是怎样传递数据的？
- 限制并行能力的 PCle 总线是怎样的？ 🤔
- cuda 的硬件模型和概念模型是啥样的？
- 编译出来的机器码加了哪些“科技与狠活”？……

## 从抽象到具体，逐步驱散 CUDA 认知迷雾

CUDA（Compute Unified Device Architecture）统一计算设备架构，是由 nvidia 在 2007 年发布的一个新的硬件和软件架构，时至今日已历经十几年演进。 **在当时，它的诞生统一了图形和非图形应用借助 GPU 进行并行计算的方式**，成功使 nvida 的显卡大卖。然而，nvidia 在 linux 系统下的显卡驱动支持一直存在不足，这导致了 linux 用户对 nvidia 的不满情绪，也引发了 “FUCK YOU! NIVDIA!” 事件 😅……

### 部分基础知识：CUDA 的软件堆栈和内存读写

**软件堆栈 (software stack)** CUDA 的软件堆栈由多层组成，从高到底依次是： 1. 应用程序编程接口 (API) &ensp;&ensp; 2. 两个高级的通用数学库 ( CUFFT 🔧 , CUBLA 🧮 ) &ensp;&ensp; 3. 运行时依赖 (Runtime) &ensp;&ensp; 4. 硬件驱动程序 (Driver) ⚙  。其中，CUDA API 和两个高级库像是 C 语言的扩展，以便最小化学习的时间。硬件被设计成支持轻量级的驱动和 Runtime 层面，因而提高性能。

![CUDA 软件堆栈](0223_cuda-software-architecture.png)

**内存读写 (DRAM read/write)** CUDA 最富有意义的设计是其允许 GPU 对 DRAM 进行读写，从而使 GPU 成为可以辅助 CPU 计算的 **协同处理设备**。读写内存的方式有：**寻址**、**缓冲** 和 **共享内存** 。 (1) **CUDA 提供一般 DRAM 内存寻址方式：“发散” 和“聚集”内存操作**，从而提供最大的编程灵活性。从编程的观点来看，它可以在 DRAM 的任何区域进行读写数据的操作，就像在 CPU 上一样。 (2) **CUDA 还允许并行数据缓冲或者在 On-chip 内存共享**，可以进行快速的常规读写存取，在线程之间共享数据。

### 详解 CUDA 架构：软件层和硬件层相结合

通常，我们约定 📚：把 CPU 所在的系统称作 **主机 (host)** ， 而把 GPU 称作 **设备 (device)** 。当使用 CUDA 进行编译时，GPU 可被看成 **能够执行大量并行线程** 的计算设备，它作为主 CPU 的协处理器来工作。也就是说，那些原本在主机上运行的 **并行数据处理** 和 **高密度计算的应用程序部分**，将被卸载到 GPU 这个设备上执行 💼。

![CUDA 架构：软件层和硬件层](0223_cuda-architecture.png)

CUDA 的架构包括软件层和硬件层。软件层包括：**线程 (thread)**，**线程块 (block)** 和 **网格 (grid)** 。硬件层包括：**CUDA 核心** (或称流处理器，也即 SP)，**流式多处理器 (SM, streaming multiprocessor)** 和 **GPU**。除这些以外，还有 **线程束 (warp)** 这个极其重要但常被忽视的组件，它充当沟通硬件层和软件层的桥梁。CUDA 的整体架构如上图所示。

#### 线程和 CUDA 核心：最小的基本运算单位

| GPU term | Quick definition for GPU |
|-|-|
| thread&emsp;&emsp;&emsp;&emsp; | The stream of instructions and data that is assigned to one CUDA core; note, a Single Instruction applies to Multiple Threads, acting on multiple data (SIMT). |
| CUDA core | Unit that processes one data item after another, to execute its portion of a SIMT instruction stream. |

**线程 (thread)** 🧶 不是实物，而是对计算机中 **程序执行流** 的形象比喻，它由 **指令流** 和 **数据流** 交织构成，是 GPU/CPU 通用的原子级概念。CUDA 为线程分配 **寄存器**，以存储临时变量和中间计算结果。此外，CUDA 还允许线程获取全局内存的部分地址充当数据栈 (stack)，用于存储寄存器溢出的内容。最后，在 CUDA 中，线程按束调度： **同束线程共享相同的程序计数器** ，它们同步地执行相同的指令，作用于各自寄存器存储的数据。

![CUDA 核心](0223_cuda-core.png)

**CUDA 核心**，又称 **流处理器 (SP, streaming processor)** ，是 CUDA 中执行标量运算指令的基本单元，其核心组件是 **整数运算单元 (INT Unit)** 和 **浮点数运算单元 (FP Unit)** 。CUDA 核心和线程相对应：**单个 CUDA 核心执行来自单个线程的指令** 。与线程相同，CUDA 核心同样以束为单位调度： **同束核心在同一时刻执行相同的指令** ，但作业于不同的寄存器。&emsp;🪶 这里，我们特别指出：这种 **多个线程在同一时刻执行相同的指令，但作用于不同的数据** 的并行方式，即所谓的 **单指令多线程 (SIMT, Single Instruction MultiThread)** ，这也是 CUDA 所使用的方式。

#### 线程束：连接软件层和硬件层的纽带

在介绍线程和 CUDA 核心的时候我们已经了解：真正执行并行操作的单位是 **线程束 (warp)** ，它按照 SIMT 方式执行并行。

#### 线程块和流式多处理器：组织和管理调度

#### 网格和 GPU：CUDA 架构中最顶级的单位

## kernel：理解 cuda 的关键

## 部分 C 式应用编程 API
