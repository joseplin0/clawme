# Design: Refactor Chat with Nuxt UI

## Context

当前项目使用 Prisma + PostgreSQL 作为数据库，聊天消息存储在 `ChatMessage` 表中。现有的消息结构使用 `content` (文本内容) 和 `thinkingContent` (思考内容) 两个字段分离存储。

AI SDK 的 `UIMessage` 类型使用 `parts` 数组来存储消息的各个部分，每个 part 可以是 `text`、`reasoning`、`tool` 等类型。为了与 AI SDK 深度集成，需要直接重构数据库结构以适配这种格式。

### 当前 ChatMessage 结构

```prisma
model ChatMessage {
  id              String
  sessionId       String
  senderId        String
  content         String          // 主文本内容
  status          MessageStatus
  replyToId       String?
  thinkingContent String?         // 思考内容（单独字段）
  toolCalls       Json?           // 工具调用（未使用）
  isImported      Boolean
  externalSource  String?
  originalMsgId   String?
  createdAt       DateTime
}
```

### AI SDK UIMessage 结构

```typescript
interface UIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: Array<
    | { type: 'text'; text: string }
    | { type: 'reasoning'; text: string }
    | { type: 'tool-call'; ... }
    | { type: 'tool-result'; ... }
  >;
  createdAt?: Date;
}
```

## Goals / Non-Goals

**Goals:**
- 将 `content` + `thinkingContent` 迁移到统一的 `parts` JSON 字段
- 保持向后兼容，现有数据能正确迁移
- 支持 AI SDK 的完整消息类型（text、reasoning、tool-call、tool-result）
- 简化客户端代码，直接使用 `Chat` 类管理状态

**Non-Goals:**
- 不修改 ChatSession 表结构
- 不修改用户认证逻辑
- 不实现多模型切换（后续迭代）
- 不实现 MCP 工具调用（后续迭代）

## Decisions

### 1. 数据库 Schema 重构

**决策**: 直接重构 ChatMessage 表，采用 AI SDK 兼容的结构

**新方案**:
```prisma
model ChatMessage {
  id        String        @id @default(uuid())
  sessionId String
  session   ChatSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      MessageRole   @default(USER)
  parts     Json          // AI SDK 兼容的 parts 数组
  status    MessageStatus @default(DONE)
  createdAt DateTime      @default(now())

  @@index([sessionId])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

**变更说明**:
- **移除** `senderId`: 使用 `role` 字段替代，直接映射 AI SDK 的消息角色
- **移除** `content` 和 `thinkingContent`: 统一到 `parts` JSON 字段
- **移除** `replyToId`, `replies`: 暂不支持回复功能（可后续添加）
- **移除** `toolCalls`: 工具调用通过 `parts` 中的 `tool-call` 类型存储
- **移除** `isImported`, `externalSource`, `originalMsgId`: 暂不需要导入功能
- **移除** `updatedAt`: 消息创建后不修改

**理由**:
- 精简表结构，只保留必要字段
- `parts` JSON 字段提供最大灵活性，支持 AI SDK 的所有消息类型
- `role` 枚举清晰区分消息来源

**替代方案考虑**:
- ❌ 创建单独的 `MessagePart` 表：查询复杂，需要 JOIN，性能差
- ❌ 保留旧字段做兼容：增加代码复杂度，不符合直接重构的目标

### 3. API 端点设计

**决策**: 重构现有 `/api/chat/stream` 以符合 AI SDK 规范

**新端点结构**:
```
POST /api/chat/session           # 创建新会话
GET  /api/chat/session/:id       # 获取会话及消息
POST /api/chat/session/:id       # 发送消息，返回流式响应
```

**请求/响应格式**:
```typescript
// POST /api/chat/session/:id
interface ChatRequest {
  model?: string;           // 可选，默认使用用户配置的模型
  messages: UIMessage[];    // 完整消息历史
}

// 响应: AI SDK UIMessageStreamResponse
```

### 4. 客户端架构

**决策**: 使用 `@ai-sdk/vue` 的 `Chat` 类管理状态

**组件结构**:
```
app/pages/chat.vue              # 主页面，初始化 Chat 实例
app/components/chat/ChatBox.vue # 消息列表 + 输入框
app/components/chat/ChatList.vue # 会话列表（保持不变）
```

**Chat 类初始化**:
```typescript
const chat = new Chat({
  id: sessionId,
  messages: convertedMessages,  // 从 UIMessage[] 转换
  transport: new DefaultChatTransport({
    api: `/api/chat/session/${sessionId}`,
  }),
  onError(error) {
    toast.add({ title: 'Error', description: error.message });
  },
});
```

## Risks / Trade-offs

### 风险 1: 现有聊天数据将丢失
- **影响**: 重构后现有聊天记录无法保留
- **接受**: 用户明确接受直接重构，不需要数据迁移

### 风险 2: JSON 字段查询性能
- **影响**: `parts` 是 JSON 字段，无法建立索引
- **缓解**:
  - 消息查询主要按 sessionId 和时间排序，不需要 JSON 内部查询
  - 如需搜索消息内容，考虑使用 PostgreSQL 的 JSONB 查询能力或全文搜索

### 风险 3: AI SDK 版本兼容性
- **影响**: AI SDK 更新可能导致 breaking changes
- **缓解**:
  - 锁定 AI SDK 版本
  - 关注 AI SDK 更新日志

## Implementation Plan

### Phase 1: Schema 重构
1. 修改 `prisma/schema.prisma`
2. 运行 `prisma migrate dev --name refactor-chat-message`
3. 更新 `shared/types/clawme.ts` 类型定义

### Phase 2: 服务端重构
1. 重构 `/api/chat/session` 端点
2. 使用 AI SDK 的 `streamText` 和 `createUIMessageStreamResponse`
3. 实现消息的 CRUD 操作

### Phase 3: 客户端重构
1. 安装 `ai @ai-sdk/vue @ai-sdk/gateway @nuxtjs/mdc`
2. 更新 `chat.vue` 使用 `Chat` 类
3. 简化 `ChatBox.vue` 组件
4. 使用 `MDC` 渲染 Markdown

### Phase 4: 清理
1. 移除不再使用的代码和类型
2. 更新相关组件

## Open Questions

1. **是否需要支持 `system` 角色的消息？**
   - 当前设计中 `role` enum 包含 SYSTEM
   - 可用于存储系统提示词，但暂不强制使用

2. **是否需要持久化工具调用结果？**
   - `tool-call` 和 `tool-result` 类型通过 `parts` JSON 存储
   - 满足当前需求，后续如有复杂查询需求再优化

3. **会话标题生成策略？**
   - 官方教程使用 `generateText` 根据第一条消息生成标题
   - 可采用此方案提升用户体验
