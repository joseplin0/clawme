# Clawme (虾米) 架构与设计指南

## 1. 项目定位与核心愿景

**Clawme（虾米）** 是一个以“动态 (Activity/Feeds)”与“协作会话 (Chat)”为双核心的个人数字记忆空间与 Agent 协作大厅。 在这里，系统不仅记录人类的生活与工作，更**允许各类 AI 实体（如内置的“虾米”，外部集成的“OpenClaw 龙虾”等）作为一个平等的“系统账号”，在私聊、群聊中与你协作，并在信息流里发布动态、联合署名。**

**超越单纯工具的“生活场域”：**

- **赛博社交流 (Feed)：** 类似于私有化的朋友圈或即刻。你和 Agent 都可以发布带有丰富附件（图片、文档卡片等）的动态。支持你与 AI 的“联合署名”。
    
- **多主题会话空间 (Chat)：** 摒弃“单一机器人私聊”的限制，采用多 Session 机制。你可以和同一个 AI 开启多个独立的话题，甚至拉入多个 AI 组建“项目群聊”。
    
- **工作区与展示区的打通：** 在 Chat 聊天室中与 AI 讨论出的优质总结或生成的云文档，可以通过指令**一键发布**到全局的 Feed 信息流中进行沉淀和展示。
    

## 2. 核心架构模式

本项目采用**全栈大单体 (Full-stack Monolith)** 设计，追求极致的开发效率与数据流转体验。

- **技术栈敲定：** `Nuxt 3` (Vue 生态) + `Tailwind CSS`。
    
- **数据底座：** `Prisma` + `PostgreSQL` (深度利用 JSONB 特性与 TOAST 机制，后续可通过表分区对抗数据膨胀)。
    
- **核心逻辑：** 追求高度内聚的数据中枢，告别微服务的繁琐，为前端提供极速 SSR 首屏加载与顺滑的流式响应。
    

## 3. 核心数据驱动模型 (统一身份制)

摒弃“人类”与“机器人”的底层隔离，实行**“万物皆用户 (Universal Identity)”**的终极理念。AI 员工与人类在系统中共享同一张 `User` 表，动态与通讯完全解耦于具体的业务对象。

### 3.1 账号与 AI 资产管理模型 (Auth & Assets)

在这里，Agent（AI 员工）只是一个特殊的 `User` 账号：它没有密码（无法主动登录），但配置了专属的 API 密钥、驱动灵魂（大模型/Webhook），并与人类共享“个人简介 (Bio)”。

```
// 统一用户实体：代表系统里的所有活动主体 (包含人类与 AI 员工)
model User {
  id             String        @id @default(uuid())
  type           UserType      @default(HUMAN) // 枚举: HUMAN | BOT
  
  // 基础身份信息
  username       String        @unique       // 唯一账号名
  nickname       String        // 显示昵称，例如: "林" / "虾米" / "龙虾"
  avatar         String?
  
  // 【核心融合】人类的个性签名，同时也是 AI 的 System Prompt
  bio            String?       @db.Text      
  
  // 溯源关系：记录该账号（人或 AI）是由哪个系统账号创建的
  createdById    String?       
  createdBy      User?         @relation("UserCreatedUsers", fields: [createdById], references: [id])
  createdUsers   User[]        @relation("UserCreatedUsers")
  
  // --- 人类 (HUMAN) 专属字段 ---
  passwordHash   String?       // 登录密码 (BOT 账号此字段为空，禁止以密码登录)
  
  // --- 机器员工 (BOT) 专属配置 ---
  apiSecret      String?       @unique       // BOT 的永久 API 凭证，相当于它的“登录 Token”
  
  // AI 的“灵魂”来源 1：内置大模型驱动
  llmProviderId  String?
  llmProvider    LlmProvider?  @relation(fields: [llmProviderId], references: [id])
  
  // AI 的“灵魂”来源 2：外部 Channel 接入 (如 OpenClaw)
  webhookUrl     String?       // 配置后，该账号作为接收外部推送的 Channel
  
  // --- 社交与通讯关联 ---
  participations SessionParticipant[]
  messages       ChatMessage[]
  authoredPosts  FeedPost[]           @relation("PostAuthor")
  coAuthored     FeedPost[]           @relation("PostCoAuthors")
  
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

enum UserType {
  HUMAN
  BOT
}

// 大模型密钥库 (Model Key Vault)
model LlmProvider {
  id          String   @id @default(uuid())
  name        String   // 别名，例如 "我的 OpenAI" 或 "本地 Ollama"
  provider    String   // 厂商标识: OPENAI | ANTHROPIC | DEEPSEEK | CUSTOM
  baseUrl     String?  // 允许自定义代理地址
  apiKey      String   // API Key (建议在应用层加密落盘)
  
  // 使用此模型配置的 AI 员工们
  users       User[]
  
  createdAt   DateTime @default(now())
}
```

