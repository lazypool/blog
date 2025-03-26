---
layout: post
title: 最流行 🐦 的 6 种 API 架构风格
date: 2025-02-02 23:18:05
categories:
    - 📢 技术杂谈
tags: [前端, API, 互联网]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00010.jpg
---

# 最流行 🐦 的 6 种 API 架构风格

时值旧历新年，四处奔波走动。忙里偷闲，简单地更新一篇博客。这次简单介绍一下目前业界流行的 **6 种 API 架构风格（SOAP、RESTful、GraphQL、gRPC、WebSocket、WebHook）**。作为互联网数字世界的基础支柱，这些 API 架构各有其适应的场景。对它们有一个大致的了解是比较重要的。

![总览：6 种流行的 API 架构](6api-overview.png)

- 关于什么是 API？

API，即应用程序编程接口（Application Program Interface），是指一组预定义的方法和协议，用于与某个软件组件或系统进行交互。**它们充当桥梁，负责不同软件系统之间的数据交换、函数调用和整体的系统集成，允许不同的软件组件进行通信和交互。** 因为应用场景的不同，而诞生了许多风格的 API 架构。

## SOAP (Simple Object Access Protocol)

SOAP 是 **基于 XML** 的简易对象访问协议，它是一种用于应用程序之间 **通过因特网进行通信** 的通信协议和消息格式，具有 **平台独立性和语言独立性**，简单且可扩展，并允许绕过防火墙进行通信，同时正在被发展为 W3C 标准。

**广泛适用于安全性和可靠性至关重要的金融服务和支付网关领域。** 特别是需要实现事务处理和消息传递机制的场景，如 B2B 交易、客户/服务器通讯、基于 Web 的电子商务应用、企业应用集成等。

**SOAP 实例：** 在下面的例子中，一个 GetStockPrice 请求被发送到了服务器。此请求有一个 StockName 参数，而在响应中则会返回一个 Price 参数。此功能的命名空间被定义在此地址中："http://www.example.org/stock"。

### SOAP 请求

```
POST /InStock HTTP/1.1
Host: www.example.org
Content-Type: application/soap+xml; charset=utf-8
Content-Length: nnn

<?xml version="1.0"?>
<soap:Envelope
xmlns:soap="http://www.w3.org/2001/12/soap-envelope"
soap:encodingStyle="http://www.w3.org/2001/12/soap-encoding">

<soap:Body xmlns:m="http://www.example.org/stock">
  <m:GetStockPrice>
    <m:StockName>IBM</m:StockName>
  </m:GetStockPrice>
</soap:Body>

</soap:Envelope> 
```

### SOAP 响应

```
HTTP/1.1 200 OK
Content-Type: application/soap+xml; charset=utf-8
Content-Length: nnn

<?xml version="1.0"?>
<soap:Envelope
xmlns:soap="http://www.w3.org/2001/12/soap-envelope"
soap:encodingStyle="http://www.w3.org/2001/12/soap-encoding">

<soap:Body xmlns:m="http://www.example.org/stock">
  <m:GetStockPriceResponse>
    <m:Price>34.5</m:Price>
  </m:GetStockPriceResponse>
</soap:Body>

</soap:Envelope>
```

## RESTful (Representational State Transfer)

SOAP 的语法冗长而复杂，所以在开发轻量级的移动应用程序时显得有点“超重”。与之相对，RESTful 是该领域的王者。我最初接触 RESTful 是在 2023 年，那时我在字节青训的后端组学习。

