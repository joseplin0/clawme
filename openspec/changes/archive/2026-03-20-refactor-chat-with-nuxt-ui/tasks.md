# Implementation Tasks: Refactor Chat with Nuxt UI

## 1. 依赖安装与配置

- [x] 1.1 安装 AI SDK 相关依赖： `ai @ai-sdk/vue @ai-sdk/gateway`
- [x] 1.2 安装 MDC 组件: `@nuxtjs/mdc`
- [x] 1.3 在 `nuxt.config.ts` 中注册 `@nuxtjs/mdc` 模块
- [x] 1.4 配置 MDC 禁用 anchor links（参考官方教程）

## 2. 数据库 Schema 重构

- [x] 2.1 修改 `prisma/schema.prisma`：添加 `MessageRole` enum
- [x] 2.2 重构 `ChatMessage` model：添加 `role` 和 `parts` 字段，移除旧字段
- [x] 2.3 运行 `prisma migrate dev --name refactor-chat-message`
- [x] 2.4 更新 `shared/types/clawme.ts` 类型定义以匹配新 schema
- [x] 2.5 更新 `server/utils/app-state.ts` 以适配新 schema

## 3. 服务端 API 重构

- [x] 3.1 创建 `/api/chat/session/index.post.ts`：创建新会话端点
- [x] 3.2 创建 `/api/chat/session/[id].get.ts`：获取会话及消息
- [x] 3.3 创建 `/api/chat/session/[id].post.ts`：流式聊天端点
- [x] 3.4 删除旧的 `/api/chat/stream.post.ts` 端点

## 4. 客户端 Chat 类集成

- [x] 4.1 重构 `app/pages/chat.vue`：
  - [x] 4.1.1 导入 `Chat` 类和 `DefaultChatTransport`
  - [x] 4.1.2 初始化 Chat 实例，配置 transport 和回调
  - [x] 4.1.3 移除自定义状态管理（isStreaming, chatStatus, streamDraft 等）
  - [x] 4.1.4 移除自定义 SSE 解析逻辑
- [x] 4.2 创建消息格式转换工具函数：
  - [x] 4.2.1 实现 database record → UIMessage 转换
  - [x] 4.2.2 实现 UIMessage → database record 转换

## 5. 组件优化

- [x] 5.1 重构 `app/components/chat/ChatBox.vue`：
  - [x] 5.1.1 简化 props，移除冗余的状态传递
  - [x] 5.1.2 使用 `MDC` 组件渲染消息内容
  - [x] 5.1.3 使用 `getTextFromMessage` 提取文本
  - [x] 5.1.4 使用 `isReasoningUIPart`, `isToolUIPart` 等类型守卫
- [x] 5.2 更新 `ChatPrompt` 和 `ChatPromptSubmit` 组件使用方式
- [x] 5.3 验证 `UChatMessages` 的 auto-scroll 功能正常工作

## 6. 清理与验证

- [x] 6.1 移除不再使用的类型定义（ChatUiMessage, ChatPromptStatus 等）
- [x] 6.2 移除不再使用的工具函数（parseSseBlocks, parseStreamEvent 等）
- [ ] 6.3 测试完整聊天流程：
  - [ ] 6.3.1 创建新会话
  - [ ] 6.3.2 发送消息并接收流式响应
  - [ ] 6.3.3 停止生成
  - [ ] 6.3.4 重新生成响应
- [ ] 6.4 验证 Markdown 渲染正常（代码高亮、列表、链接等）
- [ ] 6.5 验证 reasoning 内容正确显示
