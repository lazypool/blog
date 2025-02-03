---
layout: post
title: 最流行 🐦 的 6 种 API 架构风格
date: 2025-02-02 23:18:05
categories:
    - 🌍️ 网络编程
tags: [前端, API, 互联网]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/bird1.png
---

# 最流行 🐦 的 6 种 API 架构风格

时值旧历新年，四处奔波走动。忙里偷闲，简单地更新一篇博客。这次简单介绍一下目前业界流行的 **6 种 API 架构风格（SOAP、RESTful、GraphQL、gRPC、WebSocket、WebHook）**。作为互联网数字世界的基础支柱，这些 API 架构各有其适应的场景。对它们有一个大致的了解是比较重要的。

![总览：6 种流行的 API 架构](0202_6api_overview.png)

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

## gRPC (Google Remote Procedure Call)

## WebSocket

## WebHook
