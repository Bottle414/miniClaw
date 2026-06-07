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
