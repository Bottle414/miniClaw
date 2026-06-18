## Context

miniClaw 是一个 Agent Runtime 学习项目，当前 Web UI 仅有简单的单栏聊天界面，使用自定义 CSS 实现。界面无法展示 Runtime 内部状态（ReAct 迭代、工具调用、Memory 系统），且模块划分不清晰。

当前技术栈：React 19 + Vite 8，已声明 antd@^6 和 @ant-design/icons@^6 但未使用。后端为 Express 5 服务器，通过 SSE 推送 RuntimeEvent。SSE 客户端已实现，message-merger 仅处理 text-delta 和 loop-complete 事件，其余事件被丢弃。

项目规范要求：CSS Modules 组件级样式分离、函数+闭包优于类、Props 独立 interface 声明、TypeScript strict 模式。

## Goals / Non-Goals

**Goals:**
- 实现三栏布局（Session Sidebar + Chat Area + Runtime Inspector），参考 Claude Web 风格
- 引入 Ant Design 统一组件风格，替换自定义 CSS
- Sidebar 和 Inspector 支持展开/折叠
- Runtime Inspector 可展示 ReAct 迭代时间线、工具执行记录、Memory 状态、Session 元信息
- 扩展 SSE 事件处理，将 Runtime 事件数据提供给 Inspector
- 使用 Zustand 管理 UI 和 Runtime 事件状态
- 保留消息拼接和流式输出的核心逻辑

**Non-Goals:**
- 1:1 复刻 Claude Web 界面
- 花哨动画、渐变、科技蓝特效
- Session 搜索功能实现（仅预留 UI）
- Markdown 渲染、代码高亮（后续迭代）
- React 思考过程展示、Tool Call 在聊天区域展示（后续迭代）
- 多语言支持
- 深色模式（当前仅浅色）

## Decisions

### 1. 状态管理：Zustand 替代 useState

**选择**: Zustand 管理 Sidebar/Inspector 展开状态、Session 列表、Runtime 事件数据

**替代方案**: React Context + useReducer — 样板代码多，跨组件传递不直观

**理由**: Zustand 轻量、无 Provider 包裹、支持 selector 精确订阅、项目规范明确指定。将拆分为多个 store：
- `useUIStore`: Sidebar/Inspector 展开状态
- `useChatStore`: Session 列表、消息、流式状态、消息操作
- `useRuntimeStore`: Runtime 事件、工具记录、迭代状态

### 2. 组件库：Ant Design

**选择**: 使用 antd 组件和 @ant-design/icons

**替代方案**: Headless UI + Tailwind — 需自行实现所有交互，工作量大

**理由**: 已声明依赖、组件齐全（Layout、Sider、Tabs、Collapse、Input、Button、List 等）、风格统一。使用 antd 的 ConfigProvider 定制主题色为 Claude 风格的浅灰/白配色。

### 3. 样式方案：Ant Design + CSS Modules 补充

**选择**: 以 Ant Design 组件为主，自定义样式用 CSS Modules

**替代方案**: 纯 CSS Modules — 需自行实现所有交互组件

**理由**: Ant Design 处理复杂交互（Tabs、Collapse、Sider），CSS Modules 处理 Ant Design 无法覆盖的定制样式（消息气泡、Runtime 时间线等）。符合项目规范要求组件级样式分离。

### 4. Runtime Inspector 数据来源：SSE 事件 + 新增 API

**选择**: Events/Tools 数据从 SSE 事件流中提取，Memory/Session 数据通过新增 REST API 获取

**替代方案**: 全部通过 SSE 推送 — 会改变现有事件模型，侵入性强

**理由**: SSE 事件已包含 iteration-start、phase-change、tool-execute、tool-result 等数据，前端只需扩展处理即可。Memory 和 Session 详情需要主动查询，适合 REST API。新增接口：
- `GET /api/session/:id` — Session 详情（id、createdAt、updatedAt、messageCount）
- `GET /api/session/:id/memory` — Memory 状态（summary、facts、contextMessages 数量、canonicalMessages 数量）

### 5. 组件结构

**选择**: 按功能域组织组件目录

```
src/
├── components/
│   ├── Layout/           # 整体三栏布局
│   ├── Sidebar/          # Session 侧边栏
│   │   ├── SidebarIcons/ # 图标列
│   │   └── SessionList/  # Session 列表
│   ├── Chat/             # 聊天区域
│   │   ├── MessageList/
│   │   ├── ChatMessage/
│   │   ├── ChatInput/
│   │   └── StreamingIndicator/
│   └── Inspector/        # Runtime Inspector
│       ├── EventsTab/
│       ├── ToolsTab/
│       ├── MemoryTab/
│       └── SessionTab/
├── stores/               # Zustand stores
├── hooks/                # 自定义 hooks
├── lib/                  # 工具函数
└── types/                # 类型定义
```

**理由**: 按功能域组织，每个组件文件夹包含 index.tsx + index.module.css，符合项目规范。SidebarIcons 独立出来方便后续扩展图标。

### 6. SSE 事件扩展处理

**选择**: 在 message-merger 基础上新增 runtime-event-processor，将 Runtime 事件分发到 Zustand store

**理由**: message-merger 专注于消息文本拼接（职责单一），runtime-event-processor 专注于 Runtime 事件数据提取（迭代、阶段、工具调用）。两者在 SSE 事件流消费时并行调用，互不干扰。

## Risks / Trade-offs

- **[Ant Design 包体积大]** → 使用 Vite tree-shaking + 按需导入，实际影响可控
- **[Runtime Inspector 数据可能不完整]** → 首期仅展示 SSE 已推送的事件数据，Memory/Session 详情依赖新增后端接口，可能需同步改造 runtime 包暴露查询方法
- **[三栏布局在小屏幕体验差]** → 使用 antd Sider 的 responsive breakpoint，小屏自动折叠 Sidebar 和 Inspector
- **[Zustand store 拆分粒度]** → 拆三个 store 可能过度，但考虑到 chat 逻辑复杂度和 runtime 数据独立性，分开更清晰。如果后续发现跨 store 交互多，可合并
