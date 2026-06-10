# 系统提示词规格

## Purpose

管理系统提示词的生成、配置和注入到消息历史。

## Requirements

### Requirement: 系统提示词模块提供提示词获取函数

系统 SHALL 提供 `getSystemPrompt()` 函数，返回系统提示词字符串。

#### Scenario: 获取系统提示词

- **WHEN** 调用 `getSystemPrompt()`
- **THEN** 函数 SHALL 返回包含系统提示词的非空字符串
- **AND** 提示词 SHALL 定义助手的角色和行为

### Requirement: 系统提示词可通过配置设定

系统提示词 SHALL 包含在 RuntimeConfig 中并传递给 Provider。

#### Scenario: 使用自定义系统提示词

- **WHEN** 使用自定义 systemPrompt 创建 Config 对象
- **THEN** 配置 SHALL 包含自定义系统提示词
- **AND** Provider 初始化消息历史时 SHALL 使用该提示词

#### Scenario: 使用默认系统提示词

- **WHEN** 在无自定义配置的情况下调用 `getSystemPrompt()`
- **THEN** 函数 SHALL 返回适用于通用助手的默认系统提示词

### Requirement: 系统提示词添加到消息历史

系统提示词 SHALL 作为对话历史中的第一条消息添加。

#### Scenario: 初始化消息历史

- **WHEN** 主循环启动
- **THEN** 消息历史中的第一条消息 SHALL 为系统消息
- **AND** 系统消息内容 SHALL 为已配置的系统提示词

#### Scenario: 系统消息格式

- **WHEN** 系统提示词被添加到消息历史
- **THEN** SHALL 格式化为 role 为 "system" 的 LLMSystemMessage
- **AND** content SHALL 为包含单个文本段的数组
