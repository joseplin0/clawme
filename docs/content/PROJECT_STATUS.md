# 项目现状

更新时间：2026-03-29

## 一句话结论

当前仓库已经从静态原型推进到可运行的 Nuxt 4 全栈应用，具备首次引导、管理员登录、Drizzle + PostgreSQL 持久化、Moment 流、设置页、会话列表/详情、会话创建、HTTP 流式聊天和 WebSocket 实时聊天基础链路。

## 机器校验

- 2026-03-29 执行 `pnpm exec nuxi typecheck`，通过。
- 2026-03-29 执行 `pnpm build`，通过。

## 已完成能力

### 工程底座

- Nuxt 4、`@nuxt/ui`、Nitro WebSocket、`nuxt-auth-utils` 已接入。
- 全局 `UApp`、默认布局和登录布局已接通。
- 全局路由中间件会根据系统初始化状态和登录状态自动跳转 `/setup`、`/login`、`/moment`。
- 已接入 `@nuxt/test-utils + vitest` 测试底座，仓库内已有聊天组件测试与 E2E 运行脚本。

### 数据与初始化

- 数据层当前采用 Drizzle ORM + PostgreSQL。
- `server/database/schema.ts` 已定义系统配置、用户、Provider、Feed、会话、消息等核心表。
- `drizzle/` 下已有 migration 快照与 SQL 文件。
- `/api/system/bootstrap` 会完成首次初始化，创建管理员、默认 BOT、Provider 和种子 Moment 数据；默认 direct 会话与首条消息改为后台异步生成，不再阻塞初始化返回。

### 认证与基础页面

- `/setup`：首次引导页面已可用。
- `/login`：管理员登录已可用。
- `/settings`：可查看初始化状态、管理员、默认助理、Provider 和基础系统统计。
- `/moment`：支持分页加载和瀑布流展示 Moment 卡片。

### 聊天链路

- `/api/chat/room`：会话列表与创建接口已可用，创建请求使用 `memberIds`，并按成员数量派生 `direct/group`。
- `/api/chat/room/[id]`：会话详情接口已可用。
- `/api/chat/room/[id].post`：HTTP 流式聊天接口已可用，但当前仅支持 `direct` 房间。
- `/api/ws/chat`：WebSocket 聊天、输入态、已读和新会话确认链路已接通。
- `/api/actors` 与 `/api/actors/[id]` 已提供选人创建和参与者补全所需数据。
- `server/ecosystem/core/AssistantInstant.ts` 已作为统一的 assistant 生成入口。
- 前端聊天页已接入 AI SDK `Chat` 和自定义 `WebSocketChatTransport`。
- 前端已补统一的 `CreateRoomTrigger`，支持聊天列表选人创建，以及聊天框基于当前成员直接新建会话。

## 已知缺口

### 功能还没补齐

- ChatGPT / Gemini 导入器还没有落地。
- 面向外部 BOT 或 Channel 的 Bearer Token 写入 API 还没有落地。
- `group` 房间当前只支持创建和浏览，消息发送链路仍只保留 `direct`。
- MCP、工作流、赛博生态调度仍停留在设计阶段。

### 代码中可见的占位或遗留

- `server/api/agent.post.ts` 仍是早期实验性路由，不属于当前主链路。
- `server/ecosystem/jobs/LifePulseWorker.ts` 目前是空文件。
- `server/ecosystem/evaluators/VectorMatch.ts` 目前是空文件。

## 与旧文档的主要偏差

- 旧文档多处写的是 Nuxt 3，当前代码实际是 Nuxt 4。
- 旧文档多处写的是 Prisma，当前代码实际是 Drizzle ORM。
- 旧文档强调 SSE 3 步落盘是主链路，当前实时聊天主链路已经是 WebSocket + AI SDK transport，HTTP 流式接口仍然保留。
- 赛博生态、MCP、Workflow 等长期方向在文档里描述较多，但仓库实现还处于骨架或占位状态。

## 现在最值得继续推进的事项

1. 补上 `group` 房间的消息发送与实时协议，避免当前只停留在“可创建、可浏览”。
2. 实现导入器和外部写入 API，把系统从“可聊天”推进到“可归档、可接入”。
3. 增补部署文档和运行文档，为 GitHub Wiki 或公开协作做准备。
