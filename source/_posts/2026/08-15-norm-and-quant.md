---
layout: post
title: Normalization 与 Quantization 的隐秘战争
categories:
  - 📖 论文阅读
  - 🏃 LLM 效率与优化
tags: [大语言模型, 量化, Quantization, Normalization, RMSNorm, Transformer]
index_img: img/index/00025.jpg
date: 2026-08-15 10:00:00
---

# Normalization 与 Quantization 的隐秘战争

> 在 LLM 量化领域，几乎所有人的目光都集中在权重矩阵和激活值的离群值上。但很少有人深入追问：这些离群值究竟从何而来？归一化层在这个过程中扮演了什么角色？本篇博客将系统性地梳理 Normalization 与 Quantization 之间错综复杂的关系，并探讨一种全新的研究方向：Quantization-Aware Normalization。

## 引言：量化绕不开的归一化

在 Transformer 架构中，**归一化层 (Normalization Layer)** 是保证训练稳定性的关键组件。从最初的 LayerNorm 到如今 LLaMA、Qwen、Mistral 等模型广泛采用的 RMSNorm，归一化层几乎是所有主流 LLM 的标配。

然而，在模型量化 (Quantization) 的语境下，归一化层却成了一个"房间里的大象"——所有人都知道它很重要，但几乎所有人都选择绕过它：

- **所有主流量化方法都保持归一化层不量化**（FP16 精度）
- 归一化层的参数 γ 被认为是激活离群值的根源之一
- RMSNorm 被发现会产生一种诡异的"反转效应"，使得量化误差与直觉相悖

这些问题的背后，隐藏着一个根本性的矛盾：**归一化层的设计初衷（稳定训练）与量化的需求（紧凑分布）之间存在根本冲突**。

本文将从以下几个维度展开：

1. 归一化层如何产生和放大激活离群值
2. RMSNorm 的"反转效应"及其对量化的灾难性影响
3. 现有方法如何尝试解决这一矛盾
4. 一个全新的研究方向：Quantization-Aware Normalization

---

## 背景知识

### Transformer 中的归一化层

在深入讨论之前，先回顾两种主流归一化层的定义。

**LayerNorm (LN)** 对每个样本在特征维度上进行归一化，然后进行仿射变换：

$$\text{LN}(z) = \frac{z - \mu}{\sigma} \odot \gamma + \beta$$

其中 $\mu = \frac{1}{d}\sum_{i=1}^{d} z_i$，$\sigma = \sqrt{\frac{1}{d}\sum_{i=1}^{d}(z_i - \mu)^2}$，$\gamma, \beta \in \mathbb{R}^d$ 是可学习参数。

**RMSNorm (Root Mean Square Normalization)** 是 LayerNorm 的简化版本，去掉了均值中心化和偏置项：

$$\text{RMSNorm}(z) = \frac{z}{\text{RMS}(z)} \odot \gamma$$

其中 $\text{RMS}(z) = \sqrt{\frac{1}{d}\sum_{i=1}^{d} z_i^2}$。

RMSNorm 的优势在于计算更简单、训练更稳定，因此被 LLaMA、Qwen、Mistral 等主流模型广泛采用。但在量化语境下，这种"简化"反而带来了意想不到的麻烦。

### LLM 中的激活离群值

**激活离群值 (Activation Outliers)** 是 LLM 量化面临的核心挑战。早在 2022 年，Dettmers 等人就在 GPT 级别的模型中发现：**某些激活通道的数值可以达到其他通道的 100 倍以上**，这些极端值被称为离群值（Outlier）。

离群值对量化的危害是致命的：标准的均匀量化器需要覆盖整个激活范围，当存在极端离群值时，绝大部分正常的激活值会被压缩到极少数量化区间中，导致严重的精度损失。

![离群值降低了量化的分辨率](outliers-impact-to-low-bit-quantization.png)


一个关键的问题是：**这些离群值是如何产生的？** 归一化层在其中扮演了什么角色？

---

## 发现一：γ 是离群值的"放大器"

### Outlier Suppression 的发现

