## 1. 项目基础设施

- [x] 1.1 安装 zustand 依赖到 apps/web
- [x] 1.2 配置 Ant Design ConfigProvider 主题（Claude 风格浅色主题），替换 index.css 中的 CSS 变量体系
- [x] 1.3 创建组件目录结构：Layout/、Sidebar/、SidebarIcons/、SessionList/、Chat/、MessageList/、ChatMessage/、ChatInput/、StreamingIndicator/、Inspector/、EventsTab/、ToolsTab/、MemoryTab/、SessionTab/
- [x] 1.4 创建 stores/ 目录，定义类型文件

## 2. Zustand Store 实现

- [x] 2.1 实现 useUIStore：sidebarOpen、inspectorOpen 状态及 toggle actions
- [x] 2.2 实现 useChatStore：sessions、activeSessionId、messagesMap、isStreaming 状态及 selectSession、newChat、sendMessage、deleteSession actions（从 useChat hook 迁移逻辑）
- [x] 2.3 实现 useRuntimeStore：iterations、phaseChanges、toolRecords、runtimeEvents 状态及 processRuntimeEvent、clearRuntime actions

## 3. SSE 事件处理扩展

- [x] 3.1 新增 runtime-event-processor.ts，处理 iteration-start、phase-change、tool-execute、tool-result、loop-end 事件，分发到 useRuntimeStore
- [x] 3.2 修改 useChatStore 的 sendMessage，在消费 SSE 事件流时同时调用 message-merger（消息拼接）和 runtime-event-processor（事件分发）
- [ ] 3.3 删除 useChat.ts hook（逻辑已迁移到 stores）

## 4. 后端 API 扩展

- [x] 4.1 在 runtime 包中暴露 sessionManager 的查询方法（getSessionDetail、getSessionMemory），如需要则改造 runtime 导出接口
- [x] 4.2 在 server 中新增 GET /api/session/:id 接口，返回 Session 详情（id、createdAt、updatedAt、messageCount）
- [x] 4.3 在 server 中新增 GET /api/session/:id/memory 接口，返回 Memory 状态（summaries、facts、contextMessagesCount、canonicalMessagesCount）

## 5. Layout 组件

- [x] 5.1 实现 Layout 组件（index.tsx + index.module.css），三栏布局：左侧 Sider + 中间 Chat + 右侧 Inspector，使用 antd Layout/Sider
- [x] 5.2 实现 Header 组件，显示 miniClaw 标题

## 6. Session Sidebar 组件

- [x] 6.1 实现 SidebarIcons 组件：Logo、New Chat（PlusOutlined）、搜索框（Input placeholder）、折叠按钮（MenuFoldOutlined/MenuUnfoldOutlined），sticky 定位
- [x] 6.2 实现 SessionList 组件：可滚动列表，每项显示标题+更新时间，hover 显示 DeleteOutlined，点击切换 Session
- [x] 6.3 实现 Sidebar 主组件：整合 SidebarIcons + SessionList，展开/折叠动画，折叠时仅显示图标列

## 7. Chat Area 组件

- [x] 7.1 实现 ChatMessage 组件：消息气泡，Assistant/User 不同背景色，居中显示，最大宽度 800px
- [x] 7.2 实现 MessageList 组件：可滚动消息列表，自动滚动到底部
- [x] 7.3 实现 StreamingIndicator 组件：流式输出时的呼吸动画指示器
- [x] 7.4 实现 ChatInput 组件：底部固定输入框 + 发送按钮，使用 antd Input，Enter 提交
- [x] 7.5 实现 Chat 主组件：整合 MessageList + ChatInput，消息居中容器

## 8. Runtime Inspector 组件

- [x] 8.1 实现 Inspector 主组件：antd Tabs，可折叠面板，宽度约 320px
- [x] 8.2 实现 EventsTab：ReAct 迭代时间线，显示 iteration-start / phase-change / loop-end 事件
- [x] 8.3 实现 ToolsTab：工具执行记录列表，antd Collapse 折叠展开，显示工具名、参数、结果
- [x] 8.4 实现 MemoryTab：调用 /api/session/:id/memory 接口，展示 Summary、Facts、Context Messages 数量、Canonical Messages 数量
- [x] 8.5 实现 SessionTab：调用 /api/session/:id 接口，展示 Session ID、Created At、Updated At、Message Count

## 9. 清理与整合

- [x] 9.1 删除旧 App.tsx、App.css，替换为新 Layout 组件
- [x] 9.2 删除旧 Sidebar.tsx、ChatInput.tsx、ChatMessage.tsx、MessageList.tsx、SegmentRenderer.tsx、StreamingIndicator.tsx
- [x] 9.3 清理 index.css，移除不再使用的 CSS 变量和全局样式
- [x] 9.4 更新 main.tsx 入口，包裹 ConfigProvider
- [x] 9.5 验证整体功能：新建 Session、发送消息、流式输出、切换 Session、删除 Session、Inspector 各 Tab 展示
