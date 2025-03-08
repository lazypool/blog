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

| GPU term | Quick definition for GPU |
|-|-|
| warp&emsp;&emsp;&emsp;&emsp; | Group of 32 threads that executes the same stream of instructions together, on different data. |

在介绍线程和 CUDA 核心时，我们已经了解到：**线程束 (warp) 🧵 是真正执行并行操作的单位，它按 SIMT 方式运作，单个线程束通常由 32 个线程组成。**  _为什么说线程束是连接软件层和硬件层的纽带呢？_ 这主要体现为它在执行过程中的衔接作用：宏观上看， **软件层面开发者定义的线程块，通过线程束这一执行单元映射到硬件层面上的 SM。** 具体来说，每个线程块在加载到 SM 时，会被划分为若干束，而这些束正是 SM 的实际调度单位。另一方面，从微观上说：**线程束既可看作若干线程的集合，又可看作若干 CUDA 核心的组合。** 应该说，线程束是我们理解 CUDA 编程的最重要的概念模型之一。

**以线程束为单位进行调度是很有实际意义的。** 试想如果所有的线程都各自为政，那么它们在读写共享内存时就可能出现 **读写竞争 (Data Race)** 💢 的问题。此时，获取不到同步锁 🔒 的线程就只能死等，严重拖慢了程序运行。为了在并行能力和同步机制之间寻找平衡点，**CUDA 将成百上千的线程以 32 个为一组划分成若干个线程束**，这样做的逻辑是：

**同一束中的线程共享内存，在运行过程中保持并行，仅在必要时同步。** 由于束内线程数较少（32 个），因此同步的时间开销是可以接受的。 **线程束的共享内存实际上作为缓存，用于缓存本束的计算结果，然后再上传。** 对这些束的计算结果进行同步汇总的时间也是可接受的。由此，我们也可以知道 CUDA 计算的时间开销可按如下公式计算：

$$总时间成本 = 核心计算的时间 + 束内线程同步的时间 + 对各个束进行同步的时间$$

最后，简单讲一下 **线程束的分化** 。如下图所示，**起初，同束线程“齐头并进”，但一旦遭遇 if 分支，它们便“分道扬镳”了。** 我们说，同束线程执行时会被分配相同的指令，但处理各自的数据。如果它们在执行过程中遇到不同的控制条件，就会面临不同选择 😕，导致线程束分化。 **同束线程执行不同指令就叫做线程束分化。** 线程束分化会产生严重的性能下降。条件分支越多，并行性削弱越严重。因此，应尽量避免同束内线程分化，确保线程分配到线程束是有规律的而不是随机的。

![线程束分化示意图](./0223_cuda-warpbranches.png)

#### 线程块和流式多处理器：对 kernel 的组织和管理调度

| GPU term | Quick definition for GPU |
|-|-|
| kernel | Function that runs on the device; a kernel may be subdivided into thread blocks. |
| thread block | Group of threads organized in 1D, 2D, or 3D dimensions that share memory and synchronize execution. |
| SM, streaming multiprocessor | Unit capable of executing a thread block of a kernel; multiple SMs may work together on a kernel. |

**线程块 (thread block)** 🧊 是对许多线程的概念抽象，它将数量繁多的线程按照 1 维、2 维或 3 维的方式组织，为开发者遍历、索引线程提供了极大方便。比线程块更高层的概念是 **网格 (grid)** 🥅，它将许多个线程块按照 1 维、2 维或 3 维的方式排列。由此，我们得到了 **网格-线程块-线程** 的线程层级概念划分，它有助于我们识别和管理各个线程。譬如下图左半部分，对于大小为 $(D_x, D_y)$ 二维线程块，其中索引为 $(x, y)$ 的线程的 **块内线程 ID** 应当是 $x + yD_x$ 。然而，由于线程块的维度和网格的维度能以各种方式组合，在不同组合下获取线程的全局 ID 或者块内 ID 仍然是一个复杂的问题。

![Kernel 批处理（左）与 CUDA 内存模型（右）](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgfwJ-XTFD3uN4CxFuFaUOOxF_YFA_1uUAVRWykrYSyrikT9ihmFyRyVXl-s7xZPnx1VGZTIln5MxL83fMearxY1fWc4RHQ7fbokHBgIJWTWi-lymFhYn3zRb64kk2PzugsJJVlzj1PoWI/s1600/gpu2.png)

**Kernel (核函数)** 🥜，特指在 GPU 设备上运行的函数<span style="font-size:xx-small;">（不是核方法里的那个核函数！）</span>，它指示了整个网格内所有线程的行为。程序运行期间，主机向设备连续地发送 kernel 调用的请求，每个 kernel 就作为一个由线程块组成的线程批处理来执行，如上图左半部分所示。单个 kernel 可能由多个线程块来执行，线程块通过快速的 **共享内存有效地分享数据** 并且在制定的内存访问中 **同步它们的执行** 。当然，我们应当清楚： **这实际上是线程块将其交付给 SM，由 SM 划分为线程束并进行调度来实现的。**

理解了 kernel，我们再来深入一下 **CUDA 的内存模型**。前面我们提到，CUDA 允许设备上的线程以寻址、共享、缓冲的方式读取 DRAM 和 On-Chip 内存。**更具体的，如上图右半部分所示，执行在设备上的线程，只允许按如下方式读写内存**：1. 读写每条线程的寄存器和本地内存。 2. 读写每个块的共享内存。 3. 读写每个网格的全局内存。 4. 只读每个网格的常量内存和纹理内存。

![流式多处理器 SM 架构图](./0223_cuda-sm-architecture.png)

最后，我们进入到对 **SM (流式多处理器，Streaming Multiprocessor)** 的介绍。以 Fermi 为例，如上图所示，单个 SM 的完整组件应该包括：

## kernel：理解 cuda 的关键

## 部分 C 式应用编程 API
