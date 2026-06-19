## ADDED Requirements

### Requirement: 测试框架
Server 包 SHALL 使用 vitest 作为单元测试框架，配合 supertest 进行 HTTP 接口测试。

#### Scenario: 运行测试
- **WHEN** 执行 `pnpm test` 在 server 包目录下
- **THEN** vitest 运行所有 `*.test.ts` 文件并输出测试结果

### Requirement: Service 层单元测试
每个 service 方法 SHALL 有对应的单元测试，mock 掉外部依赖（runtime、sessionManager 等），验证业务逻辑正确性。

#### Scenario: Service 测试覆盖
- **WHEN** 查看 `src/service/` 目录
- **THEN** 每个 service 文件有对应的 `.test.ts` 文件，覆盖所有导出方法

#### Scenario: Service 测试隔离
- **WHEN** 运行 `session.service.test.ts`
- **THEN** runtime 和 sessionManager 依赖被 mock，测试不依赖真实文件系统或 LLM 调用

### Requirement: Controller 层单元测试
每个 controller 处理函数 SHALL 有对应的单元测试，使用 supertest + 真实 Express app 实例，mock service 层，验证 HTTP 请求/响应行为。

#### Scenario: Controller 测试覆盖
- **WHEN** 查看 `src/controller/` 目录
- **THEN** 每个 controller 文件有对应的 `.test.ts` 文件，覆盖所有导出的处理函数

#### Scenario: Controller 测试隔离
- **WHEN** 运行 `session.controller.test.ts`
- **THEN** service 层被 mock，测试验证 HTTP 状态码、响应格式、参数提取逻辑

### Requirement: 测试文件位置
测试文件 SHALL 与源文件同目录，命名为 `<name>.test.ts`。

#### Scenario: 测试文件命名
- **WHEN** 查看 `src/service/session.service.ts`
- **THEN** 同目录下存在 `session.service.test.ts`

### Requirement: 测试作为接口文档
测试用例 SHALL 覆盖正常路径和错误路径，描述清晰，可作为接口行为文档阅读。

#### Scenario: 测试描述可读性
- **WHEN** 查看测试文件的 `describe` 和 `it` 描述
- **THEN** 描述清晰表达"当...时，应该..."的语义，可独立作为接口行为参考
