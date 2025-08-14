---
layout: post
title: 字节跳动前端工程师初面回忆
tags:
  - 博客
  - 日常
  - 面试
  - 字节跳动
  - 前端
categories:
  - ⛺ 心灵之旅
  - 大厂面经
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00021.jpg
date: 2025-08-14 08:47:07
---







# 字节跳动前端工程师初面回忆

2025 年 8 月 11 日鼓起勇气去试了试字节跳动前端工程师的面试。由于是初面，问的问题都比较基础和简单。但是由于我本人一直致力于研究算法，对前端的知识真的所知甚少，所以面试结果并不尽人意😮‍💨。现在，我想将这次面试遇到的问题总结在此处，方便日后查看。

![字节跳动](bytedance.jpg)

## 飞书：面试的基本形式

之前还傻傻地以为面试都是线下的……特意准备了一套正装。结果后来才搞清楚原来字节的大部分面试都是通过飞书视频进行的。**HR 会给你预约个时间和面试官在视频上见面，个人体验面试官到的会很早，所以尽量提前进会议。** 记得最初使用飞书还是在参加字节跳动青训营的时候。

## Part 1. 请简要介绍下你自己

是的……我在第一个问题就紧张的不得了，感觉自己回答的很不自信。现在想来，这一部分的问题完全可以回答的更流畅。如果再遇到相同的问题，我会按照下面的思路回答：

- 首先，介绍自己的基本信息。包括姓名、学历、主要的研究方向和擅长的领域、与所申请岗位的适配度~（不过我真的是不擅长前端的一些问题）~。
- 其次，说明自身的优势在哪里（学习能力、解决问题的能力、团队协作能力），说明自己的不足在哪里（技术不熟练、对业务问题不熟悉）。
- 最后，表达为什么想要投递该公司（公司的发展方向、整体风貌、企业精神）以及为什么选择该岗位（个人兴趣、学习目的、未来发展）。

## Part 2. 大厂面试八股（浏览器部分）

然后接下来就是跟前端有关各种常见问题。由于是初面，问的都不是很深入，面试官人也挺好，没有特别为难我。但是我还是感觉回答得不是很好。有时候在一个问题上论述了太多的时间，有时候又对另一个问题一头雾水。现将这些问题整理如下：

**1. 进程和线程的区别**

> 这个问题我自认为很熟悉了，但是我没有想到他之后提的问题…………

进程是操作系统分配资源的最小单位，是处于执行状态的程序实例。进程采用虚拟内存技术，互相不可见，进程间的协作需要借助进程间的通信来实现。&emsp;线程是操作系统执行调度的最小单位，是进程内部的任务执行单元，由指令流和数据流交织而成。线程通过共享内存实现高效协作。

**2. 浏览器打开有哪些进程**

> 这属实是问到我的知识盲区了，所以确实没答上来。如果我常用 `ps aux` 也许还有救

最新的 Chrome 浏览器通常包括：1 个浏览器主进程、1 个 GPU 进程、1 个网络服务进程、1 个存储服务进程、若干个渲染服务进程、若干个插件进程。我们平时看到的浏览器呈现出页面过程中，大部分工作都是在渲染进程中完成，包括 HTML、CSS、JS 的解析，Blink 排版引擎和 JS 引擎。

**3. 渲染进程中包含哪些线程**

> 上一个问题都没回答上来，这个问题更加不可能回答上了……

渲染进程是前端工程师关心的主要部分，包括：GUI 渲染线程、JS 引擎线程、计时器线程、异步 http 请求线程、事件触发线程。Javascript 是单线程的，它通过事件循环 EventLoop 和任务队列 TaskQueue 两个机制将同步操作异步化。

**4. HTTP 的缓存机制**

> 这也是一个很经典问题了，考察的知识也很细，当然我答得一塌糊涂

HTTP 的缓存机制是作为浏览器缓存的内容，包括强缓存和协商缓存。强缓存直接使用本地缓存，不会将请求发送至服务器，它通过 `Expires` 和 `Cache-Control` 响应头控制。协商缓存用在强缓存失效时，浏览器向服务器验证资源是否变更。未变更则返回 `304 Not Modified`，否则返回新资源。

## Part 3. 大厂面试八股（Javascript 部分）

**1. Javascript 中的闭包是什么**

