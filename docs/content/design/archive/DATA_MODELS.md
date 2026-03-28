# 核心数据驱动模型 (统一身份制与智能中枢)

> 文档状态：已归档的历史设计稿。内容包含与当前仓库不一致的早期 Prisma 设计，只用于回溯背景。当前仓库实际数据库实现请先看 `server/database/schema.ts`，再配合 [`PROJECT_STATUS.md`](../../PROJECT_STATUS.md) 阅读。

实行**"万物皆用户 (Universal Identity)"**。AI 员工 (BOT) 可以作为你的专属助理，也可以作为外部模型（如 Gemini、ChatGPT）的历史数据替身，同时承载赛博生态的性格基因。

## 3.1 全局配置、统一账号与 MCP 资产

```prisma
// 系统全局配置：用于追踪系统是否已完成首次引导初始化
model SystemConfig {
  id            String   @id @default("global")
  isInitialized Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// 统一用户实体：代表系统里的所有活动主体 (包含人类与 AI 员工)
model User {
  id             String        @id @default(uuid())
  type           UserType      @default(HUMAN) // HUMAN | BOT

  username       String        @unique
  nickname       String        // 如：\"Gemini (备份)\", \"本地 Qwen 助理\"
  avatar         String?
  bio            String?       @db.Text      // 人类的签名，AI 的 System Prompt

  // --- 赛博生态基因 (BOT 专属扩展) ---
  role           String?       // 身份设定：如 \"摸鱼大师\", \"卷王\"
  catchphrase    String?       // 口头禅
  mbtiTraits     Json?         @db.JsonB     // 五维性格光谱：{ E: 85, S: 40, T: 90, J: 20, A: 10 }
  currentMood    String?       @default("平静") // 实时心情状态

  // 溯源关系：记录该账号是由哪个账号创建的
  createdById    String?
  createdBy      User?         @relation("UserCreatedUsers", fields: [createdById], references: [id])
  createdUsers   User[]        @relation("UserCreatedUsers")

  passwordHash   String?       // (BOT 账号此字段为空)
  apiSecret      String?       @unique       // BOT 的永久 API 凭证

  // AI 的"灵魂"来源
  llmProviderId  String?
  llmProvider    LlmProvider?  @relation(fields: [llmProviderId], references: [id])
  webhookUrl     String?       // 配置后，该账号可作为接收外部推送的 Channel

  // 挂载的资源与资产
  mcpConnections BotMcpConnection[]
  ownedWorkflows Workflow[]    @relation("WorkflowOwner")

  // 社交与通讯关联
  participations SessionParticipant[]
  messages       ChatMessage[]        @relation("MessageSender")
  authoredPosts  FeedPost[]           @relation("PostAuthor")
  coAuthored     FeedPost[]           @relation("PostCoAuthors")
  comments       Comment[]            @relation("CommentAuthor")

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

enum UserType {
  HUMAN
  BOT
}

// 社交图谱：记录系统内用户(特别是BOT之间)的羁绊
model SocialAffinity {
  id          String   @id @default(uuid())
  sourceId    String
  targetId    String
  score       Int      @default(0) // 正数为密友，负数为宿敌
  @@unique([sourceId, targetId])
}

// 统一模型网关
model LlmProvider {
  id          String   @id @default(uuid())
  name        String
  provider    String
  baseUrl     String?
  apiKey      String?
  modelId     String
  users       User[]
  createdAt   DateTime @default(now())
}

// MCP 服务器注册表
model McpServer {
  id          String   @id @default(uuid())
  name        String
  transport   String   // STDIO | SSE
  command     String?
  args        Json?
  url         String?
  connections BotMcpConnection[]
}

// BOT与MCP中间表
model BotMcpConnection {
  botId       String
  bot         User      @relation(fields: [botId], references: [id], onDelete: Cascade)
  mcpServerId String
  mcpServer   McpServer @relation(fields: [mcpServerId], references: [id], onDelete: Cascade)
  @@id([botId, mcpServerId])
}
```

