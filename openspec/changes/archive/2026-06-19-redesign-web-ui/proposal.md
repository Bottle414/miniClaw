## Why

当前 Web UI 界面简陋、模块划分不清晰，且无法展示 Agent Runtime 的运行状态（工具调用、ReAct 迭代、Memory 系统等）。作为 Agent Runtime 学习项目，需要一个专业、简洁的界面来直观展示 Runtime 内部工作过程，同时提供良好的聊天交互体验。

## What Changes

- **BREAKING** 重写 Web UI 整体布局，从单栏改为三栏布局（Session Sidebar + Chat Area + Runtime Inspector）
- **BREAKING** 替换现有自定义 CSS 样式为 Ant Design 组件库，统一视觉风格
- **BREAKING** 重构 Sidebar 组件，支持展开/折叠、图标列、Session 列表滚动
- 新增 Runtime Inspector 面板，包含 Events / Tools / Memory / Session 四个 Tab
- 新增 Zustand 状态管理，替代 useChat hook 中的 useState 状态
- 扩展 SSE 事件处理，从仅处理 text-delta/loop-complete 扩展到处理所有 RuntimeEvent 类型
- 新增后端 API 接口以支持 Runtime Inspector 数据获取（Session 详情、Memory 状态等）
- 保留消息拼接（message-merger）和流式输出（sse-client）的核心逻辑

## Capabilities

### New Capabilities
- `session-sidebar`: 可展开折叠的 Session 侧边栏，包含图标列（Logo、New Chat、搜索预留、折叠按钮）和 Session 列表（标题、更新时间、删除）
- `runtime-inspector`: Runtime Inspector 面板，包含 Events（ReAct 迭代时间线）、Tools（工具执行记录折叠展开）、Memory（Summary/Facts/Context Messages）、Session（Session 元信息）四个 Tab
- `ui-state-management`: 基于 Zustand 的 UI 状态管理，管理 Sidebar/Inspector 展开折叠状态、当前 Session、Runtime 事件数据等

### Modified Capabilities
- `web-chat-ui`: 布局从单栏改为三栏，消息区域居中最大宽度 800px，Assistant/User 使用不同背景，输入区域固定底部；引入 Ant Design 组件库替换自定义样式
- `message-merge`: 扩展事件处理，从仅处理 text-delta/loop-complete 扩展到处理 iteration-start、phase-change、tool-execute、tool-result、loop-end 等事件，为 Runtime Inspector 提供数据
- `sse-server`: 新增 API 接口以支持 Runtime Inspector 数据获取（Session 详情、Memory 状态、工具执行记录等）

## Impact

- **apps/web/**: 几乎全部重写 — 组件结构、样式、状态管理、事件处理
- **apps/server/**: 新增 API 接口（Session 详情、Memory 状态等）
- **apps/runtime/**: 可能需要暴露更多内部状态（Memory、Session 详情）给外部查询
- **依赖**: antd@^6、@ant-design/icons@^6（已声明未使用）、zustand（新增）
- **CSS**: 从 App.css 单文件迁移到 CSS Modules（按项目规范要求组件级样式分离）
