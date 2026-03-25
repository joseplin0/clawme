# Spec: Unified Message Sending

统一的消息发送能力，通过 WebSocket Transport 实现实时通信，自动识别接收者类型（用户/AI/群组）并触发相应处理流程。

## ADDED Requirements

### Requirement: WebSocket 消息发送

系统 SHALL 通过 WebSocket 进行所有消息的发送和接收，统一使用 `UIMessage` 格式。

#### Scenario: 通过 WebSocket 发送消息
- **WHEN** 客户端通过 WebSocket 发送 `{ type: 'send', sessionId, content }`
- **THEN** 系统存储消息
- **AND** 根据会话类型路由处理

#### Scenario: 接收 AI 流式响应
- **WHEN** 消息发送给 AI 助理
- **THEN** 系统返回 `stream-chunk` 类型的消息
- **AND** 每个 chunk 包含 `UIMessageChunk` 数据
- **AND** 流结束后发送 `type: 'finish'`

#### Scenario: 接收其他用户消息
- **WHEN** 其他用户发送消息给当前用户
- **THEN** 系统推送 `{ type: 'message', chatId, message }` 到当前用户的 WebSocket 连接

### Requirement: 自动识别接收者类型

系统 SHALL 自动识别消息接收者的类型并路由到相应的处理流程。

#### Scenario: 接收者是 AI 助理
- **WHEN** 用户发送消息给 AI 助理用户（type = 'BOT'）
- **THEN** 系统触发 AI 流式响应
- **AND** 通过 WebSocket 流式返回 AI 生成的内容

#### Scenario: 接收者是普通用户
- **WHEN** 用户发送消息给另一个普通用户（type = 'HUMAN'）
- **THEN** 系统存储消息
- **AND** 通过 WebSocket 推送给目标用户

#### Scenario: 接收者是群组
- **WHEN** 用户发送消息到群组会话（type = 'GROUP'）
- **THEN** 系统存储消息
- **AND** 通过 WebSocket 广播给所有群组成员

### Requirement: Setup 初始化时后端自动发送消息

系统 SHALL 在 Setup 完成时由后端自动创建会话并发送 "你好" 消息给 AI 助理。

#### Scenario: Setup 完成时后端自动发送消息
- **WHEN** 用户在 setup 页面完成所有配置步骤
- **AND** 调用 `POST /api/system/bootstrap`
- **THEN** 系统完成初始化配置
- **AND** 后端创建用户与 AI 助理的会话
- **AND** 后端存储 "你好" 消息
- **AND** 后端调用 LLM 生成 AI 响应
- **AND** 后端存储 AI 响应
- **AND** 返回 `{ sessionId }`
- **AND** 前端跳转到聊天页面显示对话

#### Scenario: Setup 接口参数不变
- **WHEN** 调用 `POST /api/system/bootstrap`
- **THEN** 请求参数保持原有格式 `{ admin, assistant, gateway }`
- **AND** 返回新增 `{ sessionId }` 字段

### Requirement: 按需创建会话

系统 SHALL 支持按需创建会话，即首次发消息时才创建会话，而非预创建。

#### Scenario: 首次发消息时创建会话
- **WHEN** 用户 A 向用户 B 发送第一条消息
- **AND** 两者之间不存在会话
- **THEN** 系统自动创建新的 DIRECT 会话
- **AND** 添加 A 和 B 为参与者
- **AND** 存储消息

#### Scenario: 已有会话时复用
- **WHEN** 用户 A 向用户 B 发送消息
- **AND** 两者之间已存在会话
- **THEN** 系统复用现有会话
- **AND** 存储消息到现有会话

### Requirement: WebSocket 消息协议

系统 SHALL 使用以下 WebSocket 消息格式：

```typescript
// 客户端 → 服务端
type ClientWSMessage =
  | { type: 'send'; sessionId?: string; targetUserId?: string; content: string }
  // sessionId 有: 发送到现有会话
  // sessionId 无: 创建新会话 (需要 targetUserId)，然后发送消息
  | { type: 'typing'; sessionId: string }
  | { type: 'read'; sessionId: string; messageId: string };

// 服务端 → 客户端
type ServerWSMessage =
  | { type: 'stream-chunk'; chatId: string; chunk: UIMessageChunk; sessionId?: string }
  | { type: 'message'; chatId: string; message: UIMessage; sessionId?: string }
  // sessionId 在新创建会话时返回
  | { type: 'typing'; chatId: string; userId: string }
  | { type: 'error'; code: string; message: string };
```

#### Scenario: 消息格式验证
- **WHEN** 客户端发送 WebSocket 消息
- **THEN** 系统验证消息格式是否符合协议
- **AND** 无效格式返回 `{ type: 'error', code: 'INVALID_FORMAT' }`

#### Scenario: 无 sessionId 时创建新会话
- **WHEN** 客户端发送 `{ type: 'send', targetUserId: 'xxx', content: '你好' }`
- **AND** 没有提供 sessionId
- **THEN** 系统创建新会话
- **AND** 发送消息到新会话
- **AND** 返回的消息包含新创建的 sessionId

#### Scenario: 有 sessionId 时复用现有会话
- **WHEN** 客户端发送 `{ type: 'send', sessionId: 'xxx', content: '你好' }`
- **THEN** 系统使用现有会话
- **AND** 发送消息到该会话

### Requirement: WebSocket Transport 前端实现

系统 SHALL 提供 `WebSocketChatTransport` 类实现 AI SDK 的 `ChatTransport` 接口。

#### Scenario: Transport 连接管理
- **WHEN** 前端创建 `WebSocketChatTransport` 实例
- **THEN** 建立 WebSocket 连接
- **AND** 支持断线自动重连

#### Scenario: Transport 发送消息
- **WHEN** 调用 `transport.sendMessages({ chatId, messages })`
- **THEN** 通过 WebSocket 发送消息
- **AND** 返回 `ReadableStream<UIMessageChunk>`

#### Scenario: Transport 接收推送消息
- **WHEN** 其他用户发送消息给当前用户
- **AND** 调用 `transport.onIncomingMessage(callback)`
- **THEN** callback 被调用，参数为 `(chatId, message)`
