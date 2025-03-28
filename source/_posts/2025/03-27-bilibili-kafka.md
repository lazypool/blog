---
layout: post
title: Kafka 技术在 B 站 📺 的探索与实现
categories:
  - 📢 技术杂谈
tags: [Kafka, B站, 大数据技术]
index_img: https://cdn.jsdelivr.net/gh/lazypool/blog-pics/animals/00014.jpg
date: 2025-03-27 20:13:19
---

# Kafka 技术在 B 站的探索与实现

Apache Kafka 是一个**分布式数据流处理平台，可以实时发布、订阅、存储和处理数据流**。它旨在处理多种来源的数据流，并将它们交付给多个消费者。简而言之，它可以移动大量数据，不仅是从 A 点移到 B 点，而是能从 A 到 Z 的多个点移到任何您想要的位置，并且可以同时进行。

> Apache Kafka 可以取代传统的企业级消息传递系统。它最初是 Linkedin 为处理每天 1.4 万亿条消息而开发的一个内部系统，现已成为应用于各式各样企业需求的开源数据流处理解决方案。

## 背景、挑战、痛点

B 站是当今国内最火的 AGC 网站，其用户群体以年轻人为主。B 站拥有 1000+ 台 Kafka 机器，组成了 20 多个集群。每天，这些 Kafka 端点都会在公司的各个部门之间上报、暂存、分发各种数据，输入 PB 级数据，输出数十 PB。随着集群规模的扩张，B站遇到了越来越多的挑战。

![B 站 Kafka 数据流向](kafka-stream-direction.avif)

- 客户端读写方式多样、难以检测，难以协调集群稳定性和资源利用率。同时，过密的读写操作引发大量的磁盘 I/O，影响用户读写效率。
- 集群多业务共用，核心业务和普通业务互相影响，出现问题时受波及的地方过广。
- 开源版本的限速粒度很粗，不灵活，难以实时根据磁盘状态进行对应调整。
- Kafka 以集群稳定性著称，但这是以繁琐的上下线流程为代价的，导致效率低下。
- 开源版本在分配 Partion 时仅考虑机器 Partion 数量，不考虑磁盘流量负载情况，也不考虑 Topic 之间的差异，导致集群中机器间、磁盘间负载不均衡。
- 随着公司业务不断扩大，一套 IDC 不足以支撑整个公司的服务，需要控制并协调多个 IDC。
- Kafka 只有一个工作线程池，慢请求可能导致线程池阻塞，影响其他请求处理效率。

## Guardian - Kafka federation cluster controller

为了应对这些挑战，哔哩哔哩开发了一套自动化治理系统，有效地解决目前面临的问题。Guardian 是一套自研的 Kafka federation cluster controller。该服务通过 Raft 保证了高可用和一致性，并支持从 Kafka Server 端收集各类数据进行计算和分析，执行治理计划。包含以下功能：

1. 元数据管理与集群。
2. 元数据管理与存储。
3. uuid(topic, segmentID) 的分配。
4. 收集集群信息进行调度。
5. 多租户管理与 label 隔离。
6. 故障预警与自愈。

![Guardian：Kafka 联邦集群控制层](kafka-guardian.avif)

> 基于 JMX 协议采集 Metrics 的性能非常差，这是因为 jmx 协议一个请求只能获取一个 mbean。随着 metric 的加强，可能达到万级别，此时 cpu 消耗会占 20% 甚至更高。Kafka Reporter 为基于 GRPC，http 协议的内置 Metric 上报服务，只需要一个 rpc 即可拉取全部监控数据。

## 集群层面治理

### Partition 级别限速保护

### 自动 Partition 均衡

### 多租户资源隔离管理

### 多机房管理

### 请求队列拆分

### Tired-Storage

### Kafka 审计功能

## 运维层面治理

### 集群平滑发布

### 未来展望
