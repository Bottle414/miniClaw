## ADDED Requirements

### 需求：会话中的工具执行记录

系统 SHALL 将工具执行记录存储在会话目录的 `tool-runs.json` 文件中。每条记录 SHALL 符合 `ToolExecutionRecord`，包含：`toolName`（string）、`startedAt`（ISO 8601 字符串）、`finishedAt`（ISO 8601 字符串）、`durationMs`（number）、`retries`（number）、`cached`（boolean）、`error`（可选 string）。日志中间件 SHALL 在每次工具调用完成后追加一条 `ToolExecutionRecord` 到此文件。`LLMToolMessage` 类型 SHALL 不扩展遥测元数据字段。

#### 场景：成功工具执行记录

- **WHEN** 工具调用在 200ms 内成功完成，无重试且未命中缓存
- **THEN** SHALL 向 `tool-runs.json` 追加一条 `ToolExecutionRecord`：`{ toolName, startedAt, finishedAt, durationMs: 200, retries: 0, cached: false }`，无 `error` 字段

#### 场景：失败工具执行记录

- **WHEN** 工具调用失败，错误为 "Permission denied: fs.write"
- **THEN** SHALL 向 `tool-runs.json` 追加一条 `ToolExecutionRecord`：`{ toolName, startedAt, finishedAt, durationMs, error: "Permission denied: fs.write" }`

#### 场景：缓存命中的工具执行记录

- **WHEN** 工具调用结果从缓存返回
- **THEN** SHALL 向 `tool-runs.json` 追加一条 `ToolExecutionRecord`：`{ toolName, startedAt, finishedAt, durationMs: 0, cached: true }`

#### 场景：重试后的工具执行记录

- **WHEN** 工具调用在 2 次重试后成功
- **THEN** SHALL 向 `tool-runs.json` 追加一条 `ToolExecutionRecord`：`{ toolName, startedAt, finishedAt, durationMs, retries: 2 }`

#### 场景：LLMToolMessage 不被遥测数据污染

- **WHEN** 工具调用完成
- **THEN** `LLMToolMessage` SHALL 仅包含 `role`、`content` 和 `toolCallId`——不含 `toolCallMeta` 或其他遥测字段

### 需求：会话根目录中的指标文件

系统 SHALL 将工具指标持久化到会话根目录的 `metrics.json` 文件中。文件 SHALL 符合 `SessionMetrics` 模式：`{ tools: Record<string, ToolMetrics> }`，其中 `ToolMetrics` 包含 `callCount`、`errorCount`、`totalDurationMs`、`avgDurationMs`、`lastCalledAt`、`cacheHits`、`cacheMisses`、`timeoutCount`、`retryCount`。文件 SHALL 在每次工具调用完成后更新。

#### 场景：首次调用时创建指标文件

- **WHEN** 会话中首次工具调用完成
- **THEN** SHALL 在会话根目录创建 `metrics.json` 文件，包含该工具的初始指标

#### 场景：后续调用时更新指标文件

- **WHEN** 同一工具的后续调用完成
- **THEN** `metrics.json` 文件 SHALL 更新：callCount 递增、avgDurationMs 重新计算、lastCalledAt 更新

#### 场景：多个工具的指标

- **WHEN** 同一会话中调用了两个不同的工具
- **THEN** `metrics.json` 文件 SHALL 包含以各工具名称为键的独立 `ToolMetrics` 条目

#### 场景：缓存命中/未命中指标

- **WHEN** 可缓存工具调用结果为缓存命中
- **THEN** `cacheHits` SHALL 递增；缓存未命中时 `cacheMisses` SHALL 递增

#### 场景：超时和重试指标

- **WHEN** 工具调用超时或被重试
- **THEN** `timeoutCount` 或 `retryCount` SHALL 相应递增

### 需求：统一日志使用

所有中间件日志输出 SHALL 使用 `utils/logger.ts` 的 `logger()` 函数。禁止在中间件日志中直接使用 `console.log`、`console.error` 或其他 console 方法。

#### 场景：日志中间件使用 logger

- **WHEN** 日志中间件打印工具调用的开始或结束信息
- **THEN** SHALL 调用 `logger("tool", <color>, <message>)`，绝不直接使用 `console.log`

#### 场景：指标中间件使用 logger 记录错误

- **WHEN** 指标中间件遇到文件写入错误
- **THEN** SHALL 通过 `logger()` 记录错误，不使用 `console.error`

### 需求：Logger infoType 扩展

`logger()` 函数的 `infoType` 映射 SHALL 扩展支持 `"tool"` 类别，映射到环境变量 `TOOL_LOG_DEBUG`。工具中间件日志 SHALL 仅在 `TOOL_LOG_DEBUG=true` 时打印。

#### 场景：工具日志已启用

- **WHEN** 环境变量 `TOOL_LOG_DEBUG` 设置为 `"true"`
- **THEN** 工具中间件日志消息 SHALL 通过 `logger()` 打印

#### 场景：工具日志已禁用

- **WHEN** 环境变量 `TOOL_LOG_DEBUG` 未设置或设置为 `"true"` 以外的值
- **THEN** 工具中间件日志消息 SHALL 不打印
