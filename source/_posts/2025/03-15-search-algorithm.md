---
layout: post
title: BFS、DFS、UCS、A*：常用的搜索算法简介 🔎
categories:
    - 💻 技术干货
    - 数据结构与算法
tags: [数据结构与算法, 搜索算法, 人工智能]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00013.jpg
date: 2025-03-15 13:34:24
---

> 正文前的碎碎念：DeepSeek 和 CUDA 两篇博客有点过于硬核了，更新速度一直缓慢，整个 2 月份居然没有开新博客！！今天开一个小一点的话题，讲一下深搜、广搜、UCS 和 A\*。

# 搜索算法简介：BFS、DFS、UCS、A* 🔎

在人工智能中，搜索算法是解决复杂问题的核心工具。无论是迷宫求解、拼图问题还是路径规划，搜索算法都能帮助我们找到从初始状态到目标状态的最佳路径。本文将简要介绍四种常见的搜索算法：广度优先搜索（BFS）、深度优先搜索（DFS）、一致代价搜索（UCS）和 A* 搜索。

## 搜索问题表述和图搜索形式

在应用搜索算法之前，我们需要明确搜索问题 (search algorithm) 的五个关键要素：

1. 初始状态 (initial state)：问题的起点。
2. 动作 (actions)：从当前状态可以采取的操作。
3. 转换模型 (transition model)：描述动作如何改变状态。
4. 目标测试 (goal test)：判断当前状态是否为目标状态。
5. 路径成本 (path cost)：评估路径的代价。

<div style="display:flex; justify-content:space-between;">
<div>

> 示例：迷宫求解
> - 初始状态：机器人在迷宫的起点。
> - 动作：向上、下、左、右移动。
> - 转换模型：根据移动方向更新机器人位置。
> - 目标测试：检查是否到达迷宫出口。
> - 路径成本：移动次数或路径长度。

</div>
<div>
  <svg width="200" height="200" viewBox="0 0 400 400"><defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="#e0e0e0" stroke="#000000" stroke-width="1"></rect></pattern></defs><rect width="400" height="400" fill="url(#grid)"></rect><g fill="#000000"><rect x="0" y="0" width="400" height="50"></rect><rect x="0" y="0" width="50" height="400"></rect><rect x="350" y="0" width="50" height="400"></rect><rect x="0" y="350" width="400" height="50"></rect><rect x="100" y="50" width="50" height="150"></rect><rect x="200" y="200" width="50" height="150"></rect><rect x="250" y="50" width="50" height="100"></rect><rect x="50" y="250" width="100" height="50"></rect></g><circle cx="75" cy="375" r="20" fill="#ff0000"></circle><rect x="350" y="50" width="50" height="50" fill="#00ff00"></rect></svg>
</div>
</div>

<br>针对搜索问题，通用的解法是将其转换为 **图搜索** 的形式。图搜索核心逻辑是：

1. 将初始状态 $S$ 加入边界集合 frontier
2. 从边界集合 frontier 中取出节点 $N$
3. 若 $N$ 是终点 $T$，表明找到路径，将解返回，跳过以下步骤
4. 否则，检查 $N$ 的状态，若 $N$ 标记为已探索，则将其丢弃，并跳至步骤 2
5. 若 $N$ 为未探索，将其标记为已探索，并进行如下步骤
6. 扩展 $N$ ，将全部子节点加入边界集合 frontier，随后调至步骤 2
7. 如果没能在步骤 3 返回解，但边界集合 frontier 已空，证明该问题无解

```python
def graphSearch():
    frontier = [ initState ]
    while frontier:
        N = frontier.pop()
        if N.isGoalState(): return solution
        if N.isExplored(): continue
        N.hasBeenExplored()
        frontier.add(expand(state))
    return None
```

在一般图搜索的基础上，演变出了 BFS、DFS、UCS 和 A\* 等算法。它们的不同之处主要在于对边界集合的处理方式上，具体表现为 **边界集合的数据结构和入队、出队策略有所不同**。接下来进行详细介绍。

## 广度优先搜索 (BFS)

- BFS 从起始节点开始，逐层扩展，直到找到目标节点。
- 它使用队列来实现，确保先访问的节点先被扩展。
- 仅能保证动作数最少，无法保证搜索结果的路径代价最小。

```python
from collection import deque

def bfs(initState, getActions, transModel, goalTest):
    frontier = deque([(initState, list())])
    explored = set()

    while frontier:
        curState, lstActions = frontier.popleft()
        if goalTest(curState):
            return lstActions
        if curState not in explored:
            explored.add(curState)
            for action in getActions(curState):
                nextState = transModel(curState, action)
                frontier.append((nextState, lstActions + [action]))
    return None
```

## 深度优先搜索 (DFS)

- DFS 从起始节点开始，沿着一条路径深入，直到无法继续为止，然后回溯并尝试其他路径。
- 它使用栈来实现，确保每次仅访问当前层深度的一个节点。
- 同样无法保证搜索结果的路径代价最小。

