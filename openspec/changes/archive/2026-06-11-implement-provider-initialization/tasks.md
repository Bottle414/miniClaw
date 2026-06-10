# 实现任务

## 1. 基础设施搭建

- [x] 1.1 创建 `apps/runtime/src/utils/config.ts`，实现 `createConfig()` 函数
- [x] 1.2 在 `createConfig()` 中实现环境变量加载及默认值
- [x] 1.3 添加必要配置字段的校验（apiKey、baseURL 格式）
- [x] 1.4 在 `apps/runtime/src/prompts/system.ts` 中实现 `getSystemPrompt()`
- [x] 1.5 更新 `apps/runtime/src/provider/index.ts`，导出 Provider 类型和工厂函数

## 2. Provider 实现

- [x] 2.1 在 `DeepSeekProvider` 中实现 `init()` 方法
- [x] 2.2 添加配置存储和客户端初始化逻辑
- [x] 2.3 在 `DeepSeekProvider` 中实现 `chat()` 方法
- [x] 2.4 集成 `deepseekAdapter.transformRequest()` 进行请求转换
- [x] 2.5 集成 `deepseekAdapter.transformResponse()` 进行响应转换
- [x] 2.6 添加 Provider 未初始化状态的错误处理
- [x] 2.7 添加 API 错误处理（认证、速率限制、网络）
- [x] 2.8 在 `chat()` 方法中使用 `transformTools()` 处理工具转换

## 3. 主循环重构

- [x] 3.1 更新 `apps/runtime/src/index.ts`，使用 `createConfig()` 获取配置
- [x] 3.2 将 OpenAI 客户端实例化替换为 `Provider.init(config)`
- [x] 3.3 使用配置中的系统提示词初始化消息历史
- [x] 3.4 将直接的 `openai.chat.completions.create()` 调用替换为 `provider.chat()`
- [x] 3.5 更新消息格式为统一 LLM 类型（LLMMessage、LLMRequest）
- [x] 3.6 确保工具调用通过 Provider 流程处理
- [x] 3.7 使用新 Provider 架构测试端到端对话流程

## 4. 测试与验证

- [x] 4.1 验证从环境变量加载配置
- [x] 4.2 测试使用有效和无效配置初始化 Provider
- [x] 4.3 测试简单消息的对话功能
- [x] 4.4 测试带工具调用的对话功能
- [x] 4.5 验证 API 失败时的错误处理
- [x] 4.6 验证系统提示词正确添加到消息历史
- [x] 4.7 运行 `pnpm dev:runtime` 验证运行时执行
