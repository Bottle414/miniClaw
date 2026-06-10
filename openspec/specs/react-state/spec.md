# ReAct 状态规格

## Purpose

定义 ReAct 循环的状态管理机制，包括不可变状态对象、状态更新函数和状态跟踪功能。

## Requirements

### 需求：系统 SHALL 提供不可变状态对象

系统 SHALL 提供不可变状态对象，捕获 ReAct 循环在任意时刻的完整状态。状态对象 SHALL 通过创建新实例而非修改现有状态来更新。

#### 场景：状态不可变性

- **WHEN** ReAct 循环执行期间更新状态
- **THEN** 系统 SHALL 创建新的状态对象
- **AND** 系统 SHALL 不修改现有状态对象
- **AND** 先前状态 SHALL 保持可访问

#### 场景：状态快照

- **WHEN** 开发者需要检查特定时刻的状态
- **THEN** 系统 SHALL 提供状态快照访问
- **AND** 快照 SHALL 反映该时刻的状态

### 需求：系统 SHALL 跟踪迭代次数

状态 SHALL 包含迭代计数器，在每次完整的 Think → Act → Observe → Decide 周期后递增。计数器 SHALL 从 0 开始，每个周期后加 1。

#### 场景：初始迭代次数

- **WHEN** ReAct 循环启动
- **THEN** 状态 SHALL 迭代次数为 0
- **AND** 状态 SHALL 处于 'thinking' 阶段

#### 场景：迭代次数递增

- **WHEN** ReAct 循环完成一个完整周期
- **THEN** 系统 SHALL 将迭代次数加 1
- **AND** 状态 SHALL 反映更新后的计数

### 需求：系统 SHALL 跟踪当前阶段

状态 SHALL 包含跟踪当前 ReAct 阶段的字段。有效阶段 SHALL 为：'thinking'、'acting'、'observing'、'deciding'。

#### 场景：阶段转换

- **WHEN** ReAct 循环在阶段之间转换
- **THEN** 系统 SHALL 更新阶段字段
- **AND** 系统 SHALL 验证阶段为以下之一：thinking、acting、observing、deciding

#### 场景：初始阶段

- **WHEN** ReAct 循环启动
- **THEN** 状态 SHALL 阶段设置为 'thinking'

### 需求：系统 SHALL 维护消息历史

状态 SHALL 维护 ReAct 循环期间交换的完整 LLM 消息历史。消息 SHALL 包括用户消息、助手消息和工具消息。

#### 场景：消息累积

- **WHEN** ReAct 执行期间添加新消息
- **THEN** 系统 SHALL 将消息追加到消息历史
- **AND** 系统 SHALL 保持消息顺序
- **AND** 系统 SHALL 不移除现有消息

#### 场景：消息历史访问

- **WHEN** LLM 需要推理对话历史
- **THEN** 系统 SHALL 提供对完整消息历史的访问
- **AND** 消息 SHALL 按时间顺序排列

### 需求：系统 SHALL 维护行动历史

状态 SHALL 维护表示工具执行的行动记录列表。每条行动记录 SHALL 包含工具名称、参数、时间戳和结果。

#### 场景：行动记录

- **WHEN** 在 Act 阶段执行工具
- **THEN** 系统 SHALL 创建行动记录
- **AND** 行动记录 SHALL 包含工具名称和参数
- **AND** 行动记录 SHALL 包含执行时间戳

#### 场景：行动历史查询

- **WHEN** LLM 或开发者查询行动历史
- **THEN** 系统 SHALL 返回行动记录列表
- **AND** 记录 SHALL 按时间顺序排列

### 需求：系统 SHALL 维护观察历史

状态 SHALL 维护表示工具执行结果的观察记录列表。每条观察记录 SHALL 包含工具调用 ID、工具名称、结果、成功状态和时间戳。

#### 场景：观察记录

- **WHEN** 工具执行完成
- **THEN** 系统 SHALL 创建观察记录
- **AND** 观察记录 SHALL 包含结果和成功状态
- **AND** 观察记录 SHALL 包含时间戳

#### 场景：观察历史访问

- **WHEN** LLM 在 Think 阶段进行推理
- **THEN** 系统 SHALL 提供对观察历史的访问
- **AND** 观察 SHALL 与对应的行动关联

### 需求：系统 SHALL 跟踪终止状态

状态 SHALL 包含跟踪循环是否应终止及终止原因的字段。终止原因 SHALL 为以下之一：'final_answer'、'iteration_limit'、'error'、'empty_response'。

#### 场景：请求终止

- **WHEN** 满足终止条件
- **THEN** 状态 SHALL 将 shouldTerminate 设为 true
- **AND** 状态 SHALL 将 terminationReason 设为适当的值

#### 场景：不终止

- **WHEN** 未满足终止条件
- **THEN** 状态 SHALL shouldTerminate 为 false
- **AND** terminationReason SHALL 为 undefined

### 需求：系统 SHALL 提供状态初始化

系统 SHALL 提供函数以默认值初始化 ReAct 状态。初始状态 SHALL 迭代次数为 0、阶段为 'thinking'、消息历史为空、shouldTerminate 为 false。

#### 场景：状态初始化

- **WHEN** 初始化 ReAct 状态
- **THEN** 状态 SHALL 迭代次数为 0
- **AND** 状态 SHALL 阶段为 'thinking'
- **AND** 状态 SHALL 行动历史为空
- **AND** 状态 SHALL 观察历史为空
- **AND** 状态 SHALL shouldTerminate 为 false

### 需求：系统 SHALL 提供状态更新函数

系统 SHALL 提供函数创建更新后的状态对象。更新函数 SHALL 接受部分状态更新并返回新的状态对象。

#### 场景：状态更新

- **WHEN** 使用部分更新调用状态更新函数
- **THEN** 系统 SHALL 创建新的状态对象
- **AND** 新状态 SHALL 将更新与现有状态合并
- **AND** 现有状态 SHALL 保持不变

#### 场景：状态更新验证

- **WHEN** 状态更新包含无效值
- **THEN** 系统 SHALL 验证状态值
- **AND** 系统 SHALL 拒绝无效更新
- **AND** 系统 SHALL 提供验证错误