2022 年 NeurIPS 的一篇论文 **Outlier Suppression** (Wei et al.) 首次系统性地研究了 LayerNorm 中 γ 参数对离群值的影响。他们发现了一个惊人的事实：

> **LayerNorm 中的 γ 参数充当了离群值的放大器 (sinful amplifier)。**

具体来说：

1. **离群值具有跨 token 的一致性** — 在不同输入 token 中，离群值常常出现在相同的通道维度上
2. **γ 在这些维度上的值特别大** — 这些可学习参数在训练过程中自然地对离群通道赋予了更大的权重
3. **放大效应是累积的** — 每经过一个 LayerNorm，离群值就被放大一次，逐层累积

这可以用公式来说明。假设输入 $z$ 在第 $j$ 个维度上存在离群值 $z_j \gg z_i$（对于大多数 $i \neq j$），那么：

$$\text{LN}(z)_j = \frac{z_j - \mu}{\sigma} \cdot \gamma_j + \beta_j$$

由于 $\sigma$ 被离群值撑大，正常维度的 $\frac{z_i - \mu}{\sigma}$ 会被压缩到很小的值。但离群维度经过 $\gamma_j$ 的缩放后，输出值依然很大甚至更大。

### Gamma Migration：第一次尝试

基于这一发现，Outlier Suppression 提出了 **Gamma Migration** 方法：

**核心思想**：将 γ 从 LayerNorm 中"迁移"出去，吸收进后续的线性层权重中，使得归一化层的输出不再被 γ 放大。

具体来说，将 LayerNorm 拆分为两个步骤：

$$\text{LN}(z) = \underbrace{\frac{z - \mu}{\sigma}}_{\text{Non-scaling LN}} \odot \gamma + \beta$$

然后将 γ 吸收进后续的线性层 $W$ 中：

$$\text{LN}(z) \cdot W = \frac{z - \mu}{\sigma} \cdot (\gamma \odot W) + \beta \cdot W$$

这样，量化就可以在 Non-scaling LayerNorm 的输出上进行，避免了 γ 对离群值的放大。

**局限性**：这只解决了 γ 的放大问题，但没有触及归一化本身的分布变换效应。

---

## 发现二：RMSNorm 的"反转效应"

### 一个反直觉的现象

2025 年 EMNLP 的一篇重磅论文 **"Why Do Some Inputs Break Low-Bit Quantization?"** 揭示了一个更加深层的问题。研究者观察到一个令人困惑的现象：

> **量化误差最大的样本，恰恰是那些残差幅度最小的样本。**

这完全违反直觉——按照常理，幅度小的激活应该更容易量化才对。数据显示，在 LLaMA-3-70B 的最后 30 层中，残差幅度与量化误差的相关系数达到了 $-0.8$。

### RMSNorm 的反转机制

深入分析后，研究者发现了 RMSNorm 的"反转效应" (Reversal Effect)：

**Step 1**：某些样本天然具有较小的残差幅度 $\|r^{(l)}\|$

**Step 2**：这些样本的残差中离群值较少（kurtosis 值较低），即分布更"平坦"

**Step 3**：RMSNorm 的作用机制：
- RMS 分母 $\text{RMS}(r^{(l)})$ 较小（因为整体幅度小）
- γ 参数对离群维度赋予较小的权重（这是训练中学到的模式）
- 但对于"平坦"的分布，γ 的抑制作用反而使得归一化后的幅度相对更大

**Step 4**：$\|h^{(l)}\|$ 反而变大了！

用公式来表示：

$$h^{(l)} = \text{RMSNorm}^{(l)}(r^{(l)}) = \frac{r^{(l)}}{\text{RMS}(r^{(l)})} \odot \gamma$$

对于残差幅度小的样本：
- 分子 $r^{(l)}$ 小 → 被 RMS 分母"放大"
- γ 对离群维度的抑制在这种情况下效果有限
- 结果：$\|h^{(l)}\|$ 反而比"正常"样本更大

**Step 5**：较大的 $\|h^{(l)}\|$ 作为量化层的输入，放大了权重中的量化误差

