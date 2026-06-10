# Technical Design: Provider Initialization and Configuration Injection

## Context

### 当前架构

```
index.ts (主循环)
  → OpenAI Client (直接调用)
    → DeepSeek API
```

### 目标架构

```
index.ts (主循环)
  → Provider (统一接口)
    → Adaptor (类型转换)
      → OpenAI Client
        → DeepSeek API
```

### 约束

- 必须使用已有的 `Provider` 接口定义（`types/providers/index.ts`）
- 必须遵循项目规范中的分层架构原则
- 必须通过 adaptor 层进行类型转换，禁止直接使用提供商原生类型
- 必须使用统一 LLM 类型（`types/llm/`）
- 配置必须通过 `.env` 文件加载，禁止硬编码

## Goals / Non-Goals

### Goals

- 实现 `Provider.init()` 方法，支持配置注入和客户端初始化
- 实现 `Provider.chat()` 方法，集成 adaptor 进行类型转换
- 建立配置管理机制，支持 `RuntimeConfig` 与 `TaskConfig` 的合并
- 重构主循环，使用 Provider 替代直接调用 OpenAI 客户端
- 支持系统提示的动态管理

### Non-Goals

- 不实现多 Provider 切换机制（仅实现 DeepSeek Provider）
- 不实现配置文件热重载
- 不实现流式响应（streaming）
- 不修改现有的 adaptor 实现

## Decisions

### D1: Provider 实现模式

**决策**: 使用闭包模式创建 Provider 实例

**理由**:
- Provider 需要保持内部状态（OpenAI 客户端、配置）
- 闭包模式比类更轻量，符合项目函数式风格
- 便于测试和依赖注入

**代码结构**:
```typescript
function DeepSeekProvider(): Provider {
  let client: OpenAI | null = null
  let config: Config | null = null

  return {
    init(cfg: Config) {
      config = cfg
      client = new OpenAI({
        baseURL: cfg.baseURL,
        apiKey: cfg.apiKey
      })
    },

    async chat(req: LLMRequest): Promise<LLMResponse> {
      if (!client) throw new Error("Provider not initialized")
      // 使用 adaptor 转换类型
    }
  }
}
```

**替代方案**:
- **类模式**: 使用 `class DeepSeekProvider implements Provider`
  - 缺点: 更冗长，不符合项目现有的函数式风格
- **对象字面量**: 直接返回对象
  - 缺点: 无法保持私有状态

### D2: 配置注入流程

**决策**: 在主循环启动时合并配置并注入 Provider

**流程**:
```
1. 加载环境变量 (dotenv)
2. 构造 RuntimeConfig (系统提示、循环参数)
3. 构造 TaskConfig (API 配置、模型、工具)
4. 合并为 Config
5. 调用 provider.init(config)
6. 启动主循环
```

**代码结构**:
```typescript
// utils/config.ts
export function createConfig(env: NodeJS.ProcessEnv): Config {
  return {
    // RuntimeConfig
    systemPrompt: getSystemPrompt(),
    maxIterations: 10,

    // TaskConfig
    baseURL: env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    apiKey: env.DEEPSEEK_API_KEY!,
    model: env.DEEPSEEK_MODEL || "deepseek-chat",
    userPrompt: ""
  }
}
```

**替代方案**:
- **Builder 模式**: 提供 `ConfigBuilder` 类
  - 缺点: 过度设计，配置结构已固定
- **配置文件**: 使用 JSON/YAML 配置文件
  - 缺点: 增加复杂度，环境变量更简单

### D3: 系统提示管理

**决策**: 使用独立模块 `prompts/system.ts` 管理系统提示

**理由**:
- 系统提示可能需要动态生成
- 便于后续扩展（多语言、角色定制）
- 符合单一职责原则

**代码结构**:
```typescript
// prompts/system.ts
export function getSystemPrompt(): string {
  return "You are a helpful assistant..."
}
```

**替代方案**:
- **硬编码在 index.ts**: 简单但不易维护
- **配置文件**: 可配置但增加复杂度

### D4: 消息历史管理

**决策**: 在主循环中维护消息历史数组

**理由**:
- 消息历史属于运行时状态，不属于 Provider
- 便于后续实现消息持久化
- 符合项目现有的实现方式

**代码结构**:
```typescript
const messages: LLMMessage[] = []

// 添加系统提示
messages.push({
  role: "system",
  content: [{ type: "text", text: config.systemPrompt }]
})

// 主循环中添加用户消息和助手回复
```

## Risks / Trade-offs

### R1: 配置验证不足

**风险**: 缺少配置验证可能导致运行时错误

**缓解措施**:
- 在 `createConfig()` 中添加基本验证（必填字段检查）
- Provider 初始化时验证客户端创建是否成功

### R2: 消息历史内存泄漏

**风险**: 长时间运行可能导致消息历史无限增长

**缓解措施**:
- 暂时接受此限制（对话通常是短期的）
- 后续可实现消息历史裁剪或持久化

### R3: 类型转换复杂性

**风险**: adaptor 的类型转换可能遗漏边界情况

**缓解措施**:
- 复用现有的 `deepseekAdapter` 实现
- 在 adaptor 中添加详细的错误处理和日志

### T1: 闭包 vs 类的性能差异

**权衡**: 闭包模式的内存占用略高于类模式

**理由**:
- 性能差异可忽略不计（单例 Provider）
- 代码简洁性和一致性更重要

## Migration Plan

### 阶段 1: 基础设施

1. 创建 `utils/config.ts` 实现配置管理
2. 实现 `prompts/system.ts` 系统提示管理
3. 完善 `provider/index.ts` 导出

### 阶段 2: Provider 实现

1. 完善 `provider/deepseek.ts` 实现 `init()` 方法
2. 实现 `chat()` 方法，集成 adaptor
3. 添加错误处理和边界检查

### 阶段 3: 主循环重构

1. 修改 `index.ts` 使用 Provider
2. 使用 `createConfig()` 注入配置
3. 集成系统提示管理

### 回滚策略

- 保留原有的直接调用 OpenAI 的代码作为注释
- 使用 Git 版本控制，可随时回滚到重构前版本

## Open Questions

- 是否需要支持运行时动态修改配置？（当前决策: 不支持）
- 是否需要实现 Provider 工厂模式以支持多厂商？（当前决策: 预留接口，暂不实现）
- 系统提示是否需要支持模板变量？（当前决策: 不支持，直接返回字符串）
