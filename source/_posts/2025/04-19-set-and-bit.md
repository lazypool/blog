---
layout: post
title: 从集合论到位运算，常见位运算技巧分类总结！
categories:
  - 💻 抠点算法
tags: [集合论, 位运算, 二机制]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00017.jpg
date: 2025-04-19 12:51:21
---

# 以集合论为指导，利用位运算实现复杂操作！

![集合交，按位与](union_bitand.png)

本篇博客受到 [灵茶山艾府](https://leetcode.cn/discuss/post/3571304/cong-ji-he-lun-dao-wei-yun-suan-chang-ji-enve/) 的启发，并结合了自己在实践过程中的经验。经实践，在集合论的指导下使用位运算能够大大地提高对某些问题的求解效率和质量。 **总的来说，使用位运算可以极大减少内存占用，而同时将时间复杂度降低至与使用复杂的数据结构相当。**

## 我们先来看如下例题

**世界杯赢家**
> **题目描述**
> 假设有 n 场比赛，每场比赛均分出胜负，没有平局。请找出没有输掉任何比赛，且至少参加了一场比赛的全部国家，并按国家编号递增输出；若不存在这样的国家，输出空列表。

> **关于输入**
> 正整数 n，表示比赛场数。包含 n 个元组的列表 arr。其中每个元组由两个元素组成，第一个是获胜的国家编号，第二个是失败的国家编号。比赛场数和国家编号均介于 \[1, 100000\]。

> **关于输出**
> 列表，包含没有输掉任何比赛的全部国家编号，但不包括那些没有参与过任何一场比赛的国家。列表的最大长度显然为 1000000。

**常规解法**
```python
def solution(n: int, arr: List[Tuple[int, int]]) -> List[int]:
    winners, losers = set(), set()
    for winner, loser in arr:
        winners.add(winner)
        losers.add(loser)
    ret = sorted(winners - losers)
    return ret
```

**使用位运算的解法**
```python
def solution(n: int, arr: List[Tuple[int, int]]) -> List[int]:
    winners = losers = 0
    for winner, loser in arr:
        winners |= 1 << winner
        losers |= 1 << loser
    combined = winners & ~losers
    ret = list()
    while combined:
        lsb = combined & -combined
        ret.append(lsb.bit_length() - 1)
        combined &= combined - 1
    return ret
```

| **算法**       | **时间复杂度**    | **空间复杂度** | **关键点**                               |
|----------------|-------------------|----------------|------------------------------------------|
| **常规解法**   | $O(N + K \log K)$ | $O(U)$         | 集合与排序主导时间，空间取决于国家数量   |
| **位运算解法** | $O(N + K)$        | $O(M)$         | 位运算和遍历主导时间，空间取决于编号大小 |

- 常规解法遍历所有比赛后，求差集并排序，其时间复杂度为 $O(N + W + K \log K)$。$N$ 为 `arr` 长度；$W$ 为 `winners` 集合大小、可忽略不记；$K$ 为结果集合的大小。常规解法用到了 2 个集合，集合的大小取决于国家的数量 $U$。
- 位运算解法用大整数代替集合，用 `|=` 操作代替集合的 `add()` 操作，结果无需排序，直接遍历输出，其时间复杂度为 $O(N + K)$。它使用两个大整数来存储 `winners` 和 `losers`。假设国家的最大编号为 $M$，那么它需要 $2M$ 位空间。
- 常规解法适合国家编号范围较大但实际参与国家较少（$U << M$）的情况，位运算解法适合国家编号范围较小（如 $M \le 64$）且结果数量 $K$ 较大的场景，避免排序开销。

## 从集合到位运算：概念解析
