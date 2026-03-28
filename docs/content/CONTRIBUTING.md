# 协作与提交规范

本仓库使用 Conventional Commits 作为统一提交格式，并通过 `husky + commitlint` 在 `commit-msg` 阶段做校验。

## 推荐前缀

- `feat`: 新功能或用户可感知的新能力。
- `fix`: 缺陷修复或行为纠正。
- `refactor`: 不改变对外行为的代码重构。
- `docs`: 文档新增、修订或结构调整。
- `chore`: 工具链、脚本、依赖、配置等杂项维护。

## 提交示例

```text
feat: add owner setup flow
fix: handle websocket reconnect race
refactor: split chat transport service
docs: update roadmap for websocket chat
chore: setup commitlint and husky
```

## 校验说明

- 非规范提交会在 `commit-msg` 阶段被阻止，例如 `git commit -m "随便测试"`。
- 提交描述建议保持单一意图，避免把多个无关改动塞进同一条 commit。

## Issue 与 PR 协作建议

- 先区分讨论态和执行态：讨论方案、评估影响时先不要建单；明确要求开始实现时再创建 Issue 并进入执行流。
- 主 Issue 正文只放稳定的目标、验收和约束；实现过程中发现的新信息优先写在 Issue 评论里，不要直接把额外问题混入当前验收范围。
- 如果新问题和当前任务强相关但不属于本次范围，创建 sub-issue；如果无直接关联，创建独立 issue。发现型 issue 只负责记录，后续真正开始实现时再进入对应流程。
- 多文件、高风险或当前工作树不干净时，优先使用 issue 分支；需要额外隔离时再配合 `git worktree`。
- 本地提交默认使用 `Refs #<issue-id>` 保持关联；推荐在 PR 描述中使用 `Closes #<issue-id>` 统一收口。

## 评论模板建议

实现过程中发现新问题时，可在当前 Issue 评论使用：

```md
## Discovery
发现了什么

## Impact
是否影响当前验收

## Decision
本次纳入 / 延后处理 / 后续跟进
```

任务完成时，可在当前 Issue 追加轻量复盘：

```md
## Result
本次完成了什么

## Verification
怎么验证的

## Follow-up
还剩什么后续项
```
