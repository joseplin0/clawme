# ClawMe 文档维护指南

本指南适用于 AI 智能体和人工协作者。

本项目使用 Nuxt Content 管理文档，文档根目录是 `docs/content/`。
文档总入口见 `docs/content/README.md`。

当前文档明确分成 5 层：

- 当前实现
- ADR
- 设计草案
- 外部参考
- 运维与部署

每次修改代码后，都要先判断这次变更属于哪一层，再更新对应文档。不要把长期设想、外部资料或过期描述写成当前事实。
如果不确定该改哪个文件，先看 `docs/content/README.md` 和当前目录结构，不要凭空创建仓库里不存在的目录。

其中 `docs/content/design/` 现在又分成两类：

- 仍在保留的长期方向文档
- `docs/content/design/archive/` 下的历史设计稿

## 按变更类型更新

1. **当前实现变更**：优先更新 `PROJECT_STATUS.md`、`CODEBASE_MAP.md`，必要时同步更新 `ROADMAP.md`、`WEBSOCKET_CHAT.md`、`CONTRIBUTING.md`。
2. **架构决策变更**：去 `docs/content/adr/` 新建 ADR，沿用现有顺序编号命名方式，例如 `0006-xxx.md`。内容至少包含 `Status`、`Date`、`Context`、`Decision`、`Consequences`、`Alternatives Considered`。如果旧 ADR 被替代，要明确标注。
3. **长期设计或未来方向**：去 `docs/content/design/` 更新，且必须明确说明“这不是当前代码事实”。
4. **已经明显过时、但还想保留回溯价值的旧设计稿**：移到 `docs/content/design/archive/`，不要继续把它们放在 `design/` 主目录里伪装成仍然有效的方向文档。
5. **外部资料整理**：去 `docs/content/reference/` 更新，只能作为参考，不能当作当前实现说明。
6. **部署、运行、排障**：去 `docs/content/ops/` 更新，例如部署步骤、环境变量、运行手册和故障处理。

## 写作规则

- 当前实现文档必须以代码为准，优先写清入口文件、请求链路、依赖边界和已知缺口。
- 当设计稿、旧文档或外部参考与代码冲突时，以代码和当前实现文档为准。
- 不要把“已经实现”和“计划实现”混写在同一段里。
- 新增文档时优先复用现有目录和命名方式，不要重造一套文档结构。
- 如果一次改动同时影响实现、路线图和架构决策，就分别更新对应文档，不要只改一处。
- `design/archive/` 只保留历史背景，不承担当前文档职责；如果内容已经成为当前事实，应更新当前实现文档，而不是继续维护归档稿。
