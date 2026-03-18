# 核心架构模式

本项目采用**全栈大单体 (Full-stack Monolith)** 设计，追求极致的开发效率与数据流转体验。

## UI 与前端底座

Nuxt 3 + @nuxt/ui (MVP 阶段优先拥抱其标准组件库，快速搭建可用界面)。

## 数据中枢

Prisma + PostgreSQL (深度利用 JSONB 特性与 TOAST 机制)。

## 核心拓展引擎 (The Engines)

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
