---
layout: post
title: DeepSeek 🐬：国产大模型之光？它用到了哪些关键技术？
categories:
  - 📖 论文阅读
tags: [大语言模型, NLP, NLP经典论文]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00011.jpg
date: 2025-02-12 21:38:31
---

# DeepSeek：国产大模型之光？

> 大语言模型领域的发展真的很快，上一篇 LLaMA 的博客还没有写完，DeepSeek 又得到了铺天盖地的宣传。尽管 Linus 等人总是对人工智能的发展持观望态度，但不得不承认 AI 简直就是现如今的“流量密码”。这次我也试着跟一下风，来对 DeepSeek 抽丝剥茧一下，看看这款号称“国产AI之光”的模型究竟有哪些优秀的地方吧！

DeepSeek-R1 发布于 25 年 1 月份，当时中国人们差不多正在过年。一经发布，DeepSeek 便刷屏各大网站，势头猛烈、非同凡响。其实早在 2024 年，DeepSeek 就陆续发表过许多文章（14 篇），但没有引起很多的关注。而 DeepSeek-R1 则是 DS 团队近两年的科技突破的集大成者。

![虎鲸：DeepSeek 的 Logo](logo-deepseek.png)

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
1) 模型上的改进部分，包括：**多头潜在注意力机制** 、**混合专家模型** 、**多 Token 预测** ；
2) 训练框架上的优化，如 **FP8 混合精度训练**、**DualPipe 算法** 等；
3) 利用强化学习提升模型能力：回馈函数的设计、**群体相对策略优化 (GRPO) 算法**；
4) DeepSeek-V3 的表现： to be continued...
5) DeepSeek-R1 的相关内容：to be continued...

## 模型上的改进：更快、更好，同时追求速度和质量

Deepseek 在模型上的改进有两条主线：**一是优化模型表现**，使用了更复杂的 MoE 混合专家模型**二是提高推理速度**，使用了 MLA 多头潜在注意力机制和 MTP 多 Token 预测技术。📖

### 多头潜在注意力 (MLA)

多头潜在注意力机制的引入主要是为了提升大模型的推理速度，其核心是通过 **低秩分解** 减少推理过程中的 **KV-Cache** 。你可以参考我写的另外两篇博客来理解什么是低秩分解和 KV-Cache：