```python
def dfs(initState, getActions, transModel, goalTest):
    frontier = [(initState, list())]
    explored = set()

    while frontier:
        curState, lstActions = frontier.pop()
        if goalTest(curState):
            return lstActions
        if curState not in explored:
            explored.add(curState)
            for action in getActions(curState):
                nextState = transModel(curState, action)
                frontier.append((nextState, lstActions + [action]))
    return None
```

## 一致代价搜索 (UCS)

- UCS 在扩展节点时考虑路径的成本，优先扩展成本最低的节点。
- 它使用优先队列来实现。
- 能够保证搜索结果的路径代价最小。

```python
import heapq

def ucs(initState, getActions, transModel, goalTest, pathCost):
    frontier = []
    heapq.heappush(frontier, (0, initState, list()))
    explored = set()

    while frontier:
        curCost, curState, lstActions = heapq.heappop(frontier)
        if goalTest(curState):
            return lstActions
        if curState not in explored:
            explored.add(curState)
            for action in getActions(curState):
                nextState = transModel(curState, action)
                newCost = curCost + pathCost(curState, action)
                heapq.heappush(frontier, (newCost, nextState, lstActions + [action]))
    return None
```

<br>**证明：UCS 能保证最优性**

- 假设在搜索树中存在最优终点 $T_a$ 和次优终点 $T_b$（下标为代价，$a<b$）
- 若 $T_a$ 已在队列中，则无论 $T_b$ 入队与否，$T_a$ 总是先出队，从而返回最优路径
- 若 $T_a$ 不在队列中，而 $T_b$ 在队列中。我们总是能在队列中找到节点 $n$，它是 $T_a$ 的前序
- 对任何这样的 $n$，恒有 $g(n) < g(T_a) < g(T_b)$（其中 $g(·)$ 表示到达该节点的代价）
- **那么 $T_a$ 及其所有的前序节点 $n$ 总是比 $T_b$ 先出队**。也即，除非 $T_a$ 出队，否则 $T_b$ 滞留
- 该推理证明 UCS 总能保证最优。<text style="color:gray;">该推理过程还能推广到其他所有的中间节点（如 $M_c$ 和 $M_d$）</text>

## A-Star 搜索 (A\*)

- A\* 算法结合了 UCS 和启发式搜索，使用启发式函数来估计从当前节点到目标节点的成本。
- 它同样使用优先队列，但排序依据是 `f(n) = g(n) + h(n)`。
- `g(n)` 是从起始节点到当前节点的实际成本。
- `h(n)` 是启发式估计，它估量从当前节点到终点的成本。
- **当启发式估计可接受时，**能够保证搜索结果的路径代价最小。

```python
import heapq

def aStar(initState, getActions, transModel, goalTest, pathCost, heuristic):
    frontier = []
    heapq.heappush(frontier, (heuristic(initState), 0, initState, list()))
    explored = set()

    while frontier:
        _, gCost, curState, lstActions = heapq.heappop(frontier)
        if goalTest(curState):
            return lstActions
        if curState not in explored:
            explored.add(curState)
            for action in getActions(curState):
                nextState = transModel(curState, action)
                g = gCost + pathCost(curState, action)
                h = heursitic(nextState)
                heapq.heappush(frontier, (g + h, g, nextState, lstActions + [action]))
```

<br>**A\* 与可接受的启发**

- A\* 能保证最优，当且仅当给定的启发 $h(n)$ 是可接受的 (addmissible)
- 所谓“可接受”，是指：**对于搜索树中的所有节点 $n$，$0 \le h(n) \le h^\star(n)$ 恒成立**
- 其中，$h^\star(n)$ 为从节点 $n$ 到终点的真实代价，也即 $h^\star(n) = g(T) - g(n)$
- 可以证明：当 $h(n)$ 可接受时，A* 能够保证搜索到的结果最优，思路与证明 UCS 时一致：
    - 同样考虑 $T_a$, $T_b$ 和节点 $n$，已知 $h(·)$ 是可接受的
    - 我们总是有：$f(n) = g(n) + h(n) \le g(n) + h^\star(n) = f(T_a) < f(T_b)$
    - 因此除非 $T_a$ 及其所有前序都出队，否则 $T_b$ 滞留，故 A\* 能够保证最优
- 相较于 UCS，A\* 引入启发来估计节点到终点的距离，**好的启发应当是接近真实距离的**
- 启发越接近真实值，A\* 的搜索效率就越高，就能越快找到最优路径

## 总结与反思

|算法|数据结构|最优性|时间复杂度|空间复杂度|
|-|-|-|-|-|
|BFS|队列|动作数最少|$O(b^d)$|$O(b^d)$|
|DFS|栈|非最优|$O(b^m)$|$O(bm)$|
|UCS|优先队列|保证最优|$O(b^{C^\star/\epsilon})$|$O(b^{C^\star/\epsilon})$|
|A*|优先队列|启发可接受时最优|$O(b^d)$|$O(b^d)$|

> 注：$b$ 为分支因子，$d$ 为最优解深度，$m$ 为最大深度，$C^\star$ 为最优解成本，$\epsilon$ 为最小单步成本。

实际应用中需根据问题特性选择算法：当需要最短路径且状态空间较小时选择 BFS；当内存受限时考虑 DFS；需要最优成本路径时用 UCS；若存在高质量启发式函数则优先选择 A\*。