$$\text{MSE}^{(l)} = \|o^{(l)} - \tilde{o}^{(l)}\|^2 \propto \|h^{(l)}\|^2 \cdot \epsilon_w^2$$

其中 $\epsilon_w$ 是权重量化误差。由于 $\|h^{(l)}\|$ 较大，最终输出误差被放大。

### 反转效应的累积

更糟糕的是，这种反转效应是**逐层累积**的：

```txt
Layer l:   小残差 → RMSNorm → 幅度反转变大 → 作为下一层输入
Layer l+1: 输入幅度大 → RMSNorm → 幅度再次被调整 → ...
...
Layer L:   累积效应 → 最终输出误差巨大
```

这就解释了为什么最终层的残差幅度与量化误差有最强的相关性（$-0.8$）
——它是所有层累积效应的总和。

### 一个令人不安的推论

反转效应揭示了一个根本性问题：

> **RMSNorm 的设计目标是稳定训练，但它对激活分布的变换是"盲目"的——它不关心变换后的分布是否对量化友好。**

具体来说，RMSNorm 的两个操作分别带来了不同的问题：

1. **除以 RMS**：将所有激活缩放到相似的幅度范围，但这个范围取决于输入的统计特性，是不可控的
2. **乘以 γ**：对不同通道施加不同的缩放，但 γ 是为训练稳定性优化的，不是为量化优化的

这两个操作的组合，使得 RMSNorm 的输出分布对量化器来说是"敌对"的。

---

## 发现三：离群值的来源之争

### 两种对立的观点

关于 LLM 中激活离群值的来源，学术界存在两种对立的观点：

**观点 A：归一化层产生离群值**

Outlier Suppression (NeurIPS 2022) 和 Outlier Suppression+ (EMNLP 2023) 认为，LayerNorm/RMSNorm 中的 γ 参数是离群值的主要来源。γ 在训练过程中学会了对某些通道施加极大的缩放，导致这些通道的激活值异常大。

**观点 B：归一化层抑制离群值**

2026 年 HAL-Inria 的 Spike Aware 论文通过对 LLaMA 架构的细致分析发现，在 LLaMA 模型中，RMSNorm 实际上**削弱**了输入中的 spike 幅度，而不是放大它们。离群值最初由 FFN 中的 down_proj 层产生，然后通过残差连接传播，RMSNorm 反而起到了抑制作用。

### 为什么两种观点都对？

经过仔细分析，我认为两种观点并不矛盾，它们描述的是**不同层面的现象**：

| 层面 | 归一化层的作用 | 描述 |
|------|--------------|------|
| **通道层面** | 放大 | γ 确实放大了特定通道的离群值（观点 A）|
| **张量层面** | 可能抑制 | 除以 RMS 可以降低整体幅度（观点 B）|
| **样本层面** | 反转 | 改变了样本间的相对幅度关系（EMNLP 2025）|

关键在于：

> **归一化层同时执行了多个操作，每个操作的效果不同，最终的净效果取决于具体的数据分布**。

这就解释了为什么：
- 对于离群值严重的样本：γ 的通道级放大占主导 → 归一化层产生离群值
- 对于离群值较少的样本：RMS 的全局缩放占主导 → 归一化层抑制幅度
- 对于样本间的相对关系：反转效应 → 小幅度样本变大幅度

---

## 发现四：架构差异的影响

### Pre-Norm vs Post-Norm

归一化层在 Transformer 中的位置也深刻影响着量化行为：

**Post-Norm（原始 Transformer）**：

```txt
x → Attention → Add & LayerNorm → FFN → Add & LayerNorm
```

归一化在残差连接之后。这种设计中，离群值在归一化后直接进入下一层，影响更为直接。

**Pre-Norm（现代 LLM）**：

```txt
x → LayerNorm → Attention → Add → LayerNorm → FFN → Add
```

归一化在子层之前。这种设计中，残差连接保持了原始的 $x$，归一化只影响进入子层的激活。

在 Pre-Norm 架构中（LLaMA、Qwen 等），**RMSNorm 的输出直接作为量化层的输入**，因此 RMSNorm 的分布变换对量化的影响更加直接。

### LLaMA 的特殊性

