# 聊天会话初始化流程优化

## Why

当前 setup.vue 在初始化系统时会自动创建一个用户与助理的会话，但用户需要手动导航到聊天页面才能开始对话。这导致用户体验不连贯，无法在初始化时立即体验 AI 对话功能。

我们需要优化初始化流程，让用户在 setup 完成后自动跳转到聊天页面，前端自动发送默认消息 "你好" 给助理，触发 AI 流，同时通过 WebSocket Transport 实现统一的实时通信架构，支持：
1. 普通用户之间的私聊
2. 用户与 AI 助理的对话
3. 群聊场景

## What Changes

### 后端变更
- 修改 `initializeSystem` 函数，在 Setup 完成时创建会话并发送 "你好" 消息给 AI 助理
- 修改 bootstrap API 返回 `{ sessionId }`
- 新增 WebSocket 路由 `/api/ws/chat` 处理实时消息
- WebSocket `send` 消息支持可选 `sessionId` 参数（无则创建会话，有则复用）

### 前端变更
- Setup 完成后直接跳转到聊天页面（从返回值获取 sessionId）
- 实现 WebSocket Transport，复用 AI SDK useChat 组件
- 聊天页面加载历史消息，显示 "你好" + AI 响应

### 流程变更
- 统一消息发送入口：通过 WebSocket 发送消息
- 所有消息统一转换为 `UIMessage` 格式
- 支持三种场景的消息发送：
  - 用户对 AI 助理对话（触发 AI 流）
  - 用户对用户私聊（实时推送）
  - 群聊消息（广播）

## Capabilities

### New Capabilities
- `websocket-chat-transport`: 基于 AI SDK ChatTransport 接口的 WebSocket 传输层，统一处理 AI 流式响应、用户消息和群聊广播
- `unified-message-sending`: 统一的消息发送能力，自动识别接收者类型（用户/AI/群组）并触发相应处理流程

### Modified Capabilities
- `session-management`: 扩展会话管理规格，支持按需创建会话（首次发消息时创建），而非预创建会话

## Impact

### 受影响的文件
- `server/utils/init.ts` - 修改 initializeSystem 函数，创建会话并发送 "你好"
- `server/api/system/bootstrap.post.ts` - 返回 sessionId
- `app/pages/setup.vue` - 修改跳转逻辑，使用返回的 sessionId
- `app/pages/chat.vue` - 加载历史消息显示
- `app/composables/useChatClient.ts` - 新增 WebSocket 聊天客户端
- `app/composables/WebSocketChatTransport.ts` - 新增 WebSocket Transport 实现
- `server/api/ws/chat.ts` - 新增 WebSocket 路由

### API 变更
- `POST /api/system/bootstrap` - 返回新增 `{ sessionId }`
- 新增 WebSocket 端点 `/api/ws/chat`
  - `send` 消息的 `sessionId` 参数可选

### 数据库影响
- 无表结构变更，复用现有表设计

### 依赖影响
- 无新增外部依赖，复用 AI SDK 的 Transport 接口
