# Provider Initialization and Configuration Injection

## Why

当前 `index.ts` 直接使用 OpenAI 客户端，违反了项目的分层架构原则。Provider 接口已在类型层定义但未实现，导致配置散落在代码各处，无法支持多厂商切换和统一管理。需要建立完整的配置注入机制和 Provider 实现，以符合项目规范要求的"通过 Provider 做配置初始化和聊天信息发送"。

## What Changes

- 实现 `Provider` 接口的 `init()` 和 `chat()` 方法
- 创建配置注入机制，支持 `RuntimeConfig` 与 `TaskConfig` 的合并与传递
- 重构 `index.ts` 主循环，使用 Provider 替代直接调用 OpenAI 客户端
- 完善 `DeepSeekProvider` 实现，集成 adaptor 层进行类型转换
- 实现系统提示管理（`prompts/system.ts`）
- 创建 Provider 工厂函数，支持基于配置动态创建 Provider 实例

## Capabilities

### New Capabilities

- `provider-initialization`: Provider 初始化流程，包括配置注入、客户端创建、默认值设置
- `provider-chat`: Provider 聊天功能，集成 adaptor 进行类型转换，支持工具调用
- `config-management`: 配置管理机制，支持运行时配置与任务配置的合并、验证与注入
- `system-prompt`: 系统提示管理，支持动态生成和配置

### Modified Capabilities

无（这是新功能实现，不修改现有规格要求）

## Impact

### 代码变更

- `apps/runtime/src/index.ts` - 重构主循环，使用 Provider
- `apps/runtime/src/provider/deepseek.ts` - 完整实现 DeepSeekProvider
- `apps/runtime/src/provider/index.ts` - 导出 Provider 工厂和类型
- `apps/runtime/src/prompts/system.ts` - 实现系统提示管理
- `apps/runtime/src/utils/config.ts` (新增) - 配置合并与验证工具

### API 变更

- `Provider.init(config: Config)` - 初始化方法实现
- `Provider.chat(req: LLMRequest)` - 聊天方法实现
- `createProvider(config: Config)` - Provider 工厂函数

### 依赖影响

- 继续使用 `openai` 包作为 DeepSeek 兼容客户端
- 通过 adaptor 层隔离提供商特定类型
