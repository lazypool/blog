---
layout: post
title: MiniMax 推理优化实习生面试回忆
tags: [面试, MiniMax, 推理优化, CUDA, 矩阵乘法, 面经]
categories:
  - ⛺ 心灵之旅
  - 大厂面经
index_img: animals/00031.jpg
date: 2026-07-08 22:00:00
---

# MiniMax 推理优化实习生面试回忆

昨天面了 MiniMax 的推理优化实习生岗位，base 上海。面试官很干脆，自我介绍完直接上题，一共两道，都没有要求写完整代码，主要是聊思路和背后的原理。

## 第一题：GPU GEMM Tiling 访存比计算

**题目背景：** NVIDIA SM80 架构（Ampere），实现 GEMM 的 Tiling 策略。给了三个 tile size 配置：

```
<32,  64>
<64,  64>
<128, 64>
```

问这三种配置的**计算访存比**分别是多少？

### 分析

这里 tile size 指的是 thread block 负责的 output tile 维度 `<M_tile, N_tile>`，即每个 thread block 计算 C 矩阵中 M_tile × N_tile 的区域。

在典型的 GEMM tiling 中，每个 thread block 会：
- 从 Global Memory 加载一块 A 的 sub-tile（`M_tile × K_tile`）和一块 B 的 sub-tile（`K_tile × N_tile`）到 Shared Memory
- 计算 `M_tile × N_tile × K_tile` 次乘加运算（FMA，算 2 FLOPs）
- 写回 C 的 tile（`M_tile × N_tile`）

假设 K_tile 固定，则计算访存比（Arithmetic Intensity）为：

$$
AI = \frac{2 \cdot M_{tile} \cdot N_{tile} \cdot K_{tile}}
            {4 \cdot (M_{tile} \cdot K_{tile} + K_{tile} \cdot N_{tile} + M_{tile} \cdot N_{tile})}
$$

写 C 的开销相比计算量可摊销，忽略后简化为：

$$
AI \approx \frac{2 \cdot M_{tile} \cdot N_{tile} \cdot K_{tile}}
                 {4 \cdot K_{tile} \cdot (M_{tile} + N_{tile})}
          = \frac{M_{tile} \cdot N_{tile}}{2 \cdot (M_{tile} + N_{tile})}
$$

代入三种配置（以 K_tile = 16 为例）：

| Tile Size | M_tile + N_tile | 访存量（字节） | 计算量（FLOPs） | 访存比（FLOPs/Byte） |
|-----------|----------------|---------------|----------------|-------------------|
| <32, 64>  | 96             | 4×16×96 = 6144 | 2×32×64×16 = 65536 | 65536 / 6144 ≈ **10.67** |
| <64, 64>  | 128            | 4×16×128 = 8192 | 2×64×64×16 = 131072 | 131072 / 8192 = **16.00** |
| <128, 64> | 192            | 4×16×192 = 12288 | 2×128×64×16 = 262144 | 262144 / 12288 ≈ **21.33** |

### 结论

Tile 越大，计算访存比越高。原因是**数据复用**——每从 Global Memory 加载一个 A 的元素，它参与了 N_tile 次计算；每加载一个 B 的元素，它参与了 M_tile 次计算。更大的 tile 意味着更好的复用，从而获得更高的算术强度。

但 tile 不能无限大，因为受限于 Shared Memory 大小（SM80 上最大 164KB 或 228KB，取决于配置）和每个 SM 的 thread 数量。实际需要在 tile size 和 occupancy 之间取舍。

## 第二题：CPU 单线程矩阵乘法优化

**题目：** 给定两个矩阵 A 和 B 以及一段朴素实现，问有什么优化空间？

```
A: shape [M, K] = [64, 64]，按行存储
B: shape [K, N] = [64, 4096]，按列存储

int M = 64, N = 4096, K = 64;
for (int i = 0; i < M; i++) {
  for (int j = 0; j < N; j++) {
    int temp = 0;
    for (int k = 0; k < K; k++) {
      temp += A[i][k] * B[j][k];
    }
    C[i][j] = temp;
  }
}
```

