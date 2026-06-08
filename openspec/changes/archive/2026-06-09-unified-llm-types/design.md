## Context

当前 miniClaw 项目直接使用 DeepSeek API 类型定义（`apps/runtime/src/types/chat.ts`），业务逻辑与具体提供商紧密耦合。需要设计一个抽象层，使核心逻辑不依赖任何特定的 LLM 提供商。

**当前状态**:
- `types/chat.ts` 包含 DeepSeek 专有类型
- 业务代码直接使用这些类型
- 无适配器模式，切换成本高

## Goals / Non-Goals

**Goals:**
- 定义与提供商无关的统一消息、工具、请求/响应类型
- 设计适配器接口，支持不同 LLM 提供商的转换
- 实现零成本抽象（编译时类型检查，运行时无额外开销）
- 保持向后兼容，渐进式迁移

**Non-Goals:**
- 不实现流式响应处理（后续迭代）
- 不实现多提供商并发调用
- 不修改现有业务逻辑行为

## Decisions

### D1: 类型层次结构

**选择**: 三层类型架构
```
统一类型 (llm/)          ← 业务代码使用
    ↕ 转换函数
提供商类型 (providers/)  ← SDK 交互使用
```

**理由**:
- 清晰的职责分离
- 业务代码只依赖抽象层
- 新增提供商只需添加转换函数

**备选方案**:
- 直接继承 OpenAI 类型：DeepSeek 有专有字段（thinking, reasoning_content），难以表达
- 运行时类型转换：增加运行时开销，类型安全性差

### D2: 统一类型设计原则

**选择**: 取各提供商的公共交集 + 扩展字段

```typescript
// 统一消息类型
interface LLMMessage {
  role: LLMRole        // 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  // 扩展字段由各提供商适配器处理
}

// 统一请求类型
interface LLMRequest {
  messages: LLMMessage[]
  model: string
  tools?: LLMTool[]
  // 提供商特有参数通过泛型扩展
}
```

**理由**:
- 核心字段保持一致性
- 特有功能通过扩展字段支持
- 类型安全，IDE 友好

### D3: 目录结构

**选择**:
```
apps/runtime/src/types/
├── index.ts              # 导出入口
├── internal/                  # 统一抽象类型
│   ├── message.ts        # 消息类型
│   ├── tool.ts           # 工具类型
│   ├── request.ts        # 请求类型
│   └── response.ts       # 响应类型
├── providers/            # 提供商适配层
│   ├── index.ts          # 适配器接口
│   └── deepseek/         # DeepSeek 适配
│       ├── types.ts      # (即现有 chat.ts)
│       └── adapter.ts    # 转换函数
└── chat.ts               # 迁移后删除
```

**理由**:
- 职责清晰，易于维护
- 新增提供商只需添加目录
- 现有代码不受影响

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 类型转换可能丢失提供商特有字段 | 使用泛型扩展字段，保留原始数据 |
| 迁移工作量大 | 还好，没事 |
| 过度抽象导致复杂性 | 只抽象必要字段，保持简洁 |