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
2) 训练框架上的优化，如 **DualPipe 算法**，以及 **FP8 混合精度训练**；
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
- 最后是左边关于 $\mathbf{Q}$ 的处理部分，同样进行了降维、升维、 RoPE 与 拼接.
    - $c\_t^\mathsf{Q}=W^\mathsf{DQ}h\_t$
    - $[\mathbf{q}\_{t,1}^\mathsf{C},\mathbf{q}\_{t,2}^\mathsf{C},\cdots,\mathbf{q}\_{t,h_n}^\mathsf{C}]=\mathbf{q}\_t^\mathsf{C}=W^\mathsf{UQ}c\_t^\mathsf{Q}$
    - $\mathbf{q}\_{t}^\mathsf{R}=\mathsf{RoPE}(W^\mathsf{QR}h\_t)$
    - 拼接 $\mathbf{q}\_t^\mathsf{C}$ 与 $\mathbf{q}\_t^\mathsf{R}$ ，即得到正式参与注意力的 $\mathbf{Q}$.

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

当前主流的大模型(LLMs)都是decoder-base的模型结构，也就是无论在模型训练还是在推理阶段，对于一个序列的生成过程，都是token-by-token的。每次在生成一个token的时候，都要频繁跟访存交互，加载KV-Cache，再通过多层网络做完整的前向计算。对于这样的访存密集型的任务，通常会因为访存效率形成训练或推理的瓶颈。

MTP 针对解码阶段进行优化，将原来的 one-token 的生成变成 multi-token 的生成，从而提升训练和推理性能。具体来说：

- 在训练阶段，一次生成多个后续的 token，可以一次学习多个位置的标签，进而提升样本的利用效率，提升训练速度。
- 在推理阶段，通过一次生成多个 token，实现成倍的推理加速来提升推理性能。

#### DeepSeekMTP 模块细节

![多 token 预测示意图](deepseek-mtp.png)

从网络结构出发，看看 DeepSeek 的 MTP 的设计。如上图所示，DeepSeek 对 MTP 的实现保留了序列推理的连接关系，**在输出阶段，从一个 Module 连接到后继的 Module**。从左往右，分别是主模型、Module1、Module2……，串行的 Module 越多，预测的 token 量也越多，预测深度也就越深。它的详细流程是这样的：

