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

### CUDA 的软件堆栈：API、库、运行依赖、驱动

刚接触 CUDA 的初学者有一个误区，那就是把 CUDA 仅看作一个 C/C++ 的 API。如果从应用的角度来看，那确实是这样。但事实上，CUDA 是包含硬件和软件同时在内的一整套架构。

<table><tbody><tr><td>

在架构上，CUDA 的软件堆栈由多层组
成，从高到底依次是：

1) 应用程序编程接口 (API)
2) 两个高级的通用数学库
    - CUFFT 🔧
    - CUBLA 🧮
3) 运行时依赖 (Runtime) 
4) 硬件驱动程序 (Driver) ⚙
</td><td>
<img width=400 src="0223_cuda-archtecture.png">
</td></tr></tbody></table>

其中，CUDA API 和两个高级库像是 C 语言的扩展，以便最小化学习的时间。硬件被设计成支持轻量级的驱动和 Runtime 层面，因而提高性能。

### CUDA 的内存读写：一般寻址、缓冲、共享内存

CUDA 最富有意义的设计是其允许 GPU 对 DRAM 进行读写，从而使 GPU 成为可以辅助 CPU 计算的 **协同处理设备**。读写内存的方式有：**寻址**、**缓冲** 和 **共享内存**

<table><tbody><tr><td>
<img width=500 src="0223_cuda-dram1.png">
<p align="center">寻址：发散和聚集</p>
</td><td>
<img width=400 src="0223_cuda-dram2.png">
<p align="center">共享内存使 ALU 更接近数据</p>
</td></tr></tbody></table>

 **CUDA 提供一般 DRAM 内存寻址方式：“发散” 和“聚集”内存操作**，从而提供最大的编程灵活性。从编程的观点来看，它可以在 DRAM 的任何区域进行读写数据的操作，就像在 CPU 上一样。此外， **CUDA 还允许并行数据缓冲或者在 On-chip 内存共享**，可以进行快速的常规读写存取，在线程之间共享数据。

### CUDA 的概念模型：线程、块、网格


## kernel：理解 cuda 的关键

## 部分 C 式应用编程 API
