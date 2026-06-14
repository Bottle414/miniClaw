## MODIFIED Requirements

### Requirement: 适配器接口定义

系统 SHALL 提供 LLM 适配器接口，规范提供商类型转换规则。

#### Scenario: 请求转换
- **WHEN** 业务代码调用适配器的 `transformRequest` 方法
- **THEN** 适配器将统一 `LLMRequest` 类型转换为目标提供商的请求格式

#### Scenario: 响应转换
- **WHEN** LLM 返回提供商特定格式的响应
- **THEN** 适配器将响应转换为统一的 `LLMResponse` 类型

#### Scenario: 流式 chunk 转换
- **WHEN** LLM 返回提供商特定格式的流式 chunk
- **THEN** 适配器 SHALL 通过可选的 `transformStreamChunk(chunk)` 方法将 chunk 转换为 `RuntimeEvent | null`
- **AND** 若 chunk 无有意义内容，返回 `null`

#### Scenario: 编译时类型检查
- **WHEN** 业务代码使用适配器
- **THEN** TypeScript 编译器能够正确推断输入输出类型

#### Scenario: 运行时数据完整性
- **WHEN** 转换过程中遇到提供商特有字段
- **THEN** 适配器保留原始数据，不丢失信息
