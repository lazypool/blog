---
layout: post
title: 抱脸社区：Transformers，启动🥳
date: 2023-11-16 02:16:27
categories:
  - 🔧 工具使用
  - 实用工具指南
tags: [人工智能, Transformer]
index_img: animals/00002.jpg
---

# Transformers，启动

Huggingface 在 2023 年大放异彩，成为 AI 领域最活跃的开源网站，前途不可限量。

## 书写前言

工欲善其事，必先利其器。

现如今，Transformers 已经被封装成一个独立的包，由 Huggingface 以社区的形式维护。

学习 Transformers 十分重要！作为在各个领域霸榜的存在，任何与 AI 打交道的人都不可能绕开它。

被封装好的 Transformers 十分便利！三行训练一个模型！随时随地导出！在多个框架间共享！

Hugginface 覆盖了绝大多数的 Transformers 的衍生模型，并维护了一个良好的开发生态 Hub。

最重要的是，Hugginface 提供了一个简明易懂的[官方文档](https://hugginface.co/docs/transformers/index)。

## 安装方法

一切神话，始于安装。像安装普通的包那样安装 Transformer 即可。

通常来说，需要搭配某个深度学习框架，比如 Pytorch。

当然，良好的包管理方式是先创建一个虚拟环境。

通常我们把它放在项目目录下的 .env 隐藏文件，并用 .gitignore 将其忽略。

```bash
python -m venv .env
echo ".env" >> .gitignore
```

之后在该虚拟环境中根据我们的需求安装。

```bash
source .env/bin/activate
pip install 'transformers[torch]'
```

## 本地设置

从远程实时下载模型是一个很美妙的想法，但因为诸如 GFW 等的原因，它并不总能实现。

更常见的情况下，我们需要缓存设置和离线模式。

### 缓存设置

预训练模型下载后通常被放到了 ~/.cache/huggingface/hub 下。

这个文件夹是默认的，除非环境变量 TRANSFORMERS_CACHE 被指定。

自然地，我们想到需要修改 shell 的环境变量：

1. HUGGINGFACE_HUB or TRANSFORMERS_CACHE
2. HF_HOME
3. XDG_CACHE_HOME + /huggingface

Transformers 会按照优先级选择将模型下载到什么地方。

由于我们使用虚拟环境下安装，推荐的做法是将环境变量的指定添加到 activate 文件中。

```bash
echo "export TRANSFORMERS_CACHE=$(echo $VIRTUAL_ENV|sed 's/\.env/\.cache/')" >> .env/bin/activate
sed -i '/deactivate () {/a unset TRANSFORMERS_CACHE' .env/bin/activate
```

以上命令需要在虚拟环境下执行。

### 离线模式

作为 GFW 内的子民，我们更多的想要使用离线模式。

其实离线模式就是将模型下载到本地缓存起来，然后调用。

需要指定环境变量 TRANSFORMERS_OFFLINE = 1 以开启。

```bash
echo "export TRANSFORMERS_OFFLINE=1" >> .env/bin/activate
sed -i '/deactivate () {/a unset TRANSFORMERS_OFFLINE' .env/bin/activate
```

这样一来它将不会试图从 Hub 下载文件，相应的，你需要在本地准备模型文件。

所有文件都可以从 [Hub](https://huggingface.co/models) 下载，它们是有人维护的。

### 下载文件

要从 Hub 上逐一下载模型文件是愚蠢的。

优雅的方式是借助第三方工具 git 来下载。

但模型文件一般很大，而 git 保存 diff 的方式会使得仓库动辄几百 G。

因此，我们需要先安装 LFS 工具，它是与 git 集成的。

关于 git-lfs 的安装与配置，请查看 GitHub 的[官方文档](https://docs.github.com/zh/repositories/working-with-files/managing-large-files/about-git-large-file-storage)。

不过部分 Linux 发行版具有更加简单、安全的安装方式。

```bash
sudo pacman -S git-lfs
git lfs install
```

使用 git-lfs 的好处就是可以不用把所有大模型文件都下载下来，而只需要根据需要 pull 即可。

这里以 BERT 为例，首先可以把所有的小文件都下载下来。

```bash
cd .cache
GIT_LFS_SKIP_SMUDGE=1 git clone https://huggingface.co/bert-base-uncased
```

我们会发现所有标有 LFS 的大文件都被存储成了指针文件。

## 快速开始

### Pipeline 函数

流程函数 Pipeline() 是官方提供的一个懒人函数，可以使用最简单、最便利的方法迅速调用一个模型到指定任务。

比如，我想进行一次简单的情感分析任务。

```python
from transformers import pipeline

classifier = pipeline("sentiment-analysis")

classifier("We are very happy to show you the 🤗 Transformers library.")
```

```output
[{'label': 'POSITIVE', 'score': 0.9998}]
```

当然，Pipeline() 还可以指定模型、数据集和 Tokenizer，具体可以查看官方文档。

### AutoClasss 类

事实上，Pipeline() 是对 AutoClass 中各个组件即部分功能的集成。

而 AutoClass 是 transformers 的基本类，包括 Tokenizer 类, Model 类和 Configuration 类。

所有相关的类都衍生自这 3 个类，它们都有 save_pretrained() 和 from_pretrained() 方法。

#### Tokenizer 类

分词器 Tokenizer 用于将文本处理成一列数字作为模型输入。

Tokenization 的过程须遵循一定规则，具体参见[官方总结](https://huggingface.co/docs/transformers/tokenizer_summary)。

Tokenizer 须保持和模型一致。譬如，BERT 就需要使用 BERT 的 Tokenzier。

```python
from transformers import AutoTokenizer

model_name = "nlptown/bert-base-multilingual-uncased-sentiment"
tokenizer = AutoTokenizer.from_pretrained(model_name)

encoding = tokenizer("We are very happy to show you the 🤗 Transformers library.")
print(encoding)
```

```output
{'input_ids': [101, 11312, 10320, 12495, 19308, 10114, 11391, 10855, 10103, 100, 58263, 13299, 119, 102],
 'token_type_ids': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 'attention_mask': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]}
```

按照约定，Tokenizer 返回一个包含如下字段的字典：

- input_ids: token 的数字表示。
- token_type_ids: token 属于句子 A 还是句子 B
- attention_mask: 表示哪一个 token 需要被注意。

Tokenzier 能够接受一个 list 并返回一个 batch，只需指定是否填充和截断。

```python
pt_batch = tokenizer(
    ["We are very happy to show you the 🤗 Transformers library.", "We hope you don't hate it."],
    padding=True,
    truncation=True,
    max_length=512,
    return_tensors="pt",
)
```

#### Model 类

下载 AutoModel 和下载 Tokenizer 一样简单，只是你需要根据任务需求选择合适的模型。

譬如，对于文本分类任务，你需要下载 AutoModelForSequenceClassification。

```python
from transformers import AutoModelForSequenceClassification

model_name = "nlptown/bert-base-multilingual-uncased-sentiment"
pt_model = AutoModelForSequenceClassification.from_pretrained(model_name)
```

你可以将 batch 直接输入模型，只需为 dictionary 加上 \*\* 的修饰符。

```python
pt_outputs = pt_model(**pt_batch)
```

模型输出了最后的激活值，只需再套一个 softmax 就能做分类。

```python
from torch import nn

pt_predictions = nn.functional.softmax(pt_outputs.logits, ndim=-1)
print(pt_predictions)
```

```output
tensor([[0.0021, 0.0018, 0.0115, 0.2121, 0.7725],
        [0.2084, 0.1826, 0.1969, 0.1755, 0.2365]], grad_fn=<SoftmaxBackward0>)
```

#### Configuration 类

模型的设置是可以被修改的，包括一些超参数。

这是因为当你从一个 Config 类初始化模型时，它是从头开始的。

你只需引入 AutoConfig 类并调用 from_pretrained() 函数。

```python
from transformers import AutoConfig

my_config = AutoConfig.from_pretrained("distilbert-base-uncased", n_heads=12)
```

然后将其通过 from_config() 函数调用。

```python
from transformers import AutoModel

my_model = AutoModel.from_config(my_config)
```

### Save/From 函数

模型训练完后，通过调用 tokenizer 的 save_pretrained() 函数即可保存。

```python
pt_save_directory = "./pt_save_pretrained"
tokenizer.save_pretrained(pt_save_directory)
pt_model.save_pretrained(pt_save_directory)
```

如需复用模型，通过 from_pretrained() 函数即可。这也是从远程下载模型的函数。

```python
tf_model = TFAutoModelForSequenceClassification.from_pretrained("./tf_save_pretrained")
```

## 项目实例

在这里以语义相似度分析为例，做一个简单的模型搭建与训练案例，预训练模型选用 BERT。

### 加载数据

数据集选用的是 STSBenchmark，是经典的语义相似度数据集，可以在[此处](http://ixa2.si.ehu.es/stswiki/images/4/48/Stsbenchmark.tar.gz)获取。

STSBenchmark 以 CSV 个格式存储。其中，第 4 列是两个语句的相似度，为从 0 到 5 的浮点数。第 5 列和第 6 列是两个英文语句。

```csv
main-captions MSRvid 2012test 0000 5.000 A man with a hard hat is dancing. A man wearing a hard hat is dancing.
main-captions MSRvid 2012test 0002 4.750 A young child is riding a horse. A child is riding a horse.
main-captions MSRvid 2012test 0003 5.000 A man is feeding a mouse to a snake. The man is feeding a mouse to the snake.
```

#### Dataset

Pytorch 通过 Dataset 类和 DataLoader 类处理数据集和加载样本。同样地，这里我们首先继承 Dataset 类构造自定义数据集，以组织样本和标签。

```python
from torch.utils.data import Dataset


class STS(Dataset):
    def __init__(self, data_file):
        self.data = self.load_data(data_file)

    def load_data(self, data_file):
        data = {}
        with open(data_file, "r") as file:
            for idx, line in enumerate(file):
                row = line.strip().split("\t")
                data[idx] = {"score": row[4], "sent1": row[5], "sent2": row[6]}
        return data

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx]


sts_dev = STS("data/stsbenchmark/sts-dev.csv")
print(sts_dev[0])
```

```output
{'score': '5.000', 'sent1': 'A man with a hard hat is dancing.', 'sent2': 'A man wearing a hard hat is dancing.'}
```

可以看到，我们编写的 STS 类成功读取了数据集。

每个样本以字典的形式保存，分别以 score, sent1, sent2 为键存储相似度和句子对。

#### DataLoader

我们需要 DataLoader 按 batch 加载数据，并将样本转换为模型可以接受的输入格式。

对于 NLP 任务，这个环节就是将每个 batch 中的文本按照预训练模型的格式进行编码，并进行填充和截断操作。

```python
from torch.utils.data import DataLoader
from transformers import BertTokenizer


def collote_fn(batch_samples):
    batch_score, batch_sent1, batch_sent2 = [], [], []
    for sample in batch_samples:
        batch_score.append(float(sample["score"]))
        batch_sent1.append(sample["sent1"])
        batch_sent2.append(sample["sent2"])
    X = tokenizer(
        batch_sent1, batch_sent2, padding=True, truncation=True, return_tensors="pt"
    )
    y = torch.tensor(batch_score)
    return X, y


def build_dataloader():
    sts_train = STS("data/stsbenchmark/sts-train.csv")
    sts_test = STS("data/stsbenchmark/sts-test.csv")

    train_loader = DataLoader(sts_train, batch_size=4, shuffle=True, collate_fn=collote_fn)
    test_loader = DataLoader(sts_test, batch_size=4, shuffle=True, collate_fn=collote_fn)
    return train_loader, test_loader


train_loader, test_loader = build_dataloader()
batch_X, batch_y = next(iter(train_loader))
print('batch_X shape:', {k:v.shape for k,v in batch_X.items()})
print('batch_y shape:', batch_y.shape)
print(batch_X)
print(batch_y)
```

```output
batch_X shape: {'input_ids': torch.Size([4, 40]), 'token_type_ids': torch.Size([4, 40]), 'attention_mask': torch.Size([4, 40])}
batch_y shape: torch.Size([4])
{'input_ids': tensor(
  [[  101,  6304,  2008,  3477,  1996,  1002,  1015,  1010, 20636,  4211,
          7408,  2131, 22434,  2494,  2007,  2184,  5080,  7396,  3229, 15943,
          1012,   102,  7027, 20874,  2005, 22434,  2494,  2007,  2184,  5080,
          7396,  3229, 15943,  2003,  1002,  1015,  1010, 20636,  1012,   102],
        [  101,  6458,  1024,  2158,  8980,  2015,  7376,  2482,  4413,  2086,
          2101,   102,  2149,  2158,  8980,  2015,  2482,  4413,  2086,  2044,
         11933,   102,     0,     0,     0,     0,     0,     0,     0,     0,
             0,     0,     0,     0,     0,     0,     0,     0,     0,     0],
        [  101,  2416,  6077,  2770,  2006,  1996,  7525,  3509,  1012,   102,
          2416,  6077,  3788,  3875,  1996,  3509,  1012,   102,     0,     0,
             0,     0,     0,     0,     0,     0,     0,     0,     0,     0,
             0,     0,     0,     0,     0,     0,     0,     0,     0,     0],
        [  101,  1996,  7726,  2231,  3090,  1011,  1011,  1996,  7726,  4517,
          2565,  3464,  9379,  1012,   102,  1996,  7726,  2231,  2758,  1996,
          4517,  2565,  2003,  9379,  1012,   102,     0,     0,     0,     0,
             0,     0,     0,     0,     0,     0,     0,     0,     0,     0]]),
'token_type_ids': tensor(
  [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,
         1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1,
         1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]),
'attention_mask': tensor(
  [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
         1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,
         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
         0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
         1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]])}
tensor([4.3330, 4.0000, 3.4000, 5.0000])
```

DataLoader 按照我们设置的 batch size 每次对 4 个样本进行编码。

并且通过填充和截断的操作使得每个样本的长度相同，填充位置 0 并且相应的 attention_mask 置 0。

这里我们选择的是 BERT 的编码器，因此每个样本都被处理成了"[CLS] sent1 [SEP] sent2 [SEP]" 的形式。

[CLS] 对应的 input_ids 是 101, 而 [SEP] 对应的 input_ids 是 102。

### 构建模型

这里实现了一个极其简单的模型，他只在预训练的 BRET 上添加了一个全连接层。

```python
from torch import nn
from transformers import BertModel, BertConfig


class BertForSTS(BertModel):
    def __init__(self, config):
        super().__init__(config)
        self.bert = BertModel(config, add_pooling_layer=False)
        self.dropout = nn.Dropout(config.hidden_dropout_prob)
        self.classifier = nn.Linear(768, 1)
        self.post_init()

    def forward(self, x):
        bert_output = self.bert(**x)
        cls_vectors = bert_output.last_hidden_state[:, 0, :]
        cls_vectors = self.dropout(cls_vectors)
        logits = self.classifier(cls_vectors)
        return logits


def build_model():
    config = BertConfig.from_pretrained("bert-base-uncased")
    model = BertForSTS.from_pretrained("bert-base-uncased", config=config)
    return model
```

BERT 首先会将输入编码为 768 维的向量，之后利用一层全连接将 768 维映射成一个实数来进行回归。

注意，此时我们的模型是 Transformers 预训练模型的子类，因此需要通过预置的 from_pretrained 函数来加载模型参数。

这种方式使得我们可以更灵活地操作模型细节，例如这里 Dropout 层就可以直接加载 BERT 模型自带的参数值。

为了确保模型的输出符合我们的预期，我们尝试将一个 Batch 的数据送入模型。

```python
model = build_model()
outputs = model(batch_X)
print(outputs.shape)
```

```output
torch.Size([4, 1])
```

模型输出了 4X1 的向量，其中 4 是 batch 的大小，1 是输出的维度，符合我们的预期。

### 训练模型

#### 训练组件

总的来说，训练模型需要 loss_fn（损失函数）、optimizer（优化器）、lr_scheduler（学习率调整器）。

其中，损失函数用于计算梯度，优化器用于平滑梯度，学习率调整器用于在训练过程中调整学习率。

```python
import torch.nn as nn
from transformers import AdamW, get_scheduler


def loss_fn(pred, y):
    mse_loss = nn.MSELoss()
    loss = mse_loss(pred.squeeze(), y)
    return loss


learning_rate = 1e-5
optimizer = AdamW(model.parameters(), lr=learning_rate)

epoch_num = 3
lr_scheduler = get_scheduler(
    "linear",
    optimizer=optimizer,
    num_warmup_steps=0,
    num_training_steps=epoch_num*len(train_loader)
)
```

在这里，损失函数使用了 torch.nn 提供的均方误差 MSE。

优化器选用了 AdamW 并指定了学习率为 learning_rate（取 1e-5）。

lr_scheduler 制定了学习率分 epoch_num \* len(train_loader) 步进行下降。

### 训练循环

之后定义训练循环，通过调用上述的 3 个组件来优化模型的参数。

同时借助 tqdm 做了一个进度条来实现训练过程的可视化。

```python
from tqdm.auto import tqdm


def train_loop(dataloader, model, loss_fn, optimizer, lr_scheduler, epoch, total_loss):
    progress_bar = tqdm(range(len(dataloader)))
    progress_bar.set_description(f'loss: {0:>7f}')
    finish_step_num = (epoch-1)*len(dataloader)

    model.train()
    for step, (X, y) in enumerate(dataloader, start=1):
        pred = model(X)
        loss = loss_fn(pred, y)

        # 首先清除优化器已有的梯度
        optimizer.zero_grad()

        # 进行误差的反向传播
        loss.backward()

        # 更新参数
        optimizer.step()

        # 更新优化器的学习率
        lr_scheduler.step()

        total_loss += loss.item()
        progress_bar.set_description(f'loss: {total_loss/(finish_step_num + step):>7f}')
        progress_bar.update(1)
    return total_loss


def test_loop(dataloader, model, mode='Test'):
    assert mode in ['Valid', 'Test']
    size = len(dataloader.dataset)
    correct = 0

    model.eval()
    with torch.no_grad():
        for X, y in dataloader:
            pred = model(X)
            correct += (pred - y).sum().item()

    correct /= size
    print(f"{mode} Accuracy: {(100*correct):>0.1f}%\n")
```

在训练模型时，我们将每一轮 Epoch 分为训练循环和验证/测试循环。

在训练循环中计算损失、优化模型的参数，在验证/测试循环中评估模型的性能

最后，将”训练循环”和”验证/测试循环”组合成 Epoch，就可以进行模型的训练和验证了。

```python
total_loss = 0
for t in range(epoch_num):
    print(f"Epoch {t+1}/{epoch_num}\n-------------------------------")
    total_loss = train_loop(train_loader, model, loss_fn, optimizer, lr_scheduler, t+1, total_loss)
    test_loop(test_loader, model, mode='Test')
print("Done!")
```

完整的训练过程应当如下。

```output
Epoch 1/3
-------------------------------
loss: 0.552296: 100%|█████████████████████████████████| 8584/8584 [07:16<00:00, 19.65it/s]
Valid Accuracy: 72.1%

Epoch 2/3
-------------------------------
loss: 0.501410: 100%|█████████████████████████████████| 8584/8584 [07:16<00:00, 19.66it/s]
Valid Accuracy: 73.0%

Epoch 3/3
-------------------------------
loss: 0.450708: 100%|█████████████████████████████████| 8584/8584 [07:15<00:00, 19.70it/s]
Valid Accuracy: 74.1%

Done!
```

大功告成！你已经成功构建并训练了一个语言模型。

## 资料下载

- STSBenchmark 数据集：[点击下载](Stsbenchmark.tar.gz)
- 案例代码：[点击下载](example.tar.gz)
