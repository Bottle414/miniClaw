# miniClaw 项目规划

# 一、项目目标

本项目旨在理解 Agent 运行模式，加深对 Agent Loop、function call、MCP 等相关基建的认知，满足对 OpenClaw 能进行应用操控、浏览器操控的好奇心

# 二、前期调研

## 2.1 OpenClaw 核心 Agent

https://pi.dev/docs/latest

## 2.2 OpenClaw 仓库地址

https://github.com/openclaw/openclaw

## 2.3 OpenClaw 功能 ShowCase

https://open-claw.org/showcase

## 2.4 OpenClaw 设计亮点

https://github.com/openclaw/openclaw\#highlights

## 2.5 DeepSeek API 文档

https://api-docs.deepseek.com/zh-cn/

# 三、架构设计

项目采用 monorepo 结构。项目结构：

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

详细架构设计请参考 [架构设计文档](架构设计.md)。

项目结构：

```
miniClaw/
├── apps/
│   ├── runtime/               # Agent 运行时 (@mini-claw/runtime)
│   │   └── src/
│   │       ├── adaptor/       #   适配层（DeepSeek adaptor，GLM 复用）
│   │       ├── const/         #   常量
│   │       ├── memory/        #   记忆层（存储、上下文构建、摘要）
│   │       ├── prompts/       #   提示词（系统、ReAct、Soul）
│   │       ├── provider/      #   接入层（DeepSeek / GLM Provider）
│   │       ├── react/         #   ReAct 循环
│   │       ├── tools/         #   工具注册与执行
│   │       ├── types/         #   类型定义
│   │       ├── utils/         #   工具函数
│   │       └── index.ts       #   入口
│   ├── server/                # SSE 中转服务器 (@mini-claw/server)
│   └── web/                   # Web UI (@mini-claw/web)
├── packages/                  # 共享包目录（预留）
├── docs/                      # 项目文档
├── openspec/                  # OpenSpec 变更管理
├── package.json               # 根配置
├── pnpm-workspace.yaml        # workspace 配置
└── tsconfig.base.json         # 共享 TS 配置
```

# 四、技术选型

| 类别                 | 技术                       |
| -------------------- | -------------------------- |
| 运行环境             | Node.js 24+                |
| 包管理器             | pnpm                       |
| 编程语言             | TypeScript                 |
| 热重载               | tsx watch                  |
| UI 框架              | React 19                   |
| 脚手架               | Vite 8                     |
| LLM API              | OpenAI SDK (兼容 DeepSeek) |
| 变更管理 + spec 框架 | OpenSpec                   |

# 五、预设功能

目标是实现一个 Agent

1. 核心功能：

- [x] ReAct 工作流 - 运行的基础（思考→行动→观察→决策循环）
- [x] Tool System - 工具注册与调用能力
- [x] Memory System - 记忆存储、上下文构建、摘要压缩
- [x] 流式输出 - SSE 实时流式响应
- [x] 双层配置 - 运行时配置 + 任务级动态配置
- [x] Provider 适配 - 统一 LLM 类型层，通过 Adaptor 适配多模型
- [x] Session System - 当前任务、消息、工具调用管理
- [x] 可视化界面 - 面向用户的 Web UI（React + Zustand + Ant Design）

2. 额外功能

- [x] 多模型切换 - DeepSeek / GLM 双 Provider，前端下拉切换
- [x] 思考过程展示 - reasoning-delta 事件流，折叠展示，持久化到 reasoning.json
- [x] 设置系统 - 个性化（称呼/身份/性格）、API Key 管理、权限配置
- [x] 语音输入 - Web Speech API 封装，中文语音识别
- [x] Runtime Inspector - ReAct 迭代时间线、工具执行记录、指标面板
- [ ] MCP
- [ ] Agent to UI 系统

3. 进阶功能

- [ ] Computer Use
- [ ] Browser Use

# 六、已完成迭代

| #   | 变更                               | 核心内容                                                                                |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | unified-llm-types                  | 统一 LLM 类型层（LLMMessage/LLMRequest/LLMResponse/LLMTool），DeepSeek adaptor 双向转换 |
| 2   | implement-provider-initialization  | 双层配置体系（RuntimeConfig + TaskConfig）、Provider 工厂函数、系统提示词加载           |
| 3   | react-loop-implementation          | ReAct 循环（思考→行动→观察）、ReAct 状态机、终止器、Provider chat 接口                  |
| 4   | add-streaming-output               | 流式输出、SSE chunk 解析、RuntimeEvent 事件体系、流式 adaptor、流合并                   |
| 5   | react-streaming-output             | ReAct 循环流式输出、流式事件适配                                                        |
| 6   | add-memory-system                  | 记忆存储（MemoryStore）、上下文构建器（保留/丢弃/注入/摘要）、确定性摘要器              |
| 7   | add-structured-summary-compression | 结构化摘要压缩（Fact/SummaryResult/事实分类）、LLM 摘要生成器                           |
| 8   | add-web-ui                         | Web 界面（React + Zustand + Ant Design）、SSE 连接、消息流、Inspector 面板              |
| 9   | add-server                         | SSE 中转服务器（Express）、chat/session/metrics API 端点                                |
| 10  | add-session-persistence            | Session 持久化（metadata/messages/summary/facts/reasoning JSON 文件）                   |
| 11  | add-glm-provider                   | GLM Provider 接入（复用 deepseekAdapter）、多模型切换                                   |
| 12  | add-reasoning-display              | 思考过程展示（reasoning-delta 事件、折叠展示、reasoning.json 持久化）                   |
| 13  | add-settings-system                | 设置系统（个性化/API Key/权限配置）、userConfig 持久化、模型切换                        |
| 14  | add-voice-input                    | 语音输入（Web Speech API 封装、中文识别、实时转写）                                     |

# 七、参考文献

[近年 AI 应用技术串讲与优质文档分享｜Agent、Skill、OpenClaw、Harness……](https://oigi8odzc5w.feishu.cn/wiki/WBMfwiNkfi6uNFkRtXdcavDzn0e)
