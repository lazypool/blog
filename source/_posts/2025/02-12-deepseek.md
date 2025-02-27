---
layout: post
title: DeepSeek 🐬：国产大模型之光？它用到了哪些关键技术？
categories:
  - 📖 论文阅读
tags: [大语言模型, NLP, NLP经典论文]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/dolphin.png
date: 2025-02-12 21:38:31
---

# DeepSeek：国产大模型之光？

大语言模型领域的发展真的很快，上一篇 LLaMA 的博客还没有写完，DeepSeek 又得到了铺天盖地的宣传。尽管 Linus 等人总是对人工智能的发展持观望态度，但不得不承认 AI 简直就是现如今的“流量密码”。这次我也试着跟一下风，来对 DeepSeek 抽丝剥茧一下，看看这款号称“国产AI之光”的模型究竟有哪些优秀的地方吧！

![虎鲸：DeepSeek 的 Logo](logo-deepseek.png)

DeepSeek-R1 发布于 25 年 1 月份，当时中国人们差不多正在过年。一经发布，DeepSeek 便刷屏各大网站，势头猛烈、非同凡响。其实早在 2024 年，DeepSeek 就陆续发表过许多文章（14 篇），但没有引起很多的关注。而 DeepSeek-R1 则是 DS 团队近两年的科技突破的集大成者。

DeepSeek 官方已将其系列的相关文章整理出来，放在 [Huggingface](https://huggingface.co/collections/Presidentlin/deepseek-papers-674c536aa6acddd9bc98c2ac)，感兴趣的小伙伴可以去查看。以防万一，这里将它抄录在这里 **（从上至下，发布时间由新到旧）**。

---

<div style="display:flex; justify-content:left"><div>

- **2025.1**
    - DeepSeek-R1 👉 [论文链接🔗](https://arxiv.org/abs/2501.12948)
- **2024.12** 
    - DeepSeek-V3 👉 [论文链接🔗](https://arxiv.org/abs/2412.19437)
    - DeepSeek-VL2 👉 [论文链接🔗](https://arxiv.org/abs/2412.10302)
- **2024.10 ~ 2024.11**
    - JanusFlow 👉 [论文链接🔗](https://arxiv.org/abs/2411.07975)
    - Janus 👉 [论文链接🔗](https://arxiv.org/abs/2410.13848)
- **2024.8**
    - DeepSeek-Prover-V1.5 👉 [论文链接🔗](https://arxiv.org/abs/2408.08152)
- **2024.7**
    - Let the Expert Stick to His Last 👉 [论文链接🔗](https://arxiv.org/abs/2407.01906)
</div><div>

- **2024.6**
    - DeepSeek-Coder-V2 👉 [论文链接🔗](https://arxiv.org/abs/2406.11931)
    - DeepSeek-Prover 👉 [论文链接🔗](https://arxiv.org/abs/2406.14333)
- **2024.5**
    - DeepSeek-V2 👉 [论文链接🔗](https://arxiv.org/abs/2405.04434)
- **2024.1 ~ 2024.3**
    - DeepSeek-VL 👉 [论文链接🔗](https://arxiv.org/abs/2403.05525)
    - DeepSeekMath 👉 [论文链接🔗](https://arxiv.org/abs/2402.03300)
    - DeepSeek-Coder 👉 [论文链接🔗](https://arxiv.org/abs/2401.14196)
    - DeepSeekMoE 👉 [论文链接🔗](https://arxiv.org/abs/2401.06066)
    - DeepSeekLLM 👉 [论文链接🔗](https://arxiv.org/abs/2401.02954)
</div></div>

---

*What's UP !? 这么多的论文怎么看的完（我只是一个苦逼大学生）？* 好在已经有前人淌过水了。一些大佬对这些论文的评价是：如果想要快速地对 DeepSeek 有一个直观且较为深入的了解，**可以重点看其中的三篇文章：DeepSeekLLM、DeepSeek-V3、DeepSeek-R1**。

本篇博客将重点围绕 DeepSeek-V3 这篇“大而全”的技术报告，并结合 DeepSeek-R1 论文的相关内容，由详到略依次介绍 DeepSeek 的：
1) 模型上的改进部分，包括：**混合专家模型 (MoE)** 、**多头潜在注意力 (MLA) 机制** 、**无辅助损失 (Auxiliary-Loss-Free) 的均衡方法**、**多 Token 预测 (MTP)** 等；
2) 训练框架上的优化，如 **FP8 混合精度训练**、**DualPipe 算法** 等；
3) 利用强化学习提升模型能力：回馈函数的设计、**群体相对策略优化 (GRPO) 算法**；
4) DeepSeek-V3 的表现： to be continued...
5) DeepSeek-R1 的相关内容：to be continued...

## 模型上的改进：更快、更好，同时追求速度和质量

### 混合专家模型 (MoE)

### 多头潜在注意力 (MLA)

### 多 Token 预测 (MTP)

## 训练框架上的优化：极大减少显存占用，实现 “飞速” 训练

### FP8 混合精度训练

### DualPipe 算法

## 利用强化学习提升模型能力：对齐人类水平，挖掘模型潜能

### 回馈函数 RM 的设计

### 群体相对策略优化算法 (GRPO)

## DeepSeek-V3 的表现：屠榜同行，时代先声？

// to be continued...

## DeepSeek-R1 的相关内容：强化学习方面的努力与尝试

// to be continued...
