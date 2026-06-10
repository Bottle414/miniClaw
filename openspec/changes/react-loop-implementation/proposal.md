## 为什么

当前主循环使用简单的递归模式，缺少显式的推理步骤。这使得 LLM 难以通过复杂的多步任务进行推理，也限制了决策过程的透明度。ReAct（Reasoning + Acting）模式提供了一种结构化方法，LLM 在其中显式地思考（Think）、行动（Act，调用工具）、观察（Observe）结果，并决定（Decide）是继续还是终止。这提高了任务成功率，使推理过程透明化，并便于调试 Agent 行为。

## 变更内容

- **新增 ReAct 循环编排**，用显式的 Think → Act → Observe → Decide 循环替代当前的递归 `sendMessage()` 模式
- **新增 ReAct 状态管理**，跟踪循环迭代次数、当前阶段（thinking/acting/observing）和终止条件
- **修改工具执行流程**，返回结构化观察结果以反馈到推理循环
- **增强消息历史处理**，维护 ReAct 特定的上下文（思考过程、行动历史、观察结果）
- **新增终止逻辑**，允许 LLM 决定何时给出最终答案 vs. 继续行动
- **可选的迭代限制和安全保护**，防止边缘情况下的无限循环

## 能力

### 新增能力

- `react-loop`：ReAct 风格的 Agent 循环，包含显式的 Think-Act-Observe-Decide 阶段、状态跟踪和结构化终止逻辑
- `react-state`：ReAct 循环的状态管理，包括迭代计数、阶段跟踪、行动历史和观察结果累积

### 修改能力

- `provider-chat`：增强以支持 ReAct 特定的提示和响应解析，用于提取思考/行动/答案

## 影响

**受影响的代码：**

- `apps/runtime/src/index.ts` — 主循环从递归模式转为 ReAct 模式
- `apps/runtime/src/utils/message.ts` — 增强消息处理以支持 ReAct 阶段
- `apps/runtime/src/utils/tool.ts` — 结构化观察结果替代简单字符串

**新增代码：**

- `apps/runtime/src/react/loop.ts` — ReAct 循环编排
- `apps/runtime/src/react/state.ts` — ReAct 状态管理
- `apps/runtime/src/react/terminator.ts` — 终止逻辑和安全保护

**类型变更：**

- 新增 ReAct 阶段、状态、观察和决策的类型
- 增强消息类型以包含推理元数据

**依赖：**

- 无需新增外部依赖
- 基于现有的 provider、adaptor 和 tool 基础设施构建