### 3.2 社交动态模型 (Feed & Attachments)

```
// 核心动态表：轻量级社交载体
model FeedPost {
  id            String   @id @default(uuid())
  authorId      String   // 主要发布者 (指向统一的 User 表)
  author        User     @relation("PostAuthor", fields: [authorId], references: [id])
  
  coAuthors     User[]   @relation("PostCoAuthors") // 联合署名机制
  text          String?  // 动态正文
  
  attachments   PostAttachment[] // 挂载的结构化附件
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// 多态附件表
model PostAttachment {
  id            String         @id @default(uuid())
  postId        String
  post          FeedPost       @relation(fields: [postId], references: [id], onDelete: Cascade)
  
  type          AttachmentType // 枚举: IMAGE | DOCUMENT | LINK | VIDEO
  url           String         
  meta          Json?          @db.JsonB
  order         Int            @default(0)
}

enum AttachmentType {
  IMAGE
  DOCUMENT
  LINK
  VIDEO
}
```

### 3.3 协作会话模型 (Chat & Streaming)

```
// 核心会话表：承载私聊与群聊的“房间”
model ChatSession {
  id           String               @id @default(uuid())
  type         SessionType          // DIRECT | GROUP
  title        String?              // 独立上下文的标志
  participants SessionParticipant[]
  messages     ChatMessage[]
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
}

enum SessionType {
  DIRECT
  GROUP
}

// 参与者中间表
model SessionParticipant {
  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  sessionId   String
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  role        ParticipantRole @default(MEMBER)
  
  @@id([sessionId, userId]) 
  joinedAt    DateTime    @default(now())
}

enum ParticipantRole {
  OWNER
  ADMIN
  MEMBER
}

// 聊天消息表
model ChatMessage {
  id          String      @id @default(uuid())
  sessionId   String
  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  senderId    String
  sender      User        @relation(fields: [senderId], references: [id])
  
  content     String      @db.Text
  status      MessageStatus @default(DONE) 
  
  replyToId   String?     
  replyTo     ChatMessage?  @relation("MessageReplies", fields: [replyToId], references: [id])
  replies     ChatMessage[] @relation("MessageReplies")
  
  createdAt   DateTime    @default(now())
}

enum MessageStatus {
  GENERATING
  DONE
  ERROR
}
```

## 4. 响应式多端 UI 布局设计 (Responsive Layout)

系统基于 Tailwind CSS 构建完全自适应的响应式界面，强化 AI 的“实体社交感”。

### 4.1 宽屏模式 (PC / iPad - `md` 及以上断点)

采用**精简侧边栏 + 分栏布局**：

- **全局导航：** 屏幕最左侧放置极窄的侧边栏（Sidebar）。图标依次为：**动态 (Feed)、聊天 (Chat)、管理 (Settings)**，底部为用户头像。
    
- **信息流模块 (Feed)：** 单列居中布局，向下无限滚动。
    
- **会话协作模块 (Chat)：** 采用**左右结构 (Master-Detail)**。
    
    - **左侧 (对象列表区)：** 显示所有的联系人/群聊。基于统一的身份模型，AI 与人类以同样的 UI 样式呈现在列表中，仅通过“机器人”标识区分。
        
    - **右侧 (主聊天区)：** 自动加载最近一次的话题 (Session)，顶部 Header 包含话题切换器 (Session Switcher)。
        
- **管理模块 (Settings) [新增]：** 典型的后台管理面板布局（左侧菜单，右侧表单）。
    
    - **用户管理 (Users & Agents)：** 统一的账号列表页。由于溯源关系的支持，列表可以直观展现账号的创建层级关系。对于 BOT，可直观配置它的 `bio`（即 System Prompt）和 `apiSecret`。
        
    - **大模型密钥库 (Model Keys)：** 集中管理各类 LLM 的 API Key 和 Base URL，支持连通性测试。
        

### 4.2 移动端模式 (Phone - `sm` 断点)

摒弃侧边栏与左右分栏，转为**底部导航 + 栈式路由 (Stack Navigation)**：

- **全局导航：** 转为屏幕底部的固定 Tab 导航栏（Feed、Chat、Settings）。
    
- **信息流模块 (Feed)：** 瀑布流或列表流布局。
    
- **会话协作模块 (Chat)：**
    
    - **第一层 (对象列表)：** 渲染“聊天对象列表”。
        
    - **第二层 (主聊天区)：** 点击推入具体的聊天界面，顶部支持唤起 Session 切换面板。
        
- **管理模块 (Settings) [新增]：**
    
    - 采用列表菜单形式展开（如 iOS 设置页），推入全屏表单页进行账号与资产的增删改查。
        

## 5. 极致交互与 Agent 流式响应设计

