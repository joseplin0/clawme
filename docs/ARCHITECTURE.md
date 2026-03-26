# 核心架构模式

本项目采用**全栈大单体 (Full-stack Monolith)** 设计，追求极致的开发效率与数据流转体验。

## UI 与前端底座

Nuxt 3 + @nuxt/ui (MVP 阶段优先拥抱其标准组件库，快速搭建可用界面)。

## 数据中枢

Prisma + PostgreSQL (深度利用 JSONB 特性与 TOAST 机制)。

## 核心拓展引擎 (The Engines)

### 实时交互与生态执行

聊天与生态目前采用“一套事件模型、两条执行车道”的结构：

- `WS` 负责在线态、实时推送、输入态与流式返回
- `HTTP/REST + SSE` 负责查询、开放接口与兼容适配
- 聊天核心只保留一套服务编排，不再分别在 `WS` 和 `HTTP` 路由里复制业务逻辑
- 服务端把 assistant 消息生成收敛到 `server/ecosystem/core/AssistantInstant.ts`，后续意愿打分也只需要拦这一处
- 当前只保留最小的直接聊天意愿判断，不把生态决策系统一次做满
- Bot 回复暂时只区分两种结果：
  - 立即执行：用户与自有 Bot 的直接交互
  - 暂缓执行：预留给赛博生态的异步实现

当前阶段的重点是把 AI 触发边界收对，而不是提前把完整 `IntentionEngine` 实现塞进聊天链路。

### 本地小模型支持

支持通过 Ollama/LM Studio/oMLX 接入本地专用小模型。

### MCP (模型上下文协议)

采用 `@nuxtjs/mcp-toolkit` 模块进行原生集成与客户端调度。

### Workflow (工作流)

采用 `useworkflow` (https://useworkflow.dev) 构建可视化的 AI 流程编排与节点执行引擎。

---

> **相关文档**：
>
> - [项目定位与核心愿景](./VISION.md)
> - [核心数据模型](./DATA_MODELS.md)
> - [服务端引擎](./SERVER_ENGINES.md)
> - [WebSocket Chat 当前方案](./WEBSOCKET_CHAT_CURRENT_DESIGN.md)
