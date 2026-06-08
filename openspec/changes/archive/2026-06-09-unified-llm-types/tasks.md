## 1. 目录结构搭建

- [x] 1.1 创建 `types/llm/` 目录结构
- [x] 1.2 创建 `types/providers/` 目录结构
- [x] 1.3 更新 `types/index.ts` 导出入口

## 2. 统一类型定义

- [x] 2.1 实现 `llm/message.ts` 消息类型（LLMSystemMessage, LLMUserMessage, LLMAssistantMessage, LLMToolMessage）
- [x] 2.2 实现 `llm/tool.ts` 工具类型（LLMTool, LLMFunctionDefinition, LLMFunctionParameters）
- [x] 2.3 实现 `llm/request.ts` 请求类型（LLMRequest, LLMRequestOptions）
- [x] 2.4 实现 `llm/response.ts` 响应类型（LLMResponse, LLMChoice, LLMUsage）

## 3. 适配器接口

- [x] 3.1 定义 `providers/index.ts` 适配器接口（LLMAdapter, TransformRequest, TransformResponse）
- [x] 3.2 定义提供商类型映射接口

## 4. DeepSeek 适配器实现

- [x] 4.1 迁移现有 `chat.ts` 到 `providers/deepseek/types.ts`
- [x] 4.2 实现 `providers/deepseek/adapter.ts` 请求转换函数
- [x] 4.3 实现 `providers/deepseek/adapter.ts` 响应转换函数
- [x] 4.4 处理 DeepSeek 特有字段（thinking, reasoning_content, prompt_cache_*）

## 5. 类型导出与兼容

- [x] 5.1 更新根 `types/index.ts` 导出统一类型
- [x] 5.2 标记现有 `chat.ts` 为 deprecated，保持向后兼容
- [x] 5.3 添加类型使用文档注释
