# 核心流转与服务端引擎 (The Engines)

> 文档状态：已归档的历史设计稿。内容仍保留早期 SSE 主导的方案叙事，不应作为当前实现依据。当前仓库实际聊天链路请优先查看 [`WEBSOCKET_CHAT.md`](../../WEBSOCKET_CHAT.md) 和 [`PROJECT_STATUS.md`](../../PROJECT_STATUS.md)。

## 混合驱动网关与 SSE 流

后端（如 Nuxt Nitro）暴露 SSE 接口。执行严格的 3 步落盘法以保护连接池：

1. 预创建 `GENERATING` 状态的空占位消息
2. 读取 AI System Prompt 透传流式数据
3. 结束后更新正文并将状态置为 `DONE`

## 标准化 OpenAPI 与 Channel 机制

统一采用标准 RESTful API (`POST /api/posts`)。外部程序（如 OpenClaw）只需携带 BOT 的 `apiSecret` 作为 Bearer Token 即可化身数字员工写入数据。获取历史聊天记录等接口强制验证所属 `sessionId`，划定严格安全边界。

## MCP 工具调度 (@nuxtjs/mcp-toolkit)

代理 AI 与本地资源的无缝交互。

## AI 工作流引擎 (useworkflow)

用于节点化复杂任务编排。

---

> **相关文档**：
>
> - [核心架构模式](./ARCHITECTURE.md)
> - [核心数据模型](./DATA_MODELS.md)
> - [赛博生态驱动引擎](../CYBER_ECOSYSTEM.md)
