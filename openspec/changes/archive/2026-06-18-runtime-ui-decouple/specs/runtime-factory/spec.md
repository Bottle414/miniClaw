# Runtime Factory 规格

## Purpose

定义 `createRuntime` 工厂方法，将 runtime 初始化逻辑封装为可复用的 API，支持多界面接入。

## ADDED Requirements

### Requirement: createRuntime 工厂方法

系统 SHALL 提供 `createRuntime(options)` 工厂方法，返回包含 `chat`、`sessionManager`、`config` 三个成员的对象。`createRuntime` SHALL 使用函数+闭包模式实现，内部持有 provider、messages、memory、summarizer、session 等可变状态。

#### Scenario: 创建 runtime 实例
- **WHEN** 调用 `createRuntime({ env: process.env })`
- **THEN** 系统 SHALL 返回包含 `chat`、`sessionManager`、`config` 的对象
- **AND** 系统 SHALL 内部完成 config 创建、provider 初始化、memory/summarizer/sessionManager 创建
- **AND** 系统 SHALL 创建或加载 session

#### Scenario: 指定 sessionsRoot
- **WHEN** 调用 `createRuntime({ env: process.env, sessionsRoot: "/custom/path" })`
- **THEN** 系统 SHALL 使用指定路径作为 session 存储根目录

### Requirement: RuntimeOptions 接口

系统 SHALL 定义 `RuntimeOptions` 接口，包含 `env: Record<string, string | undefined>`（必需）和 `sessionsRoot?: string`（可选）。`createRuntime` SHALL NOT 直接读取 `process.env`，而是通过 `options.env` 获取环境变量。

#### Scenario: 通过 options.env 提供环境变量
- **WHEN** 调用 `createRuntime({ env: { API_KEY: "sk-xxx", DEEPSEEK_BASE_URL: "..." } })`
- **THEN** 系统 SHALL 使用提供的 env 创建 config 和 provider

#### Scenario: 未提供 sessionsRoot
- **WHEN** 调用 `createRuntime({ env: process.env })` 且未指定 sessionsRoot
- **THEN** 系统 SHALL 默认使用 `<cwd>/.sessions` 作为 session 存储路径

### Requirement: Runtime 返回类型

系统 SHALL 定义 `Runtime` 类型，包含：
- `chat(userInput: string, contextOptions?: ContextBuilderOptions): AsyncIterable<RuntimeEvent>` — 执行一轮对话
- `sessionManager: ReturnType<typeof createSessionManager>` — session 管理器
- `config: Config` — 运行时配置（只读）

#### Scenario: 访问 sessionManager
- **WHEN** 通过 runtime 实例访问 `sessionManager`
- **THEN** 系统 SHALL 返回已初始化的 sessionManager 实例
- **AND** 调用方可通过 sessionManager.load/create/save 管理 session

#### Scenario: 访问 config
- **WHEN** 通过 runtime 实例访问 `config`
- **THEN** 系统 SHALL 返回已创建的 Config 对象（只读引用）

### Requirement: session 初始化与恢复

`createRuntime` SHALL 在初始化时根据 `options.env.SESSION_ID` 加载已有 session 或创建新 session。如果 session 存在，SHALL 恢复其 messages、summary、facts 到运行时 memory 状态。

#### Scenario: 加载已有 session
- **WHEN** `options.env.SESSION_ID` 指定了一个已存在的 session ID
- **THEN** 系统 SHALL 加载该 session
- **AND** 系统 SHALL 将 session 的 messages 恢复到内部 messages 数组
- **AND** 系统 SHALL 将 session 的 summary 和 facts 注入到 RuntimeMemoryState

#### Scenario: 创建新 session
- **WHEN** `options.env.SESSION_ID` 未指定或指定了不存在的 session
- **THEN** 系统 SHALL 创建新 session
- **AND** 系统 SHALL 将 soulPrompt 添加到初始 messages

### Requirement: runtime 导出

runtime 包 (`@mini-claw/runtime`) 的入口文件 SHALL 仅导出 `createRuntime` 函数及相关类型（`RuntimeOptions`、`Runtime`），SHALL NOT 包含任何副作用代码（如 dotenv 加载、自动执行 main 函数）。

#### Scenario: 导入 runtime 包
- **WHEN** 外部包执行 `import { createRuntime } from "@mini-claw/runtime"`
- **THEN** 系统 SHALL 仅导入 `createRuntime` 及类型
- **AND** 系统 SHALL NOT 执行任何副作用代码
- **AND** 系统 SHALL NOT 自动启动对话循环
