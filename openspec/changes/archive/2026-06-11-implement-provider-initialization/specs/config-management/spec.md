# 配置管理规格

## 新增需求

### 需求：配置工厂创建 Config 对象

系统 SHALL 提供 `createConfig(env)` 函数，从环境变量创建完整的 Config 对象。

#### 场景：从环境变量创建配置

- **WHEN** 调用 `createConfig()` 且 process.env 中包含 DEEPSEEK_API_KEY
- **THEN** 函数 SHALL 返回合并了 RuntimeConfig 和 TaskConfig 的 Config 对象
- **AND** Config SHALL 包含 baseURL（含默认值）、apiKey、model（含默认值）和 systemPrompt

#### 场景：缺少必要的 API Key

- **WHEN** 调用 `createConfig()` 且 process.env 中缺少 DEEPSEEK_API_KEY
- **THEN** 函数 SHALL 抛出错误，提示缺少必要的环境变量

### 需求：配置提供合理的默认值

配置系统 SHALL 为可选配置字段提供默认值。

#### 场景：使用默认 baseURL

- **WHEN** 环境变量中未设置 DEEPSEEK_BASE_URL
- **THEN** 配置 SHALL 使用 "https://api.deepseek.com" 作为默认 baseURL

#### 场景：使用默认模型

- **WHEN** 环境变量中未设置 DEEPSEEK_MODEL
- **THEN** 配置 SHALL 使用 "deepseek-chat" 作为默认 model

#### 场景：使用默认迭代限制

- **WHEN** 未显式配置 maxIterations
- **THEN** 配置 SHALL 使用 10 作为默认 maxIterations

### 需求：配置校验必要字段

配置系统 SHALL 校验所有必要字段是否存在且有效。

#### 场景：校验 API Key 格式

- **WHEN** 提供了 DEEPSEEK_API_KEY 但为空或仅含空白字符
- **THEN** 配置 SHALL 抛出校验错误

#### 场景：校验 baseURL 格式

- **WHEN** 提供了 DEEPSEEK_BASE_URL 但不是有效的 URL
- **THEN** 配置 SHALL 抛出校验错误

### 需求：配置合并 RuntimeConfig 和 TaskConfig

Config 类型 SHALL 将 RuntimeConfig 和 TaskConfig 合并为单一对象。

#### 场景：访问运行时配置字段

- **WHEN** 创建 Config 对象
- **THEN** 对象 SHALL 提供对 systemPrompt、maxIterations、maxToolRetryTimes、maxSendRetryTimes 的访问

#### 场景：访问任务配置字段

- **WHEN** 创建 Config 对象
- **THEN** 对象 SHALL 提供对 baseURL、apiKey、model、tools、userPrompt 的访问
