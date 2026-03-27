# ADR-0004: 移除 docs 根级兼容页，统一使用目录化入口

- Status: Accepted
- Date: 2026-03-27

## Context

在首轮文档迁移后，`docs/design/`、`docs/reference/`、`docs/ops/`、`docs/adr/` 已经稳定存在，同时根目录还保留了一批仅用于跳转的兼容页。

当前协作方式已经不再需要历史兼容，这些兼容页会带来两个问题：

- 增加目录噪音，影响 AI 工具和协作者判断正式入口
- 让文档结构同时存在“正式路径”和“跳转路径”，降低清晰度

## Decision

移除以下根级兼容页：

- `docs/VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODELS.md`
- `docs/UI_DESIGN.md`
- `docs/SERVER_ENGINES.md`
- `docs/DEVELOPMENT_PLAN.md`
- `docs/CYBER_ECOSYSTEM.md`
- `docs/FUTURE_VISIONS.md`
- `docs/CLAWME_AGENT.md`
- `docs/AI_SDK和 websocket.md`

后续统一使用目录化入口：

- 设计稿使用 `docs/design/`
- 参考资料使用 `docs/reference/`
- 运维文档使用 `docs/ops/`
- 架构决策使用 `docs/adr/`

## Consequences

- 文档结构更干净，正式入口更明确。
- 所有历史根级链接将直接失效。
- 后续索引和 Wiki 结构可以完全按目录化方案维护，不再需要兼容层。

## Alternatives Considered

### 继续保留兼容页

风险最低，但长期会制造重复入口和维护负担。

### 一开始就不做兼容

更干净，但在首轮迁移时对既有使用习惯更激进。当前在结构稳定后再删除，更可控。