- 对于所有 Module 来说，所有的输入都共享一个嵌入层 $\mathsf{Emb}()$.
- 对于第 $i$ 个 token $t\_i$，假设当前要预测的深度在第 $k$ 层.
- 我们有 $h\_i^{'k} = M\_k[\mathsf{RMSNorm}(h\_i^{k-1});\mathsf{RMSNorm}(\mathsf{Emb}(t\_{i+k}))]$
    - 首先将 $t\_i$ 对第 $k-1$ 层的隐藏层输出 $h\_i^{k-1}\in\mathbb{R}^{d}$ 进行均方根规范化.
    - 再对第 $i+k$ 位置的 token 嵌入层输出 $\mathsf{Emb}(t\_{i+k})\in\mathbb{R}^{d}$ 也进行均方根规范化.
    - 将上述两个结果 concat 后，经由矩阵 $M\_k\in\mathbb{R}^{d\times{2d}}$ 线性变换得到 $h\_{i}^{'k}\in\mathsf{R}^{d}$
- $h\_i^{'k}$ 即为当前 Module 中 Transformer 块的输入.
    - 主模型包含一个较深的 Transformer 栈，而其余的 Module 都只含 1 个.
    - 因为是串行，所以各个 Module 将能看到其之前的所有信息.
- $h\_{1:T-k}^{k} = \mathsf{Trm}(h\_{1:T-k}^{'k})$，它将用于之后的 Module，并且其自身也即将输出.
    - 这里的下标 $\_{1:T-k}$ 表示输入 token 的范围：从第 1 个 token 到第 $T-k$ 个 token.
    - $T$ 是预测后的序列长度，显然预测的第 $T$ 个 token 应当对应输入的第 $T-k$ 个 token.
    - 于是也能知道输入的序列长度总是 $T-k$.
- 最后，将 $h\_i^{k}$ 通过映射矩阵 $\mathsf{OutHead}\in\mathbb{R}^{V\times{d}}$ 变换和 $\mathsf{Softmax}()$，该矩阵在各 Module 间共享.
    - $p\_{i+k+1}^{k}=\mathsf{Softmax}(\mathsf{OutHead}(h\_i^{k}))$.
    - $p\_{i+k+1}^{k}\in\mathbb{R}^V$，是词表 $V$ 维度的概率输出.
    - 上标 $^{k}$ 表示当前预测深度为 $k$，下标 $\_{i+k+1}$ 表示是对序列的第 $i+k+1$ 处的预测.

![MTP 示意图：预测深度与下标偏移](deepseek-mtp2.png)

#### DeepSeekMTP 训练过程和推理阶段

训练阶段使用的多 Token 预测部分的损失函数 $\mathcal{L}_\mathsf{MTP}$ 是将每个 Module 的 CSE 损失求平均值，并乘上一个权重因子 $\lambda$. 这部分损失将作为主损失 $\mathcal{L}_\mathsf{main}$ 的附加损失，在训练过程中同时计算梯度。

$$\mathcal{L}_\mathsf{MTP}=\frac{\lambda}{D}\sum\_{k=1}^{D}\mathcal{L}\_\mathsf{MTP}^{k}\qquad其中,\mathcal{L}\_\mathsf{MTP}^{k}=\mathsf{CSE}(p\_{2+k:T+1}^{k},t\_{2+k:T+1})=-\frac{1}{T}\sum\_{i=2+k}^{T+1}\log(P\_i^k[t\_i])$$

> 这里计算 CSE 时下标从 $2+k$ 开始到 $T+1$ 结束，很好理解：假设当前预测深度为 $k$，那么我们在第 $k$ 个 Module，此时输入的第 1 个 token 是原序列中的第 $k+1$ 个 token. 对应到真实标签中就是第 $k+2$ 个 token，这意味着前面的 token 将不参与计算. 然而无论预测深度是多少，计算 CSE 时总会除以序列长度 $T$，因此 $k$ 越深，其对总体损失的影响越小.

DeepSeekV3 中强调，**MTP 的设计主要是为了训练过程能加速收敛，更充分的使用训练样本**。所以针对推理阶段只是简单介绍了一段。这里也稍微展开讲下推理的过程。DeepSeekV3 推理可以有两种方法：

- 方法1：直接把 MTP Module 头全部删掉，模型变成了单 token 预测的。然后部署模型，用自回归 autoregressive 做推理。这个就跟正常 LLM 模型推理一样，没有什么加速。
- 方法2：保留 MTP Module 做 self-speculative 解码 ~(这个可能翻译成“自猜测”，我自己猜测的xwx)~，这样充分使用多 token 预测能力，提升推理加速性能。

## 训练框架上的优化：极大减少显存占用，实现 “飞速” 训练

> DeepSeek-V3 是在配备 2048 块 NVIDIA H800 GPU 的集群上进行训练的。H800 集群中的每个节点包含 8 块通过 NVLink 和 NVSwitch 相互连接的 GPU。不同节点之间则通过 InfiniBand（IB）互连来实现通信。

DeepSeek-V3 的训练由 HAI-LLM 框架支持，该框架是由 DS 团队从零开始打造的高效且轻量的训练框架。总体而言，DeepSeek-V3 应用了 16 路流水线并行（PP）、64 路专家并行（EP）跨越 8 个节点，以及 ZeRO-1 数据并行（DP）。为了促进 DeepSeek-V3 的高效训练，DS 团队实施了细致的工程优化，包括 DualPipe 算法以及 FP8 混合精度训练。

### DualPipe 算法

对于 DeepSeek-V3，跨节点专家并行带来的通信开销导致 **计算/通信比** 约为低效的 1:1。为了解决这一挑战，DS 团队设计了一种创新的管道并行算法，称为 DualPipe，它不仅通过有效地重叠前向和后向计算的通信阶段来加速模型训练，而且还 **减少了管道气泡**。

**相关概念**  

> **计算/通信比**
指计算操作与通信操作的时间比例⏰。计算常常是高效的，而通信则效率较低。计算/通信比低意味着设备频繁因通信等待而闲置，需通过异步传输重叠计算与通信操作提升计算占比。

> **管道** 🪈
一种并行训练技术，将模型按照层或模块拆分成多个阶段 _(Stage)_ 分配到不同的设备，数据以微批次 _(Micro-batch)_ 流经各阶段。**管道像流水线一样：各个阶段处理完一个微批次并传递给下个阶段后，就立刻处理下个微批次，而非等待所有阶段完成。** 这样做实现了对计算设备的高效复用。

> **管道气泡**
指设备等待数据的空闲时间。在管道中，由于各阶段计算速率差异或通信延迟，**设备在处理完当前微批次后可能还需要花时间等待前一阶段的输出，导致该设备空闲**，这被形象地称为“气泡”。管道气泡常成为并行训练的优化瓶颈😐。

#### 计算与通信重叠

#### 跨节点全双工通信

#### 用时间换空间

DS 团队还采用了以下技术优化训练过程的内存占用，**用极小的时间代价实现了极致的内存节约**：

##### 预先计算 RMSNorm 和 MLA 升维操作的结果

RMSNorm 和 MLA 中的升维操作频繁发生在前向传播过程中。**然而，DS 注意到这两项操作的输入有时候是固定的**。 _(比如，对嵌入层输出进行 RMSNorm 时，以及 MLA 中将被缓存的低秩潜在特征升维到高维原始特征时。)_ 这种输入不变性使反向传播过程中的预计算成为可能。于是，DS **在反向传播的过程中预先计算正向传播中 RMSNorm 和 MLA 升维操作的结果，避免保存中间激活值。** 这种策略以极低的时间开销减少了极大的内存存储消耗。

##### CPU 的指数移动平均 (EMA, Exponential Moving Average)

**指数移动平均 EMA** 是一种参数平滑更新技术，是指**通过历史参数的加权平均生成稳定版本，用于缓解训练波动**。DS 采用 CPU 的内存来存储模型参数的 EMA 值，用于学习率衰减阶段的性能预估。EMA 参数通过异步方式更新，在 GPU 训练间隙完成数据传输与参数更新，消除设备内存占用。

##### MTP 阶段共享嵌入 (Embedding) 和输出层 (Output Head)

基于 DualPipe 流水线策略，将模型最浅层（嵌入层）与最深层（输出头）部署于同一流水线并行（PP）层级。**通过物理合并相邻计算单元，使参数存储地址一致。**各 MTP Module 间共享嵌入层/输出头的参数及梯度，减少重复存储开销，同时保留多 Token 预测功能。

### FP8 混合精度训练

## 利用强化学习提升模型能力：对齐人类水平，挖掘模型潜能

### 回馈函数 RM 的设计

### 群体相对策略优化算法 (GRPO)

## DeepSeek-V3 的表现：屠榜同行，时代先声？

// to be continued...

## DeepSeek-R1 的相关内容：强化学习方面的努力与尝试

// to be continued...
