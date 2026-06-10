## 1. 类型定义

- [ ] 1.1 在 `apps/runtime/src/types/react/phase.ts` 中定义 ReAct 阶段类型
- [ ] 1.2 在 `apps/runtime/src/types/react/state.ts` 中定义 ReAct 状态接口
- [ ] 1.3 在 `apps/runtime/src/types/react/action.ts` 中定义行动记录类型
- [ ] 1.4 在 `apps/runtime/src/types/react/observation.ts` 中定义观察记录类型
- [ ] 1.5 在 `apps/runtime/src/types/react/termination.ts` 中定义终止原因类型
- [ ] 1.6 在 `apps/runtime/src/types/react/index.ts` 中导出所有 ReAct 类型

## 2. ReAct 状态管理

- [ ] 2.1 创建 `apps/runtime/src/react/state.ts` 模块
- [ ] 2.2 实现 `createInitialState()` 函数初始化 ReAct 状态
- [ ] 2.3 实现 `updateState()` 函数进行不可变状态更新
- [ ] 2.4 实现阶段转换验证逻辑
- [ ] 2.5 实现状态辅助函数（getIteration、getPhase 等）
- [ ] 2.6 为状态管理函数添加单元测试

## 3. ReAct 终止逻辑

- [ ] 3.1 创建 `apps/runtime/src/react/terminator.ts` 模块
- [ ] 3.2 实现带多级检查的 `shouldTerminate()` 函数
- [ ] 3.3 实现迭代限制检查
- [ ] 3.4 实现最终答案检测
- [ ] 3.5 实现错误条件检测
- [ ] 3.6 实现空响应处理
- [ ] 3.7 为终止逻辑添加单元测试

## 4. ReAct 循环编排

- [ ] 4.1 创建 `apps/runtime/src/react/loop.ts` 模块
- [ ] 4.2 实现 `executeReActLoop()` 主编排函数
- [ ] 4.3 实现 Think 阶段处理器
- [ ] 4.4 实现 Act 阶段处理器（工具调用检测）
- [ ] 4.5 实现 Observe 阶段处理器（工具执行）
- [ ] 4.6 实现 Decide 阶段处理器（终止检查）
- [ ] 4.7 实现行动和观察记录
- [ ] 4.8 添加错误处理和恢复逻辑
- [ ] 4.9 为完整 ReAct 周期添加集成测试

## 5. 消息处理更新

- [ ] 5.1 更新 `apps/runtime/src/utils/message.ts` 以支持 ReAct 观察
- [ ] 5.2 增强消息构造以包含 ReAct 元数据
- [ ] 5.3 实现观察结果到消息的转换
- [ ] 5.4 更新工具执行以返回结构化观察结果
- [ ] 5.5 为增强的消息处理添加测试

## 6. Provider 更新以支持 ReAct

- [ ] 6.1 更新 `apps/runtime/src/provider/deepseek.ts` 以接受 ReAct 上下文
- [ ] 6.2 添加 ReAct 系统提示配置支持
- [ ] 6.3 实现 ReAct 阶段的响应解析
- [ ] 6.4 添加阶段特定的请求选项支持
- [ ] 6.5 更新消息格式以保持 ReAct 上下文
- [ ] 6.6 为 ReAct 特定的 Provider 行为添加测试

## 7. 配置更新

- [ ] 7.1 在 `apps/runtime/src/types/config/index.ts` 的 RuntimeConfig 中添加 ReAct 配置选项
- [ ] 7.2 更新 `apps/runtime/src/utils/config.ts` 中的 `createConfig()` 添加 ReAct 默认值
- [ ] 7.3 添加 maxIterations 配置（默认：10）
- [ ] 7.4 添加 ReAct 特定的系统提示配置
- [ ] 7.5 更新新配置选项的环境变量处理
- [ ] 7.6 记录新配置选项

## 8. 主循环集成

- [ ] 8.1 在 `apps/runtime/src/index.ts` 中创建 ReAct 循环功能开关
- [ ] 8.2 在 main() 函数中实现 ReAct 循环路径
- [ ] 8.3 保留旧循环作为回退选项
- [ ] 8.4 添加状态检查日志用于调试
- [ ] 8.5 测试新旧循环路径
- [ ] 8.6 更新 CLI 交互以显示 ReAct 阶段（可选）

## 9. 测试与验证

- [ ] 9.1 为所有 ReAct 模块编写单元测试
- [ ] 9.2 为完整 ReAct 周期编写集成测试
- [ ] 9.3 使用现有工具（天气工具）测试
- [ ] 9.4 测试终止条件（迭代限制、最终答案、错误）
- [ ] 9.5 测试边缘情况（空响应、工具失败、API 错误）
- [ ] 9.6 验证与现有功能的向后兼容性
- [ ] 9.7 性能测试（对比旧循环的 token 使用量）

## 10. 文档

- [ ] 10.1 更新 `docs/架构设计.md` 添加 ReAct 循环架构
- [ ] 10.2 在 README.md 中添加 ReAct 循环文档
- [ ] 10.3 记录配置选项
- [ ] 10.4 添加 ReAct 循环行为示例
- [ ] 10.5 记录调试和状态检查技术