Spike Aware 论文还揭示了 LLaMA 架构的一个特殊现象：

**离群值的传播路径**：

```txt
  down_proj (第 2 层)
→ 残差连接
→ RMSNorm
→ ...
→ 残差连接
→ RMSNorm
→ ...
→ down_proj (最后层)
```

在 LLaMA 中，激活 spike 最初由 FFN 中的 down_proj 层产生，然后通过残差连接逐层传播。RMSNorm 在传播过程中削弱了 spike 的幅度，但 down_proj 在最后几层再次产生巨大的 spike。

这意味着：**在 LLaMA 架构中，量化问题不仅仅是归一化层的问题，更是归一化层与特定层（down_proj）的交互问题**。

---

## 现有方法的系统梳理

面对归一化层带来的量化挑战，研究者们提出了多种应对策略。我将它们分为四个类别：

### 第一类：修改归一化层本身

**Single-Scale RMSNorm (OSP, ACL 2025)**

核心思想：用标量 $\gamma \in \mathbb{R}$ 替代向量 $\gamma \in \mathbb{R}^d$，消除通道间的缩放差异。

$$\text{Single-Scale RMSNorm}(z) = \frac{z}{\text{RMS}(z)} \cdot \gamma$$

效果：训练出的模型离群值几乎为零（excess kurtosis = 0.04 vs 标准模型的 1818.56），在 4-bit 量化下表现显著更好。

局限：**只能在预训练时使用**，对已有的模型无能为力。且标量 γ 降低了模型的表达能力。

**Quantizable Transformers (NeurIPS 2023)**

核心思想：修改注意力机制，使其学会"什么都不做" (do nothing)，从而避免离群值的产生。

通过在注意力机制中引入特殊的 bias 项，使得模型可以选择性地跳过某些 token 的计算，从根本上减少离群值。

局限：需要从头训练，且修改了标准的 Transformer 架构。

### 第二类：迁移归一化层的参数

**Gamma Migration (NeurIPS 2022)**

如前所述，将 γ 从 LayerNorm 中迁移出去，吸收进后续权重。

**Outlier Suppression+ (EMNLP 2023)**

更进一步，不仅迁移 γ，还引入了**通道级平移** (channel-wise shifting) 来消除激活的不对称性：

$$z' = (z - \mu) \oslash s$$

其中 $s$ 是优化得到的缩放向量。然后将平移和缩放参数等价地迁移到后续层。

关键创新：提出了**最小化输出变化**的优化目标——不是分别最小化激活和权重的量化误差，而是最小化两者联合导致的输出误差：

$$\min_{s} \mathbb{E}\left[\|Q(X_f \oslash s) \cdot (s \odot W) - X_f W\|^2\right]$$

### 第三类：在归一化层之后/之前应用变换

**SmoothQuant (ICLR 2023)**

核心思想：激活的量化难度可以"迁移"到权重上。通过 per-channel 缩放，将激活中的离群通道缩小，同时将权重中对应的通道放大：

$$Y = (X \oslash s) \cdot (s \odot W)$$

其中 $s$ 通过启发式方法确定：$s_j = \frac{\max(|X_j|)^\alpha}{\max(|W_j|)^{1-\alpha}}$。

**QuaRot / SpinQuant / FlatQuant**

旋转类方法，在归一化层之后应用正交变换（Hadamard 或可学习的旋转），将离群值的能量"分散"到多个通道上：

$$Y = \text{RMSNorm}(X) \cdot R \cdot R^T \cdot W = \text{RMSNorm}(X) \cdot W$$

其中 $R$ 是正交矩阵。由于 $RR^T = I$，数学上等价，但量化时可以在旋转后的空间中进行。

### 第四类：重新设计归一化+量化的流程

**NSNQuant (NeurIPS 2025)**

针对 KV Cache 量化，提出了 Normalize-Shift-Normalize (NSN) 三步变换：

1. **Normalize**：token-wise 归一化，消除离群 token 的影响
2. **Shift**：channel-wise 中心化，使分布零均值
3. **Normalize**：再次 token-wise 归一化

