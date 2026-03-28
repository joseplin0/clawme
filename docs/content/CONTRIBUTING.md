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
