## Why

当前 miniClaw 的类型定义直接绑定 DeepSeek API 结构，缺乏抽象层。这导致：
1. 切换 LLM 提供商需要大量代码修改
2. 不同模型的特有功能（如 DeepSeek 的思考模式）难以统一管理
3. 业务逻辑与具体 API 耦合，难以测试和维护

通过引入统一的数据结构层，可以实现 LLM 提供商的解耦，为未来支持多模型切换奠定基础。

## What Changes

- **新增** `types/llm/` 目录，存放与具体 LLM 无关的抽象类型定义
- **新增** `types/providers/` 目录，存放各 LLM 提供商的适配层
- **新增** 转换层：负责统一类型与提供商特定类型之间的双向转换
- **保留** 现有 `types/chat.ts` 作为 DeepSeek 提供商类型定义

## Capabilities

### New Capabilities

- `llm-types`: 统一的 LLM 数据结构定义，包含消息、工具、请求、响应等核心类型
- `llm-adapter`: LLM 适配器接口定义，规范不同提供商的转换规则

### Modified Capabilities

无。这是新增功能，不影响现有行为。

## Impact

- **新增文件**: `apps/runtime/src/types/llm/` 目录下多个类型文件
- **依赖关系**: 现有 `chat.ts` 将作为 DeepSeek 适配层的实现参考
- **向后兼容**: 不破坏现有代码，渐进式迁移