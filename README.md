# miniClaw

mini OpenClaw - 一个轻量级的 Agent 运行时框架

## 项目简介

miniClaw 是一个用于理解 Agent 运行模式的学习项目，旨在深入理解 Agent Loop、Function Call、MCP 等相关基础设施，实现对应用操控、浏览器操控等能力的探索。

### 核心功能

- **ReAct 工作流** - Agent 运行的基础（思考→行动→观察→决策循环）
- **Tool System** - 工具注册与调用能力
- **Memory System** - 记忆存储、上下文构建、摘要压缩
- **流式输出** - SSE 实时流式响应
- **双层配置** - 运行时配置 + 任务级动态配置
- **Provider 适配** - 统一 LLM 类型层，通过 Adaptor 适配多模型

### 进阶功能

- Session System - 当前任务、消息、工具调用管理
- 可视化界面 - 面向用户的 Web UI
- 多模型切换
- 语音支持

### 进阶功能（规划中）

- MCP (Model Context Protocol)
- Agent to UI 系统
- Computer Use / Browser Use

## 架构概览

```
入口层 (index.ts)           → Agent Loop 主循环、用户交互
  ├─ 接入层 (provider/)     → LLM 提供商（封装 API 调用）
  ├─ 适配层 (adaptor/)      → 统一类型 ↔ 提供商类型 转换
  ├─ ReAct 层 (react/)      → ReAct 循环、状态机、终止器
  ├─ 记忆层 (memory/)       → 记忆存储、上下文构建器、摘要器
  ├─ 工具层 (tools/)        → 工具注册与执行
  ├─ 提示词 (prompts/)      → 系统提示词、ReAct 提示词、Soul 角色提示词
  ├─ 类型层 (types/)        → 统一 LLM 类型、Provider 类型、配置类型、事件类型
  └─ 工具函数 (utils/)      → 配置加载、日志、消息格式化
```

详细架构设计请参考 [架构设计文档](docs/架构设计.md)。

```

+---------------------------------------+
| Web UI / Inspector |
+---------------------------------------+
| (1) Input Directive ▲ (4) RuntimeEvent Stream
▼ | [AsyncIterable Pull]
+---------------------------------------------------------------------------+
| Runtime Headless Engine |
| |
| +-----------------------+ +----------------------------+ |
| | Session Manager |<------------>| Memory System | |
| | (Session Metadata) | | (WorkingMemory/Summarizer) | |
| +-----------------------+ +----------------------------+ |
| | ▲ |
| ▼ (2) Orchestrate | (3) Context Build |
| +-------------------------------------------------------------------+ |
| | ReAct Workflow Engine | |
| | | |
| | +------------------+ LLM Chat +---------------------+ | |
| | | Model Adapter |<================>| DeepSeek / LLM | | |
| | +------------------+ +---------------------+ | |
| | | | |
| | ▼ Execute Tool (with Metadata) | |
| | +-----------------------------------------------------------+ | |
| | | Tool System (Middleware Pipeline) | | |
| | | | | |
| | | [Logging] -> [Cache] -> [Permission] -> [Tool Executor] | | |
| | +-----------------------------------------------------------+ | |
| +-------------------------------------------------------------------+ |
+---------------------------------------------------------------------------+
```

## ReAct 循环

miniClaw 实现了 ReAct (Reasoning + Acting) 模式作为 Agent 的核心运行机制。

### ReAct 循环阶段

```
Think (思考) → Act (行动) → Observe (观察) → Decide (决策)
```

1. **Think**: LLM 思考下一步应该做什么
2. **Act**: LLM 决定调用工具或提供最终答案
3. **Observe**: 系统执行工具并收集结果
4. **Decide**: 系统评估是否终止循环或继续

### 主要特性

- **显式推理过程**: 每个阶段都有明确的状态跟踪
- **多级终止逻辑**: 支持最终答案、迭代限制、错误处理等终止条件
- **结构化观察**: 工具执行结果以结构化方式记录，便于调试
- **不可变状态**: 状态管理采用不可变模式，易于追踪和测试
- **向后兼容**: 保留旧循环模式作为回退选项

### 示例输出

#### 场景 1: 简单工具调用

```
You: 上海天气

使用 ReAct 循环模式

Assistant:
[Think] 用户询问上海天气，需要调用天气工具
[Act] 调用 weather.getWeather({ city: "上海" })
[Observe] 返回结果: "sunny"
[Decide] 已获得答案，准备响应

上海今天是晴天，天气不错！
```

#### 场景 2: 多步推理