- [https://lazypool-blog.netlify.app/2024/01/28/peft/#低秩分解](https://lazypool-blog.netlify.app/2024/01/28/peft/#低秩分解)
- [https://lazypool-blog.netlify.app/2025/01/09/llama123/#引入-GQA-前先简单介绍下-KV-Cache](https://lazypool-blog.netlify.app/2025/01/09/llama123/#引入-GQA-前先简单介绍下-KV-Cache)

回到我们的正题上来。我们都知道，大模型在推理时常用名为 KV 缓存的技术来加快速度，这导致对显存的极大占用。针对这一问题，诸如 Llama 等模型都采用了 GQA 的方法，deepseek 在此基础上更进一步，仅将 KV 的潜在特征缓存，进一步缩小了存储的空间。

![多头潜在注意力机制](deepseek-mla.png)

这样子讲会比较抽象，结合公式来看图，会对理解其过程更有帮助：

- 从下往上看：首先，MLA 的输入为 $h\_t$，假设其维度为 $d$，下标 $t$ 表示其是第 $t$ 个 token.
- 输入进入后有三条路线，先看最右边，这里进行了次降维 $c\_t^\mathsf{KV}=W^\mathsf{DKV}h\_t$.
- $c\_t^\mathsf{KV}\in\mathbb{R}^{d\_c}$，是将被缓存的**潜在特征**，其维度远小于 KV 对.
- $W^\mathsf{DKV}\in\mathbb{R}^{d\_c\times{d}}$，是降维矩阵 _(Down KV matrix)_ ，它将在微调时学习.
- 缓存后的 $c\_t^\mathsf{KV}$ 将在下次推理时被“释放”，生成用于计算注意力的 $\mathbf{K}$ 和 $\mathbf{V}$.
- $[\mathbf{k}\_{t,1}^\mathsf{C},\mathbf{k}\_{t,2}^\mathsf{C},\cdots,\mathbf{k}\_{t,h_n}^\mathsf{C}]=\mathbf{k}\_t^\mathsf{C}=W^\mathsf{UK}c\_t^\mathsf{KV}$
    - $[\mathbf{v}\_{t,1}^\mathsf{C},\mathbf{v}\_{t,2}^\mathsf{C},\cdots,\mathbf{v}\_{t,h_n}^\mathsf{C}]=\mathbf{v}\_t^\mathsf{C}=W^\mathsf{UV}c\_t^\mathsf{KV}$
    - $h\_n$ 是注意力头的个数 _(heads number)_ ，有多少头就要缓存多少 KV 对.
    - $W^\mathsf{UK}$ 和 $W^\mathsf{UV}$ 是两个升维矩阵 _(Up K matrix 和 Up V matrix)_.
- 看完右边再来看中间：这里对输入进行了 RoPE 旋转位置编码得到了 $\mathbf{k}\_t^\mathsf{R}$.
- $\mathbf{k}\_t^\mathsf{R}=\mathsf{RoPE}(W^\mathsf{KR}h\_{t})$，注意它将被缓存.
- 关于 RoPE 可以去看我的另外一篇博客，里面有 RoPE 的详细代码：[Llama2 RoPE](https://lazypool-blog.netlify.app/2025/01/09/llama123/#RoPE%EF%BC%9A%E4%BB%A5%E7%AE%80%E4%BE%BF%E6%96%B9%E5%BC%8F%E6%9C%89%E6%95%88%E6%8D%95%E6%8D%89%E7%9B%B8%E5%AF%B9%E4%BD%8D%E7%BD%AE%E4%BF%A1%E6%81%AF).
    - 拼接 $\mathbf{k}\_t^\mathsf{C}$ 与 $\mathbf{k}\_t^\mathsf{R}$ ，即得到正式参与注意力的 $\mathbf{K}$.
    - 最后是左边关于 $\mathbf{Q}$ 的处理部分，同样进行了降维、升维与 RoPE.
        - $c\_t^\mathsf{Q}=W^\mathsf{DQ}h\_t$
        - $[\mathbf{q}\_{t,1}^\mathsf{C},\mathbf{q}\_{t,2}^\mathsf{C},\cdots,\mathbf{q}\_{t,h_n}^\mathsf{C}]=\mathbf{q}\_t^\mathsf{C}=W^\mathsf{UQ}c\_t^\mathsf{Q}$
        - $\mathbf{q}\_{t}^\mathsf{R}=\mathsf{RoPE}(W^\mathsf{QR}h\_t)$

以上部分走完后就是传统的多头注意力机制了，$\mathbf{K}$ 和 $\mathbf{Q}$ 点积缩放归一过后与 $\mathbf{V}$ 相乘，最终的结果再经过一个输出矩阵 $W^\mathsf{O}$ 转化后即得。那么回头来想一下，其实我们废了这么大劲就只是为了使推理时的显存占用变得更小而已：原来的 KV-Cache 缓存完整的 KV 对，而 MLA 仅缓存 KV 对中低维本质的特征。

### 混合专家模型 (MoE)

**MoE 发生在 FFN 中，最早是由 GPT-4 引入，**旨在突破密集网络 (Dense Network) 对参数的限制。MoE 丢弃了传统 Transformer 块中单 FFN 的设计，引入了多个独立专家，利用门控机制 (gating) 将输入路由到少量且亲和度高的专家网络，从而实现模型的稀疏化。

#### MoE 基础架构

![MoE 示例](moe-explanation.png)

如上图所示，注意力的输出经残差连接后即进入 MoE 模块 (浅蓝色，Switching FFN layer)。在 MoE 中，路由 Router 将会对各 token 进行判断：~x1 与 FFN2 的亲和度更高，x2 与 FFN1 的亲和度更高……~ MoE 确保所有 token 都只经过与其最适应的前 k 个专家网络，并将这 k 个专家给出的结果按照亲和度线性求和。写成公式就是下面这样，其中下标 $\_t$ 表示第 $t$ 个 token：

$$\begin{aligned}
& y\_t = x\_t + \sum\_{i}^{N} g\_{i,t} \cdot \mathrm{FFN}\_i (x\_t) \qquad\qquad\text{线性求和后残差连接，其中 $\sum\_{i}^{N} g\_{i,t} = 1$}
\\\\
& g\_{i,t} = \frac{ s\_{i,t} }{ \sum\_{j}^{N} s\_{j,t} } \qquad\qquad\qquad\qquad\text{将路由得分归一化，$N$ 即专家数，也就是路由出数}
\\\\
& s\_{j,t} = \begin{cases} \mathrm{Sigmoid}(x\_t^\mathrm{T} e\_j), &\quad {s\_{j,t} \in \mathrm{topK}} \\\\ 0, &\quad\text{otherwise} \end{cases} \qquad\text{除非得分排名前 k，否则视作 0 分，$e \in \mathbb{R}^{H \times N}$ }
\end{aligned}$$

#### DeepSeekMoE

![MoE 演进：从传统 MoE 到 DeepSeekMoE](deepseek-moe.png)

**DeepSeek 对传统的 MoE 进行了改进**，主要有 4 点：

1. 用 **更复杂的线性/非线性变换** 代替原有的 FFN 式的 expert 网络；
2. 使用 **规模更小但数量更多** 的 expert ，搭配 **分组机制** 来实现更细粒度的路由选择；
3. 引入了 **共享专家和独立专家** 的概念，进行混合的 MoE 组合；
4. 在各专家之间进行无辅助函数的 **负载均衡**。

DeepSeek 中对 MoE 部分的代码如下，主要由 `Expert()`、`Gate()`、`MoE()` 三部分组成。

##### 专家网络 Expert()

```python
# B 批量大小    L 序列长度    H 隐藏层维度
# N 专家数目    K 激活的专家数目
# G 专家的组数    G-K 激活的组数

class Expert(nn.Module):
    def __init__(self, dim: int, inter_dim: int):
        self.w1 = Linear(dim, inter_dim) # 输入层到隐藏层
        self.w2 = Linear(inter_dim, dim) # 隐藏层到输出层
        self.w3 = Linear(dim, inter_dim) # 额外的线性层

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # 注意此处做法与传统 FFN 式不同
        # w2 * (σ(w1 * x) * (w3 * x))
        return self.w2(F.silu(self.w1(x)) * self.w3(x))
```

##### 门控/路由层 Gate()

```python
class Gate(nn.Module):
    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # 线性变换 [B, L, H] -> [B, L, N] 后激活
        scores = linear(x, self.weight)
        if self.score_func == "softmax":
            scores = scores.softmax(dim=-1, dtype=torch.float32) # softmax 激活的同时进行了归一
        else:
            scores = scores.sigmoid()
        original_scores = scores # 保存副本用于之后计算专家权重

        # 偏置：无辅助损失函数的负载均衡
        if self.bias is not None:
            scores = scores + self.bias

        # 分组机制：利用掩码静默弱组专家
        if self.n_groups > 1:
            scores = scores.view(x.size(0), self.n_groups, -1) # scores: [B, G, LN/G]
            if self.bias is None:
                group_scores = scores.amax(dim=-1) # 取最大 group_scores: [B, G, 1]
            else:
                group_scores = scores.topk(2, dim=-1)[0].sum(dim=-1) # 取前两个最大求和 group_scores: [B, G, 1]
            indices = group_scores.topk(self.topk_groups, dim=-1)[1] # [B, G-k]
            mask = scores.new_ones(x.size(0), self.n_groups, dtype=bool).scatter_(1, indices, False) # [B, G]
            scores = scores.masked_fill_(mask.unsqueeze(-1), float("-inf")).flatten(1) # 弱组专家都变成了 -inf

        # 获取激活专家的索引与其权重
        indices = torch.topk(scores, self.topk, dim=-1)[1] # [B, L, K]
        weights = original_scores.gather(1, indices) # [B, L, K]
        if self.score_func == "sigmoid":
            # 如果之前没有进行归一化，则要进行归一化
            weights /= weights.sum(dim=-1, keepdim=True)
        weights *= self.route_scale # 乘以路由专家的权重
        return weights.type_as(x), indices
```

##### 混合专家模块 MoE()
```python
class MoE(nn.Module):
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        shape = x.size() # [B, L, H]
        x = x.view(-1, self.dim) # [BL, H]
        weights, indices = self.gate(x) # 激活专家的权重、索引 [B, L, K]
        y = torch.zeros_like(x) # [B, L, H]

        # counts 是长度为 N 的列表，专家 i 被选中 counts[i] 次
        counts = torch.bincount(indices.flatten(), minlength=self.n_routed_experts).tolist()
        for i in range(self.experts_start_idx, self.experts_end_idx):
            if counts[i] == 0: # 专家 i 未被选中
                continue
            expert = self.experts[i] # 把专家 i “请”出来
            idx, top = torch.where(indices == i) # 获取那些需要专家“指导”的 token 位置
            y[idx] += expert(x[idx]) * weights[idx, top, None] # 将专家的结果加权求和

        z = self.shared_experts(x) # 共享专家

        # 分布式的全局归约操作
        # 每个进程计算完本地梯度后，使用 all_reduce 对所有进程的梯度求和并同步
        if world_size > 1:
            dist.all_reduce(y)

        # 最后返回的的形状为 [B, L, H]
        return (y + z).view(shape)
```

#### 无辅助损失函数的负载均衡

理想的情况下，各个专家被激活的概率应该相当。如果一些专家很少被激活，而另一些专家总是被激活，那么利用多个专家进行并行计算的效率就会大打折扣。为了实现专家间的负载均衡，过去常采用辅助的损失函数来对非均衡路由的行为进行惩罚，这提升了梯度计算的复杂性。针对此问题，DeepSeek 试图实现无辅助损失函数的负载均衡策略。

$$s\_{j,t} = \begin{cases} \mathrm{Sigmoid}(x\_t^\mathrm{T} e\_j)  + b_j, &\quad {s\_{j,t} \in \mathrm{topK}} \\\\ 0, &\quad\text{otherwise} \end{cases}$$

他们是怎么做的呢？他们追踪每个专家被激活的频率，在训练的每一步手动调整专家得分的偏置 bias： **使过载的专家得分减去 $\gamma$，低载的专家得分加上 $\gamma$，这里的 $\gamma$ 是一个超参数。** 回顾我们在之前看的代码，我们在加上偏置之前保留了一份得分的副本 `original_scores` 作为专家的权重，而把 `scores` 加上偏置后去计算专家的索引。**这实际上部分地隔离了专家的得分和激活概率，从而在模型性能和负载平衡之间进行了 trade-off。**

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
