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
- 限制并行能力的 PCle 总线是怎样的？
- cuda 是怎样管理和调度 GPU 资源的？
- 编译出来的机器码加了哪些“科技与狠活”？……

## 从底层到抽象：线程、块、网格

## kernel：理解 cuda 的关键

## 部分 C 式应用编程 API