```
You: 北京和上海哪里的天气更好？

使用 ReAct 循环模式

--- 迭代 1 ---
[Think] 需要获取两个城市的天气进行比较
[Act] 调用 weather.getWeather({ city: "北京" })
[Observe] 返回结果: "cloudy"
[Decide] 还需要上海的天气信息，继续

--- 迭代 2 ---
[Think] 已获取北京天气，现在需要上海天气
[Act] 调用 weather.getWeather({ city: "上海" })
[Observe] 返回结果: "sunny"
[Decide] 已获得足够信息，准备比较

--- 最终答案 ---
上海今天是晴天，北京是多云。从天气情况看，上海今天的天气更好一些。
```

## 流式输出

miniClaw 支持通过 SSE 实时流式输出，逐 token 显示模型响应。

### 环境变量配置

```env
# 流式输出
STREAM=true                   # 启用/禁用流式输出（默认：true）

# 调试选项
STREAMING_OUTPUT_DEBUG=true    # 流式输出调试日志
DEBUG_REACT=true              # ReAct 调试信息输出
USE_REACT_LOOP=true           # 启用/禁用 ReAct 循环（默认：true）
```

日志系统详情请参考 [日志系统文档](docs/日志系统.md)。

## 记忆系统

miniClaw 实现了分层记忆管理：

- **MemoryStore** - 权威消息存储，不可变
- **上下文构建器** - 保留/丢弃/注入/摘要操作，生成面向模型的 `contextMessages`
- **摘要器** - 将旧消息压缩为确定性摘要，节省上下文窗口

## 进阶功能（规划中）

- 多模型切换
- MCP (Model Context Protocol)
- Agent to UI 系统
- Computer Use
- Browser Use
- 语音支持

## 项目结构

```
miniClaw/
├── apps/
│   ├── runtime/               # Agent 运行时 (@mini-claw/runtime)
│   │   └── src/
│   │       ├── adaptor/       #   适配层（DeepSeek adaptor）
│   │       ├── const/         #   常量
│   │       ├── memory/        #   记忆层（存储、上下文构建、摘要）
│   │       ├── prompts/       #   提示词（系统、ReAct、Soul）
│   │       ├── provider/      #   接入层（DeepSeek Provider）
│   │       ├── react/         #   ReAct 循环
│   │       ├── tools/         #   工具注册与执行
│   │       ├── types/         #   类型定义
│   │       ├── utils/         #   工具函数
│   │       └── index.ts       #   入口
│   └── web/                   # Web UI (@mini-claw/web)
├── packages/                  # 共享包目录（预留）
├── docs/                      # 项目文档
├── openspec/                  # OpenSpec 变更管理
├── package.json               # 根配置
├── pnpm-workspace.yaml        # pnpm workspace 配置
└── tsconfig.base.json         # 共享 TypeScript 配置
```

## 技术栈

| 类别     | 技术                       |
| -------- | -------------------------- |
| 运行环境 | Node.js 24+                |
| 包管理器 | pnpm 10                    |
| 编程语言 | TypeScript 6               |
| 热重载   | tsx watch                  |
| UI 框架  | React 19                   |
| 脚手架   | Vite 8                     |
| LLM API  | OpenAI SDK (兼容 DeepSeek) |
| 变更管理 | OpenSpec                   |

## 环境要求

- Node.js >= 24.0.0
- pnpm >= 10.0.0

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Bottle414/miniClaw.git
cd miniClaw
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
```

开发环境可创建 `.env.dev` 文件：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 4. 启动开发服务

```bash
# 启动 runtime 交互式对话
pnpm run chat

# 启动 runtime 开发模式（热重载）
pnpm dev:runtime

# 启动 web ui
pnpm dev:web

# 默认启动 runtime
pnpm dev
```

## 可用命令

| 命令                 | 说明                            |
| -------------------- | ------------------------------- |
| `pnpm chat`          | 启动 runtime 交互式对话         |
| `pnpm dev:runtime`   | 启动 runtime 开发服务（热重载） |
| `pnpm dev:web`       | 启动 web 开发服务               |
| `pnpm build`         | 构建所有包                      |
| `pnpm build:runtime` | 仅构建 runtime                  |
| `pnpm build:web`     | 仅构建 web                      |
| `pnpm lint`          | 检查所有包代码                  |
| `pnpm clean`         | 清理所有依赖和构建产物          |

## 参考资料

- [OpenClaw 官方文档](https://pi.dev/docs/latest)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw ShowCase](https://open-claw.org/showcase)
- [DeepSeek API 文档](https://api-docs.deepseek.com/zh-cn/)
- [近年 AI 应用技术串讲](https://oigi8odzc5w.feishu.cn/wiki/WBMfwiNkfi6uNFkRtXdcavDzn0e)

## License

ISC

## Author

Bottle414
