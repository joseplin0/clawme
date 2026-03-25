# 实现任务清单

## 1. Setup 初始化优化 (第一阶段)

- [ ] 1.1 修改 `initializeSystem` 函数，创建会话并发送 "你好" 消息给 AI 助理
- [ ] 1.2 修改 `POST /api/system/bootstrap` 返回 `{ sessionId }`

## 2. WebSocket 服务端 (第二阶段)

- [ ] 2.1 创建 WebSocket 路由 `/api/ws/chat`
- [ ] 2.2 实现用户连接认证（从 session 获取用户 ID）
- [ ] 2.3 实现用户订阅机制（`user:{userId}` 频道）
- [ ] 2.4 实现消息类型路由（send, typing, read）
- [ ] 2.5 实现 sessionId 可选逻辑：无则创建会话，有则复用
- [ ] 2.6 实现 AI 流式响应推送（使用 `toUIMessageStream()`）
- [ ] 2.7 实现用户间消息转发（私聊场景）
- [ ] 2.8 实现群聊消息广播
- [ ] 2.9 添加心跳机制和断线处理

## 3. WebSocket Transport 前端 (第二阶段)

- [ ] 3.1 创建 `WebSocketChatTransport` 类，实现 `ChatTransport` 接口
- [ ] 3.2 实现 WebSocket 连接管理（connect, close, reconnect）
- [ ] 3.3 实现 `sendMessages` 方法，返回 `ReadableStream<UIMessageChunk>`
- [ ] 3.4 实现消息处理（stream-chunk, message, typing, error）
- [ ] 3.5 实现 `onIncomingMessage` 回调机制
- [ ] 3.6 添加断线重连逻辑（指数退避）

## 4. 前端集成 (第三阶段)

- [ ] 4.1 创建 `useChatClient` composable
- [ ] 4.2 配置 WebSocket URL（从 runtimeConfig 获取）
- [ ] 4.3 修改聊天页面使用 WebSocket Transport
- [ ] 4.4 实现新消息通知处理

## 5. 测试与验证

- [ ] 5.1 测试 Setup 完成后自动创建会话并发送 "你好" 触发 AI 流
- [ ] 5.2 测试 WebSocket 无 sessionId 时创建新会话
- [ ] 5.3 测试 WebSocket 有 sessionId 时复用现有会话
- [ ] 5.4 测试两个普通用户之间创建会话并发送消息
- [ ] 5.5 测试 WebSocket 断线重连
- [ ] 5.6 验证流式响应在聊天页面的正确显示
- [ ] 5.7 测试多用户同时在线的消息推送

## 6. 功能增强 (第四阶段 - 可选)

- [ ] 6.1 添加正在输入指示器
- [ ] 6.2 添加消息已读状态
- [ ] 6.3 优化断线重连的用户提示
- [ ] 6.4 添加 WebSocket 连接状态显示

## 7. 文档更新

- [ ] 7.1 添加 WebSocket 消息协议文档
- [ ] 7.2 更新 CLAUDE.md 中的项目说明（如有必要）