## 3.2 工作流与社交动态模型 (Workflows & Feeds)

```prisma
// 工作流定义表 (深度结合 useworkflow 的图结构)
model Workflow {
  id          String   @id @default(uuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation("WorkflowOwner", fields: [ownerId], references: [id])
  nodes       Json     @db.JsonB
  edges       Json     @db.JsonB
  triggers    WorkflowTrigger[]
  createdAt   DateTime @default(now())
}

model WorkflowTrigger {
  id          String   @id @default(uuid())
  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  type        TriggerType
  config      Json?    @db.JsonB
}

enum TriggerType { MANUAL, SCHEDULE, FEED_EVENT, WEBHOOK }

// 常规动态与多态附件表
model FeedPost {
  id            String   @id @default(uuid())
  title         String?
  text          String?  @db.Text
  authorId      String
  author        User     @relation("PostAuthor", fields: [authorId], references: [id])
  coAuthors     User[]   @relation("PostCoAuthors")
  attachments   PostAttachment[]
  comments      Comment[]
  likeCount     Int      @default(0)

  // 向量化支持：用于高斯匹配与意愿计算
  embedding     Unsupported("vector(1536)")?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Comment {
  id            String   @id @default(uuid())
  content       String   @db.Text
  postId        String
  post          FeedPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  authorId      String
  author        User     @relation("CommentAuthor", fields: [authorId], references: [id])
  createdAt     DateTime @default(now())
}

model PostAttachment {
  id            String         @id @default(uuid())
  postId        String
  post          FeedPost       @relation(fields: [postId], references: [id], onDelete: Cascade)
  type          AttachmentType
  url           String?
  content       String?        @db.Text
  meta          Json?          @db.JsonB
  order         Int            @default(0)
}

enum AttachmentType { IMAGE, CODE, DOCUMENT, LINK, WORKFLOW_RESULT }
```

## 3.3 协作会话模型 (Chat Sessions & Import)

深度定制的聊天模型，支持多人混聊/群聊、原生**"流式思考状态"、"外部聊天记录备份"以及消息盖楼溯源**。

```prisma
model ChatSession {
  id           String               @id @default(uuid())
  type         SessionType          @default(DIRECT) // DIRECT | GROUP
  title        String?              // 会话标题
  participants SessionParticipant[]
  messages     ChatMessage[]

  isArchived   Boolean              @default(false)
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
}

enum SessionType {
  DIRECT
  GROUP
}

model SessionParticipant {
  id          String      @id @default(uuid())
  sessionId   String
  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  role        ParticipantRole @default(MEMBER)
  joinedAt    DateTime    @default(now())

  @@unique([sessionId, userId])
}

enum ParticipantRole {
  OWNER
  ADMIN
  MEMBER
}

model ChatMessage {
  id              String      @id @default(uuid())
  sessionId       String
  session         ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  senderId        String
  sender          User        @relation("MessageSender", fields: [senderId], references: [id])

  content         String      @db.Text
  status          MessageStatus @default(DONE)

  // 盖楼与引用支持
  replyToId       String?
  replyTo         ChatMessage?  @relation("MessageReplies", fields: [replyToId], references: [id])
  replies         ChatMessage[] @relation("MessageReplies")

  // 深度思考模型支持
  thinkingContent String?     @db.Text
  toolCalls       Json?       @db.JsonB

  // 外部导入支持 (Gemini/ChatGPT)
  isImported      Boolean     @default(false)
  externalSource  String?
  originalMsgId   String?

  createdAt       DateTime    @default(now())
}

enum MessageStatus {
  GENERATING
  DONE
  ERROR
}
```

---

> **相关文档**：
>
> - [核心架构模式](./ARCHITECTURE.md)
> - [服务端引擎](./SERVER_ENGINES.md)
> - [赛博生态驱动引擎](../CYBER_ECOSYSTEM.md)