> 啊……这个问题我竟然没能回答上，我到底在干什么

闭包是一个函数和其相关的引用环境组合而成的实体，这个函数可以访问不在其自身作用域内的变量。**更简单地说：当一个内部函数访问了其外部函数的变量时，就形成了闭包。**闭包会使其访问的外部变量常驻内存，通常用于生成模块和函数工厂等功能。

**2. this 关键字指向的对象**

> 很基础，但是我没有回答的很好

在 Javascript 中，`this` 是一个特殊的关键字，它的指向对象是动态的。在全局上下文中，`this` 指向全局对象。在函数上下文中，`this` 的指向取决于函数的调用方式。
当函数被简单调用时，`this` 指向全局对象；当函数被作为对象的方法调用时，`this` 指向调用该方法的对象；当函数被作为构造函数调用时（使用 `new` 关键字），`this` 指向新创建的对象实例。
使用 `call`、`apply`、`bind` 可以显式设置 `this` 的值。箭头函数不绑定自己的 `this`，而是继承外层函数上下文的 `this` 值。

**3. Nuxt 和 Next 主要解决了哪些问题**

> 这个之前在我的博客“前端发展 20 年”提过一嘴，现在在这里略微叙述一下

作为基于前端框架 Vue 和 React 的两个全栈框架，Nuxt 和 Next 重点围绕开发者的需求，主要解决以下核心问题：1. 实现 SSR 服务端渲染，首屏由服务器生成完整的 HTML，提升 SEO 和首屏性能。2. 基于文件系统的路由生成方式，便利复杂网站的开发工作。3. 实现了全栈式的架构，将前端和后端部分统一在同一个项目里，使在前端开发时无需额外运行后端服务。

## Part 4. 编程考核（需要使用 Javascript）

**1. 链表相加**

> 这道题比较简单，没一会儿就做出来了，但是当时在处理进位和余数是出现了点小问题

给定两个逆序链表。链表上的每个节点的值介于 0～9，两个链表分别表示两个整数。现将两个链表相加，将得到的整数以同样的链表的形式返回。例如：`3->4->2` + `1->6->5` = `4->0->8`。

```Javascript
var addLinkedList = function(list1, list2) {
    var dummy = new ListNode(0, null),
        ptr1 = list1, ptr2 = list2, cur = dummy,
        a = 0, r = 0;
    while (ptr1 || ptr2) {
        var val1 = ptr1 ? ptr1.val : 0;
        var val2 = ptr2 ? ptr2.val : 0;
        a = val1 + val2 + r;
        r = a >= 10 ? 1 : 0;
        cur.next = new ListNode(a % 10, null);
        cur = cur.next;
        if (ptr1) ptr1 = ptr1.next;
        if (ptr2) ptr2 = ptr2.next;
    }
    if (r > 0) {
        cur.next = new ListNode(r, null);
    }
    return dummy.next;
}
```

**2. EventEmitter**

> 当时这道题出来的时候我都完全不知道他在讲什么

EventEmitter 是一种在 JavaScript/Node.js 中实现发布订阅（Pub/Sub）模式的机制，用于处理对象间的事件通信。通过 EventEmitter，Javascript 应用能够以松耦合的方式组织代码，特别适合处理异步操作和复杂的状态变化通知。

```Javascript
class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    // 订阅
    bind(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Array());
        }
        this.events.get(event).push(callback);
    }

    // 发布
    emmit(event, ...args) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            callbacks.forEach(callback => {
                callback(...args);
            });
        }
    }

    // 解绑
    remove(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.event.get(event);
            const index = callbacks.indexof(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
                if (callbacks.length === 0) {
                    this.events.delete(event);
                }
            }
        }
    }

    // 单次订阅
    once(event, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.remove(event, onceCallback);
        };
        this.bind(event, onceCallback);
    }
}
```

## 复盘：下次我会做得更好

这次字节初面暴露了我前端基础知识的薄弱环节，特别是浏览器原理和 JS 核心概念。虽然结果不尽如人意，但收获极大——清晰定位了短板，也体验了真实的面试流程。面试官的问题都很经典，值得反复咀嚼。接下来就是查漏补缺，把这次暴露的问题逐个击破。**面试如登山，这次只是山脚的第一步，继续攀登吧！**