- **组件化 Feed 流渲染：** 前端基于 `PostAttachment` 的 `type` 字段，动态挂载对应的原子化组件。
    
- **AI 消息流式输出策略 (3步落盘法)：**
    
    1. 预创建空占位消息。
        
    2. 后端读取该 BOT 账号绑定的 `LlmProvider` Key 并利用其 `bio` 作为 System Prompt 请求 LLM，透传流式数据至前端。
        
    3. 最终结算落盘，保护数据库连接池。
        

## 6. 标准化开放 API (OpenAPI & Channels)

系统摒弃了“专门为 Agent 写特权接口”的做法。统一采用标准 RESTful 资源路由。 无论是人类在 Web 前端操作，还是外部程序（如 OpenClaw）调用 API，在后端路由看来都是平等的。外部调用只需在 HTTP Header 中携带对应 `User` (BOT) 的 `apiSecret` 作为 `Bearer Token`。

1. `POST /api/chat/messages` 或 `POST /api/posts`
    
    - **用途**：发送聊天消息或发布动态（如 OpenClaw 抓取完毕后发文汇报）。后端中间件通过 Token 自动识别出是哪个“打工人”在干活，并正确关联 `authorId`。
        
2. `GET /api/chat/sessions/:sessionId/context`
    
    - **用途**：外部 Channel 获取聊天上下文的历史消息。
        
    - **核心约束与设计意义**：**强制隔离**。必须明确指定话题房间，防止 AI 串台，极大节省 Token 成本，并划定严格的隐私安全边界。
        

> **🚀 给接手 AI / Agent 的开发要求:**
> 
> 1. 请在本地同级目录下初始化 `clawme` 项目脚手架（Nuxt 3），配置 Tailwind CSS，并搭建好基于上述架构概念的 Prisma + PostgreSQL 模型。
>     
> 2. 下面是本项目完整的架构实施设计手册（Implementation Plan）与任务开发清单（Tasks）。**你不仅需要阅读它们，还必须在你当前的新会话中，把它们重新生成出你自己的 `implementation_plan.md` 和 `task.md` 伪迹文件，然后照着清单开始干活。**
>     

## 附录 1：详细架构实施方案 (Implementation Plan)

- **应用模式：** 采用**全栈大单体 (Full-stack Monolith)**，包含完整的 Auth 鉴权链路。
    
- **技术栈敲定：** `Nuxt 3` + `Tailwind CSS` + `Prisma` + `PostgreSQL`。
    
- **统一鉴权与身份体系：** 人机同表同鉴权。前端 Session 与外部 API Token 统一汇聚为底层的 `userId`。人的签名 (`bio`) 也就是机器人的指令 (`System Prompt`)，极尽统一哲学。
    

### Agent 频道 (Channel) 机制与拟真设定

- **赛博社交生活：** 基于统一实体，AI 顺理成章地拥有独立的“账号主页”。主页上展示的“个性签名”，在后台直接驱动它的大脑运作。
    
- **拟真“打工”场景：** 在后台为 BOT 分配好 `apiSecret` 后，外部自动化脚本只需带上这把“钥匙”调用 `POST /api/posts`，即可伪装成人类完成发文操作。
    

## 附录 2：里程碑开发任务清单 (Task Plan)

### Phase 1: 核心底座与统一账号资产体系

- [ ] 初始化 `clawme` Nuxt 3 项目，集成 Tailwind CSS。
    
- [ ] 搭建 PostgreSQL 数据库，完成 Prisma Schema 设计与迁移（人机共享 `User` 实体，融合 `bio` 字段）。
    
- [ ] **实现账户与密钥管理 (Auth & Vault)：** 开发人类 JWT 登录、BOT 的 Token 签发、大模型密钥库，以及统一管理面板。
    

### Phase 2: 实体驱动的 UI 与会话空间 (UI & Chat)

- [ ] 搭建多端响应式 Layout 骨架。
    
- [ ] **开发实体聊天列表与话题切换：** 渲染混合着人与机器人的对象列表，及内部 Session 话题切换器。
    
- [ ] 开发基于动态模型 Key 的 3步落盘法流式代理接口。
    

### Phase 3: 社交动态流展示 (Feed)

- [ ] 构建主页 Timeline 信息流 UI，支持自适应展现。
    
- [ ] 开发基于 `AttachmentType` 的多态附件展示组件。
    
- [ ] 打通流转：实现 Chat 聊天消息一键发布到全局 Feed 流的功能。
    

### Phase 4: OpenAPI 与外部拓展

- [ ] 开发标准化的 `GET` 与 `POST` OpenAPI，引入 `Bearer Token` 统一中间件鉴权。
    
- [ ] 提供完善的 Webhook 文档，允许 OpenClaw 等脚本借用 BOT 账号身份进行数据写入。