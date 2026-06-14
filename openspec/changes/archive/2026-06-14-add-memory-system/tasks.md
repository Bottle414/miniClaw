## 1. 记忆模型与上下文构建器

- [x] 1.1 新增运行时记忆类型：会话记忆、工作记忆、记忆条目和上下文构建结果
- [x] 1.2 实现会话记忆操作：设置、替换、列举和清除会话作用域条目
- [x] 1.3 实现工作记忆操作：设置、列举和清除临时条目
- [x] 1.4 实现确定性摘要器接口和初始简单摘要器
- [x] 1.5 实现上下文构建器，从权威 `messages`、会话记忆和工作记忆派生 `contextMessages`
- [x] 1.6 添加单元测试，验证保留、丢弃、注入和摘要行为不修改权威消息

## 2. 运行时集成

- [x] 2.1 在主运行时入口创建运行时记忆状态，与现有权威 `messages` 数组并列
- [x] 2.2 更新旧版非流式 Provider 调用，构建并传递 `contextMessages`
- [x] 2.3 更新旧版流式 Provider 调用，构建并传递 `contextMessages`
- [x] 2.4 更新 ReAct 循环配置，接受记忆/上下文构建输入，不替换权威 ReAct 状态
- [x] 2.5 更新 ReAct Act 阶段，在 `provider.chatStream()` 前构建 `contextMessages`，同时保留完整 `state.messages`

## 3. Message Handler 重构

- [x] 3.1 拆分或重命名当前 `messageHandler`，使工具调用执行作为聚焦的工具消息工具暴露
- [x] 3.2 更新导入和调用点，使用聚焦的工具消息工具
- [x] 3.3 保持流消息合并工具与记忆和工具执行职责分离

## 4. 验证

- [x] 4.1 添加或更新测试，证明 Provider 请求接收 `contextMessages` 而 `messages` 保持完整
- [x] 4.2 添加或更新 ReAct 测试，证明上下文构建不从 ReAct 状态中移除助手/工具消息
- [x] 4.3 运行项目测试套件和类型检查
- [x] 4.4 运行 `openspec validate add-memory-system --strict` 并修复任何提案/规格问题
