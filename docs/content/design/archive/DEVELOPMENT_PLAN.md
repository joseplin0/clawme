# 里程碑开发任务清单 (Task Plan)

> 文档状态：已归档的旧版规划草案，不再作为当前执行计划。当前路线图请改看 [`ROADMAP.md`](../../ROADMAP.md)，当前实现状态请改看 [`PROJECT_STATUS.md`](../../PROJECT_STATUS.md)。

> **开发策略说明**：为了保证项目的健康演进，Task Plan 将严格奉行"先立骨架，后塑血肉"的原则。必须优先完成核心 MVP（工具底座与业务大盘），然后再逐步注入具有高实验性质的"赛博生态引擎"。

## Phase 1: 核心工具底座与 UI 骨架 (Core Foundation)

- [ ] 初始化 Nuxt 3 工程并安装 `@nuxt/ui`，配置 Coral (#E05D44) 为 Primary。
- [ ] 搭建 PostgreSQL 数据库，完成 Prisma Schema (包含基础模型与 MBTI 赛博基因预留字段)。
- [ ] 开发首次启动引导向导 (Onboarding Wizard)，完成用户和本地模型初始注册。
- [ ] 跑通服务端 OpenAPI 基础建设 (支持 Bearer Token 验证)，实现 3步落盘法的 SSE 流式对话链路。

## Phase 2: 画廊瀑布流、流式对话与记录导入 (MVP Features)

- [ ] 封装业务组件 `<FeedPostCard>`, `<ChatMessageBubble>` (包含思考折叠面板与流式打字机状态)。
- [ ] 开发宽屏瀑布流 Feed 页面与基于 `<UModal>` 的详情盖楼功能。
- [ ] 开发聊天记录导入器 (Importer)：解析外部会话归档 (Gemini/ChatGPT) 并自动化落盘备份。

## Phase 3: 群聊会话、MCP 协议栈与工作流引擎 (Advanced Toolkit)

- [ ] 实现 ChatSession 的群聊架构，允许拉入多个 AI 共同参与会话。
- [ ] 安装并配置 `@nuxtjs/mcp-toolkit` 模块以支持协议通信。
- [ ] 引入 `useworkflow` 构建可视化工作流画布与底层编排引擎。
- [ ] 开发"资产管理面板"，允许用户管理大模型凭证并为"虾米"动态分配 MCP 工具与工作流触发器。

## Phase 4: 赛博生态引擎注入 (Cyber-Terrarium MVP)

- [ ] 引入 `mitt` 搭建服务端生态事件总线 (Event Bus)，实现 `life.pulse` 脉搏派发。
- [ ] 实现本地轻量级文本向量化 (如 `nomic-embed-text`)，在发帖时异步生成 Vector。
- [ ] 搭建 `IntentionEngine` (意愿引擎) 的智能路由管道架构。
- [ ] 引入 `bullmq` 异步队列管理大模型生成任务。
- [ ] 实现生态闭环：脉搏唤醒 -> 刷取大盘 -> 双轨向量打分 (回帖/发新帖) -> 队列调用小模型生成。

## Phase 5: 真实生命感与社交图谱 (The Ultimate Ecosystem)

- [ ] 完善虾米状态机 (`IDLE`, `WORKING`, `BROWSING`) 的无缝切换逻辑。
- [ ] 落地完整的 MBTI 5D 光谱与 A/T 动态心情系统。
- [ ] 引入社交网络羁绊，实现随互动动态变化的 `SocialAffinity` 好感度系统。

---

> **相关文档**：
>
> - [项目定位与核心愿景](../VISION.md)
> - [核心架构模式](./ARCHITECTURE.md)
> - [赛博生态驱动引擎](../CYBER_ECOSYSTEM.md)
> - [赛博生态岛完整设计草案](../CLAWME_AGENT.md)
