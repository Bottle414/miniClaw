# miniClaw

mini OpenClaw - 一个轻量级的 Agent 运行时框架

## 项目简介

miniClaw 是一个用于理解 Agent 运行模式的学习项目，旨在深入理解 Agent Loop、Function Call、MCP 等相关基础设施，实现对应用操控、浏览器操控等能力的探索。

### 核心功能（规划中）

- **reAct 工作流** - Agent 运行的基础
- **Tool System** - 调用工具的能力
- **Memory System** - 记忆功能
- **Session System** - 当前任务、消息、工具调用管理
- **可视化界面** - 面向用户的 Web UI

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

- ✅ **显式推理过程**: 每个阶段都有明确的状态跟踪
- ✅ **多级终止逻辑**: 支持最终答案、迭代限制、错误处理等终止条件
- ✅ **结构化观察**: 工具执行结果以结构化方式记录，便于调试
- ✅ **不可变状态**: 状态管理采用不可变模式，易于追踪和测试
- ✅ **向后兼容**: 保留旧循环模式作为回退选项

### 环境变量配置

```env
# ReAct 循环控制
USE_REACT_LOOP=true          # 启用/禁用 ReAct 循环（默认：true）

# 调试选项
DEBUG_REACT=true             # 启用 ReAct 调试信息输出
```

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

#### 场景 3: 直接回答（无需工具）

```
You: 你好

使用 ReAct 循环模式

[Think] 用户只是打招呼，不需要工具
[Act] 直接回复
[Decide] 无需工具调用，直接响应

你好！我是 miniClaw，很高兴为你服务。有什么我可以帮助你的吗？
```

详细架构设计请参考 [架构设计文档](docs/架构设计.md)。

### 调试与状态检查

#### 启用调试模式

```env
DEBUG_REACT=true
```

调试模式下，系统会在每次循环结束后输出详细的状态信息：

```
--- ReAct 调试信息 ---
迭代次数: 2
终止原因: final_answer
行动次数: 2
观察次数: 2
-------------------
```

#### 状态检查

ReAct 状态包含以下关键信息：

```typescript
ReActState {
  iteration: number              // 当前迭代次数
  phase: 'thinking' | 'acting' | 'observing' | 'deciding'
  messages: LLMMessage[]         // 完整消息历史
  actionHistory: ActionRecord[]  // 行动记录
  observationHistory: ObservationRecord[]  // 观察记录
  shouldTerminate: boolean       // 是否应终止
  terminationReason?: 'final_answer' | 'iteration_limit' | 'error' | 'empty_response'
}
```

#### 常见问题排查

**问题: 循环未终止**
- 检查 `maxIterations` 配置（默认：10）
- 确认 LLM 是否正确判断终止条件

**问题: 工具执行失败**
- 检查 `observationHistory` 中的 `error` 字段
- 确认工具参数格式是否正确

**问题: 意外的迭代次数**
- 启用 `DEBUG_REACT=true` 查看每次迭代的详细信息
- 检查 `actionHistory` 了解工具调用序列

#### 切换回旧循环

如需使用旧的递归循环模式：

```env
USE_REACT_LOOP=false
```

旧模式的特点：
- 简单的递归调用
- 无显式阶段跟踪
- 适合简单场景

### 进阶功能（规划中）

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
│   ├── runtime/           # Agent 运行时
│   │   ├── index.ts       # 入口文件
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nodemon.json
│   └── web/               # Web UI (React + Vite)
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── vite.config.ts
├── packages/              # 共享包目录（预留）
├── docs/                  # 项目文档
├── openspec/              # OpenSpec 配置
├── package.json           # 根配置
├── pnpm-workspace.yaml    # pnpm workspace 配置
└── tsconfig.base.json     # 共享 TypeScript 配置
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 运行环境 | Node.js 24+ |
| 包管理器 | pnpm |
| 编程语言 | TypeScript |
| 热重载 | nodemon |
| UI 框架 | React 19 |
| 脚手架 | Vite |
| LLM API | OpenAI SDK (兼容 DeepSeek) |

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
# 启动 runtime
pnpm dev:runtime

# 启动 web ui
pnpm dev:web

# 默认启动 runtime
pnpm dev
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev:runtime` | 启动 runtime 开发服务（热重载） |
| `pnpm dev:web` | 启动 web 开发服务 |
| `pnpm build` | 构建所有包 |
| `pnpm build:runtime` | 仅构建 runtime |
| `pnpm build:web` | 仅构建 web |
| `pnpm lint` | 检查所有包代码 |
| `pnpm clean` | 清理所有依赖和构建产物 |

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
