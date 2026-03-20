# Proposal: Refactor Chat with Nuxt UI

## Why

当前的聊天实现使用自定义的 SSE 流式处理逻辑，代码复杂且与 AI SDK 生态不兼容。通过采用 Nuxt UI 官方推荐的 AI SDK 集成方案，可以：
- 简化代码，减少维护负担
- 获得 streaming、reasoning、tool calling 的开箱支持
- 与 Nuxt UI Chat 组件深度集成，提供更好的用户体验
- 参考官方最佳实践，确保代码质量和可扩展性

## What Changes

### 服务端重构
- **BREAKING** 重构 `/api/chat/stream` 端点，使用 AI SDK 的 `streamText` 和 `createUIMessageStreamResponse`
- 使用 `convertToModelMessages` 转换消息格式
- 支持 AI Gateway 多模型切换（可选）

### 客户端重构
- 使用 `@ai-sdk/vue` 的 `Chat` 类替代自定义状态管理
- 使用 `DefaultChatTransport` 处理流式传输
- 使用 `getTextFromMessage` 工具函数提取消息文本
- 使用 `MDC` 组件渲染 Markdown 内容

### 消息格式迁移
- 从自定义 `ChatUiMessage` 迁移到 AI SDK 的 `UIMessage` 类型
- 支持 `parts` 结构（text、reasoning、tool 等类型）
- 保持与现有数据库 schema 的兼容性

### 组件优化
- 简化 `ChatBox.vue`，移除冗余的 props 和状态管理
- 保持 `ChatList.vue` 会话列表功能不变
- 利用 Nuxt UI Chat 组件的内置功能（auto-scroll、loading indicator 等）

## Capabilities

### New Capabilities

- `ai-sdk-integration`: AI SDK 集成能力，包括 Chat 类、DefaultChatTransport、消息流处理
- `markdown-rendering`: 使用 MDC 组件的 Markdown 渲染能力

### Modified Capabilities

- `chat-streaming`: 流式聊天处理能力，从自定义 SSE 迁移到 AI SDK 标准流

## Impact

### 依赖变更
- 需要安装 `ai @ai-sdk/vue @ai-sdk/gateway` 包
- 需要安装 `@nuxtjs/mdc` 用于 Markdown 渲染

### 文件变更
- `app/pages/chat.vue` - 重构为使用 Chat 类
- `app/components/chat/ChatBox.vue` - 简化，移除手动状态管理
- `server/api/chat/stream.post.ts` - 使用 AI SDK streamText

### API 变更
- 流式 API 响应格式将遵循 AI SDK 标准
- 消息结构使用 `UIMessage` 类型

### 风险
- 需要确保现有数据库中的消息可以正确映射到 `UIMessage` 格式
- 需要测试 reasoning 内容的兼容性
