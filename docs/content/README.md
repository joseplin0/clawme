# Clawme 文档中心

本目录现在明确分成 5 层文档：

- 当前实现：与仓库代码同步，AI 工具和协作者应优先阅读。
- ADR：记录关键架构决策和取舍原因。
- 设计草案：描述中长期目标，不保证已经落地。
- 外部参考：辅助理解，不作为当前实现依据。
- 运维与部署：存放部署、运行、排障类文档。

## 推荐阅读顺序

1. [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)：先看现在到底做到了哪一步。
2. [`CODEBASE_MAP.md`](./CODEBASE_MAP.md)：再看目录职责和主链路。
3. [`ROADMAP.md`](./ROADMAP.md)：最后看接下来该补什么。
4. [`WEBSOCKET_CHAT.md`](./WEBSOCKET_CHAT.md)：需要深入聊天链路时再读。
5. [`adr/README.md`](./adr/README.md)：需要追踪关键架构决策时再读。

## 当前实现

| 文档 | 用途 |
| --- | --- |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | 基于当前代码的项目进度、已完成能力、缺口与风险 |
| [`CODEBASE_MAP.md`](./CODEBASE_MAP.md) | 面向 coding AI 和新同事的代码地图、入口文件和阅读顺序 |
| [`ROADMAP.md`](./ROADMAP.md) | 当前阶段路线图，作为当前执行计划的唯一入口 |
| [`WEBSOCKET_CHAT.md`](./WEBSOCKET_CHAT.md) | 当前仓库真实生效的 WebSocket 聊天方案 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 协作约定、Conventional Commits 前缀说明与提交校验规则 |
| [`DOCS_GUIDE.md`](./DOCS_GUIDE.md) | 面向 AI 和人工协作者的文档维护准则，说明不同类型改动应该更新哪类文档 |

## ADR

| 文档 | 说明 |
| --- | --- |
| [`adr/README.md`](./adr/README.md) | ADR 索引与使用规则 |
| [`adr/0001-documentation-structure.md`](./adr/0001-documentation-structure.md) | 首轮文档分层迁移策略 |
| [`adr/0002-drizzle-as-source-of-truth.md`](./adr/0002-drizzle-as-source-of-truth.md) | 以 Drizzle 作为当前数据库实现事实来源 |
| [`adr/0003-websocket-primary-chat-transport.md`](./adr/0003-websocket-primary-chat-transport.md) | WebSocket 作为主聊天传输层，HTTP 流式接口保留 |
| [`adr/0004-remove-root-compatibility-stubs.md`](./adr/0004-remove-root-compatibility-stubs.md) | 移除根级兼容页，统一使用目录化入口 |

## 设计草案与长期方向

这些文档保留其价值，但应视为“目标方向”而不是“当前事实”：

| 文档 | 说明 |
| --- | --- |
| [`design/README.md`](./design/README.md) | 设计草案目录说明 |
| [`design/VISION.md`](./design/VISION.md) | 产品定位和长期愿景 |
| [`design/CYBER_ECOSYSTEM.md`](./design/CYBER_ECOSYSTEM.md) | 赛博生态长期机制设计 |
| [`design/FUTURE_VISIONS.md`](./design/FUTURE_VISIONS.md) | 更远期产品设想 |
| [`design/CLAWME_AGENT.md`](./design/CLAWME_AGENT.md) | 子系统级别的生态草案 |
| [`design/archive/README.md`](./design/archive/README.md) | 已归档的历史设计稿索引，存放过时但仍可回溯的早期草案 |

## 外部参考

| 文档 | 说明 |
| --- | --- |
| [`reference/README.md`](./reference/README.md) | 外部参考目录说明 |
| [`reference/AI_SDK和 websocket.md`](./reference/AI_SDK和%20websocket.md) | AI SDK ChatTransport 与 WebSocket 的外部参考，不是当前实现说明 |

## 运维与部署

| 文档 | 说明 |
| --- | --- |
| [`ops/README.md`](./ops/README.md) | 预留部署、运行、排障类文档入口 |
| [`ops/DATABASE_COMMENTS.md`](./ops/DATABASE_COMMENTS.md) | 数据库表备注和字段备注的维护方式说明 |

## 面向 GitHub Wiki 的建议结构

如果后续迁移到 GitHub Wiki，建议一一映射，不要把“现状”和“愿景”混写在同一页：

- `Home`：本页
- `Current Status`：`PROJECT_STATUS.md`
- `Codebase Map`：`CODEBASE_MAP.md`
- `ADR`：`adr/`
- `Architecture`：`CODEBASE_MAP.md` + `WEBSOCKET_CHAT.md` + `adr/`
- `Roadmap`：`ROADMAP.md`
- `Deployment`：`ops/DEPLOYMENT.md`
- `Runbook / Ops`：`ops/RUNBOOK.md`
- `Vision`：`design/VISION.md`、`design/CYBER_ECOSYSTEM.md`、`design/FUTURE_VISIONS.md`

## 文档维护规则

- 当前实现文档必须以代码为准，优先写清入口文件、请求链路和已知边界。
- 设计草案必须明确标注“未必已实现”，避免 AI 工具把远期设想当成当前事实。
- 外部参考必须单列，不能与项目事实混排。
- 新增部署、运行和排障文档时，优先放进 `docs/content/ops/`。
- 文档更新方式说明统一维护在 `docs/content/DOCS_GUIDE.md`，不要在多个索引页重复写一套规则。