配合 Hadamard 变换，将分布对齐到标准正态分布，从而可以使用固定的 codebook 进行无校准量化。

**HadaNorm (2025)**

针对 Diffusion Transformer，提出在 Hadamard 变换之前进行通道中心化：

$$\text{HadaNorm}(z) = \text{Hadamard}\left(\frac{z - \bar{z}}{\sigma_z}\right)$$

核心发现：**先中心化再旋转，比直接旋转效果好得多**。这是因为中心化使各通道的分布更加对称，Hadamard 变换的混合效果更好。

---

## 现有方法的根本局限

回顾上述方法，它们都存在一个共同的根本性问题：

> **归一化层和量化是被分别优化的两个独立组件。**

具体来说：

| 方法类别 | 核心思路 | 局限 |
|---------|---------|------|
| 修改归一化层 | 让归一化层本身更"友好" | 需要重新训练，不适用于已有模型 |
| 参数迁移 | 将 γ 等参数迁移到后续层 | 只解决了 γ 的问题，没解决分布变换的问题 |
| 后置变换 | 在归一化后应用额外变换 | 是"打补丁"式的方案，增加了复杂度 |
| 重设计流程 | 重新组织归一化和量化 | 针对特定场景（KV Cache），不通用 |

**根本矛盾**在于：

1. **归一化层的优化目标**：使激活分布稳定，梯度传播顺畅
2. **量化的需求**：使激活分布紧凑，离群值少

这两个目标在本质上是不同的。现有的所有方法都是在**训练完成之后**再去修补归一化层带来的量化问题，而不是在**训练过程中**就让归一化层兼顾量化的需求。

---

## 一个新的研究方向：Quantization-Aware Normalization

基于以上分析，我认为存在一个全新的研究方向：

> **设计一种 Quantization-Aware Normalization 层，使其在保持训练稳定性的同时，产生对量化友好的激活分布。**

### 核心思想

传统思路：`RMSNorm(训练) → 离群值 → 后处理 → 量化`

新思路：`QANorm(训练+量化联合优化) → 量化友好分布 → 直接量化`

### 可能的实现路径

**路径一：可学习的目标分布归一化**

标准 RMSNorm 将激活归一化到单位 RMS。但单位 RMS 并不是对量化最优的分布。我们可以设计一种归一化层，将激活映射到一个**对量化最优的目标分布**：

$$\text{QANorm}(z) = \frac{z}{\tau(z; \theta)} \odot \gamma(\theta)$$

其中 $\tau(z; \theta)$ 是一个可学习的归一化因子，$\gamma(\theta)$ 是可学习的通道缩放。训练目标为：

$$\min_\theta \mathcal{L}_{\text{task}} + \lambda \cdot \mathcal{L}_{\text{quant}}$$

其中 $\mathcal{L}_{\text{quant}}$ 衡量归一化后激活的量化误差。

**路径二：两阶段归一化**

受 NSNQuant 启发，设计一种两阶段归一化：

```
阶段 1: h = RMSNorm(z)              — 标准归一化，保持训练稳定性
阶段 2: h' = QuantScale(h; θ)       — 可学习的量化感知缩放
```

其中 QuantScale 通过 STE (Straight-Through Estimator) 穿过量化器进行训练，直接最小化量化后的任务损失。

**路径三：归一化+旋转的联合优化**

将归一化和旋转合并为一个统一的操作：

$$\text{RotNorm}(z) = \text{Hadamard}(\text{RMSNorm}(z)) \odot \gamma'(\theta)$$

其中 $\gamma'$ 是可学习的，补偿 RMSNorm 和 Hadamard 带来的分布偏移。

**路径四：分布匹配归一化**

设计一种归一化层，使其输出分布与特定的量化友好分布（如均匀分布）相匹配：

$$\text{DMNorm}(z) = F^{-1}\left(\Phi\left(\frac{z - \mu_z}{\sigma_z}\right); \text{target}\right)$$

其中 $\Phi$ 是标准正态 CDF，$F^{-1}$ 是目标分布的逆 CDF。这确保了输出的分布在理论上对量化最优。

### 理论基础

这些路径的理论基础可以从两个角度建立：

