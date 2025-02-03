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

## GraphQL

## gRPC (Google Remote Procedure Call)

## WebSocket

## WebHook