### 分析

关键信息和参数：
- M=64, K=64 都很小；N=4096 较大
- A 是 64×64 = 4096 个 int = **16KB**，轻松放进 L1 cache
- B 是 64×4096 = 262144 个 int = **1MB**，远超 L1/L2，但通常能放进 L3
- B 按列存储，即 `B[j][k]` 中 j 是列下标、k 是行下标，同一列的不同行在内存中连续排列

当前代码的访存模式：
- 最内层 k 循环：`A[i][k]` 连续访问（行主序 ✓），`B[j][k]` 连续访问（列主序 ✓）——两者都是顺序访问，cache line 利用率好
- 外层 i 循环 64 次，中层 j 循环 4096 次

**问题在哪里？**

对于每个 i，内层 j 循环会**完整遍历一遍 B**（1MB）。i 循环 64 次，B 被反复加载 64 次。虽然 B 可能留在 L3 中，但每次都要从 L3 读取 1MB 数据，L3 带宽远低于 L1。

### 优化方向

#### 1. 循环交换（i 和 j 互换）

```cpp
for (int j = 0; j < N; j++) {
  for (int i = 0; i < M; i++) {
    int temp = 0;
    for (int k = 0; k < K; k++) {
      temp += A[i][k] * B[j][k];
    }
    C[i][j] = temp;
  }
}
```

此时对于每个 j，`B[j][k]`（256 字节）可以完全留在 L1 中，被内层 i 循环复用 64 次。但代价是 A 每次都要重新遍历——好在 A 只有 16KB，L1 命中。

#### 2. Cache Blocking / Tiling

更好的做法是对 N 维做分块。将 N 每 64 个分为一组，使得 B 的 tile（64×64 = 16KB）和 A（16KB）一起放进 L1：

```cpp
int TILE_N = 64;
for (int jj = 0; jj < N; jj += TILE_N) {
  for (int i = 0; i < M; i++) {
    for (int j = jj; j < jj + TILE_N; j++) {
      int temp = 0;
      for (int k = 0; k < K; k++) {
        temp += A[i][k] * B[j][k];
      }
      C[i][j] = temp;
    }
  }
}
```

这样 B 的一个 tile（16KB）+ A（16KB）= 32KB，正好塞进现代 CPU 的 L1 cache（通常 32KB），实现数据复用。

#### 3. SIMD 向量化

K=64 是定值且足够小，很适合用 SIMD 做向量化。比如用 AVX2（256-bit，一次 8 个 int）：

```cpp
for (int i = 0; i < M; i++) {
  for (int j = 0; j < N; j++) {
    __m256i sum = _mm256_setzero_si256();
    for (int k = 0; k < K; k += 8) {
      __m256i a = _mm256_loadu_si256((__m256i*)&A[i][k]);
      __m256i b = _mm256_loadu_si256((__m256i*)&B[j][k]);
      sum = _mm256_add_epi32(sum, _mm256_mullo_epi32(a, b));
    }
    // 横向归约
    int temp = hsum(sum);
    C[i][j] = temp;
  }
}
```

由于 A 和 B 在最内层 k 上都是连续访问，向量化非常自然。

#### 4. 循环展开

K=64 是 2 的幂，可以用 `#pragma unroll` 或手动展开，减少循环开销、增加指令级并行。

## 总结

两题都围绕**矩阵乘法**这个主题——第一题从 GPU 角度考察 tiling 与算术强度的关系，第二题从 CPU 角度考察 cache 利用和访存优化。核心思想是一致的：**通过数据复用提高计算访存比**。

面试体验整体不错，面试官引导很到位，没有直接给答案而是提示思考方向。没有八股，没有项目深挖，非常务实。不过也说明这是硬核岗位，对底层优化理解要求比较高。

结果还不知道，先记录一下供日后回顾。