简单的说，RESTful 是一种 **基于 HTTP 的服务 Web 应用** 的架构，它遵循一套核心原则和约束。如果想要对 RESTful 有更深的理解，可以参考 [RESTful架构详解|菜鸟教程](https://www.runoob.com/w3cnote/restful-architecture.html) 或者去阅读 Roy Fielding 在 2000 年发表的博士论文。

RESTful 的应用场景更加多元和广泛。我们在日常生活中所能接触到的大多数 Web 应用服务，如 Twitter、Youtube 等均有 RESTful API 提供支持。**然而，RESTful 并不适用于对实时的、或高度连接的数据模型进行操作。**

### RESTful 请求 (POST)

```
POST /api/books HTTP/1.1
Host: example.com
Content-Type: application/json

{
  "title": "New Book",
  "author": "Jerry",
  "publishedYear": 2023,
  "description": "Jerry wrote this book."
}
```

### RESTful 响应 (POST)

```
HTTP/1.1 201 Created
Location: /api/books/3
Content-Type: application/json

{
  "id": hM#7P-v2jTn53We,
  "title": "New Book",
  "author": "Jerry",
  "publishedYear": 2023,
  "description": "Jerry wrote this book."
}
```

## GraphQL

GraphQL 由 Facebook 在 2012 年内部开发，并于 2015 年开源。**它不仅仅是一种 API 架构风格，更是一种查询语言。** GraphQL 非常受前端人员欢迎，主要体现在如下几个方面：

1. **单一端点访问** 在 GraphQL 中，客户端可以通过一个请求获取多个资源的数据，避免多次请求的情况。
2. **高效数据获取** GraphQL 允许客户根据需要指定特定数据，服务器只返回这些数据，从而避免了过度加载或加载不足。
3. **实时数据更新** GraphQL 支持实时数据订阅功能，适用于需要实时数据推送的应用场景。
4. **强类型系统** 使用明确的类型系统定义 API 的结构，确保 API 的查询是可预测的。
5. **灵活性和可扩展性** GraphQL 的架构方式使得 API 更加灵活和可扩展，能够适应不断变化的需求。

Facebook 开发 GraphQL 主要是为了向其数十亿用户提供高效精确的数据，而现在，它已被 GitHub 和 Shopify 等公司所采用。GraphQL 因其效率和灵活性而成为具有复杂数据要求的应用程序的有力选择。**目前，GraphQL 主要适用于那些页面需要从多个来源获取数据，或者需要进行实时数据推送的应用。** 然而，**GraphQL 的学习路线比较陡峭，对于那些需求比较简单的应用程序而言有些“大材小用”。**

### Operation

```
{
  hero {
    name
    friends {
      name
    }
  }
}
```

### Response

```
{
  "data": {
    "hero": {
      "name": "R2-D2",
      "friends": [
        {
          "name": "Luke Skywalker"
        },
        {
          "name": "Han Solo"
        },
        {
          "name": "Leia Organa"
        }
      ]
    }
  }
}
```

## gRPC (Google Remote Procedure Call)

gRPC 是有 Google 开源的一款高性能远程过程调用（RPC）框架。**它基于 HTTP/2 协议，以 ProtoBuf 作为接口的描述语言。** 传统的网络通信和通用数据交换等应用场景中经常使用的技术是 JSON 或 XML，它们都是基于文本格式的。**而 gRPC 则采用二进制格式 (ProtoBuf)，因此它在端点将会经历序列化和反序列化的操作**。

![Protobuf 示例](protobuf.jpg)

**gRPC 是微服务架构 (microservice) 的最爱。** 像 Netflix 这样的公司就采用 gRPC 来处理其巨大的服务间通信。**此外，gRPC 还适用于物联网、跨编程语言环境、实时数据流等应用场景。** 然而，在浏览器客户端领域，由于浏览器支持有限，gRPC 就显得不再适用。

## WebSocket

Socket (在一些比较坑爹的教材里被翻译成“套接字”)，是一种全双工通信方式。相信不少中国大学的学生在学网络技术的时候都接触过这个玩意儿。**WebSocket 采用了实时、双向、持久连接的技术，非常适合需要低延迟的数据交换的应用场景，如实时聊天应用程序和在线游戏等。** 相对的，它不适用于无需传递实时数据的应用场景，因为它会产生许多不必要的开销。

![HTTP 对比 Socket](http2socket.png)

WebSocket 最早在 2008 年由 Hixie 提出，后来被 W3C 纳入标准化进程，并在 2011 年成为 W3C 推荐标准 (RFC 6455)。由于诞生时间比较早，基本上所有的主流浏览器均支持 WebSocket，包括 Chrome、Firefox、Safari、Edge、Opera 等。**近年来，WebSocket 逐渐得到了越来越多的关注和应用，特别是在需要实时通信功能的 Web 应用程序中，如在线游戏、社交网络、直播等。**

### 工作原理

WebSocket 连接是通过一次 HTTP 升级请求（UpgradeRequest）从传统的 HTTP 连接升级而来。

1. 握手过程始于客户端发起的HTTP请求，其中包含 Upgrade 字段，表示希望升级为 WebSocket 连接。
2. 服务器接收到请求后进行验证，并返回一个 101 状态码的响应，表明协议升级成功。
3. 握手成功后，客户端和服务器之间的通信不再遵循 HTTP 规范，而是通过 WebSocket 定义的帧格式进行数据传输。

## WebHook

**WebHook 是一种很棒的回调机制，它基于 HTTP 协议。** 如果是经常使用 pip 和 pacman 等工具进行包管理的同学可能会对到底啥是 Hook (钩子) 比较熟悉。**简单来说，Webhook 允许一个系统（源）在特定事件发生时，通过 HTTP 请求与另一个系统（目标）进行“对话”，并共享有关该事件的信息。** 这种机制实现了不同系统间的数据实时同步和交互，极大地提高了数据传输的效率和便捷性。

WebHook 的一切都与事件驱动、HTTP 回调和异步操作有关。例如：每当 push 新的 commit 时，GitHub 都会使用 WebHook 通知其他系统处理相关任务，比如 Workflow 和发送通知邮件等。这样做的好处在于，使用异步操作分派任务，在提供多样服务的同时保证了高效性。

### 工作原理

Webhook的工作原理可以简单概括为以下几个步骤：

1. **前端配置** 前端应用或服务向后端发送请求，并附带一个回调 URL。
2. **后端保存** 后端在接收到请求后，会将该 URL 保存在自己的服务器中。
3. **事件触发** 当某个预设事件发生，后端就向之前保存的 URL 发送 HTTP 请求，并携带相关事件数据。
4. **前端接收** 前端收到请求后，解析数据并根据需要更新页面内容或执行其他逻辑，从而实现实时交互。

## 最后的结束语

现在，我们已经完成了最常用 API 架构风格的旋风之旅。正如我们所见，没有“一刀切”的方法。我们需要根据自身的项目需求和应用场景来制定我们的 API 架构风格与策略。
