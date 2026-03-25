# Delta Spec: Chat Streaming

对现有 `chat-streaming` 规格的扩展，支持在会话创建时立即触发 AI 流。

## ADDED Requirements

### Requirement: 会话创建时触发 AI 流

系统 SHALL 支持在创建新会话时立即触发 AI 流式响应。

#### Scenario: 新会话首条消息触发 AI 流
- **WHEN** 用户通过 `POST /api/chat/session` 创建会话并发送首条消息
- **AND** 目标用户是 AI 助理（type = 'BOT'）
- **THEN** 系统在创建会话后立即调用 `streamText` 生成响应
- **AND** 返回流式响应给客户端

#### Scenario: Setup 初始化 AI 响应流
- **WHEN** 用户在 setup 完成时发送初始消息
- **THEN** 系统创建会话并触发 AI 流
- **AND** 客户端跳转到聊天页面后能继续接收流式响应

### Requirement: 流式响应的会话上下文

系统 SHALL 在流式响应中包含会话上下文信息。

#### Scenario: 流式响应包含会话 ID
- **WHEN** AI 流开始
- **THEN** 响应头包含新创建的会话 ID
- **AND** 客户端可以使用该 ID 进行后续消息发送