**角度一：信息论**

量化误差可以被建模为信息损失。最优的量化方案应该最大化保留的信息量。对于一个归一化层，其输出分布应该最大化量化后的互信息：

$$\max_\theta I(z; Q(\text{QANorm}(z; \theta)))$$

**角度二：Fisher 信息**

量化误差对最终任务损失的影响可以通过 Fisher 信息来衡量。最优的归一化应该最小化量化后的 Fisher 信息损失：

$$\min_\theta \text{Tr}\left(F_\theta \cdot \text{Cov}[Q(\text{QANorm}(z; \theta)) - \text{QANorm}(z; \theta)]\right)$$

### 预期的优势

与现有方法相比，Quantization-Aware Normalization 的优势在于：

1. **统一优化**：归一化和量化在同一个框架中优化，而不是分别处理
2. **自适应性**：归一化层可以自适应地调整输出分布，使其对量化友好
3. **端到端**：从输入到量化输出的整个流程都是可微分的
4. **通用性**：可以应用于任何使用归一化层的 Transformer 架构

### 潜在的挑战

当然，这一方向也面临诸多挑战：

1. **训练稳定性**：修改归一化层可能影响训练的稳定性
2. **计算开销**：额外的可学习参数和计算可能增加推理延迟
3. **泛化性**：对量化友好的分布可能不是对所有任务都最优
4. **与现有方法的兼容性**：需要与 GPTQ、AWQ 等现有量化方法配合使用

---

## 总结与展望

Normalization 与 Quantization 之间的关系，远比表面上看起来的要复杂。本文梳理了这一领域的关键发现：

1. **γ 是离群值的放大器**（Outlier Suppression, 2022）
2. **RMSNorm 产生反转效应**（EMNLP 2025）
3. **离群值的来源存在通道级和张量级的矛盾**（Spike Aware, 2026）
4. **现有方法都是"事后修补"**，没有从根本上解决问题

我认为，**Quantization-Aware Normalization** 是一个值得深入探索的研究方向。它不仅有理论上的优美性（统一优化归一化和量化），也有实际的应用价值（改善 LLM 的量化性能）。

未来的工作可以从以下几个方向展开：

- **理论分析**：建立归一化层输出分布与量化误差之间的精确数学关系
- **实验验证**：在主流 LLM（LLaMA、Qwen 等）上验证 Quantization-Aware Normalization 的效果
- **硬件协同**：设计对硬件友好的归一化-量化融合算子
- **预训练整合**：在预训练阶段就引入量化感知的归一化

---

## 参考文献

- Wei et al., "Outlier Suppression: Pushing the Limit of Low-bit Transformer Language Models", NeurIPS 2022
- Wei et al., "Outlier Suppression+: Accurate Quantization of Large Language Models by Equivalent and Effective Shifting and Scaling", EMNLP 2023
- Xiao et al., "SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models", ICLR 2023
- Ashkboos et al., "QuaRot: Outlier-Free 4-Bit Inference in Rotated LLMs", 2024
- Liu et al., "SpinQuant: LLM Quantization with Learned Rotations", 2024
- Sun et al., "FlatQuant: Flatness Matters for LLM Quantization", ICML 2025
- Kim et al., "Why Do Some Inputs Break Low-Bit LLMization?", EMNLP 2025
- Lee et al., "Outlier-Safe Pre-Training for Robust 4-Bit Quantization of Large Language Models", ACL 2025
- NSNQuant: "A Double Normalization Approach for Calibration-Free Low-Bit Vector Quantization of KV Cache", NeurIPS 2025
- HadaNorm: "Diffusion Transformer Quantization through Mean-Centered Transformations", 2025
- Spike Aware: "A Novel Spike Aware Mixed-Precision Quantization Strategy", HAL-Inria 2026
- Bondarenko et al., "Quantizable Transformers: Removing Outliers by Helping Attention Heads Do Nothing", NeurIPS 2023
- Lee et al., "KronQ: LLM Quantization via Kronecker-Factored Hessian", 2026
- ICBQ: "From Sweep to Seam: Interleaved Cross-Block Post-Training Quantization", 2026
