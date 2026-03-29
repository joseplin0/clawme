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

## 本地验证

- `pnpm exec nuxi typecheck`：运行 Nuxt/TypeScript 类型检查。
- `pnpm build`：验证生产构建链路可用，适合检查打包阶段错误和构建告警。
- `pnpm test:unit`：运行 `tests/components/**/*.nuxt.spec.ts` 下的 Nuxt 运行时单元测试。
- `pnpm test:e2e`：先构建产物，再启动本地服务，并用 `@nuxt/test-utils` 的 `host` 模式执行 `tests/e2e` 冒烟测试。
- `pnpm test`：串行执行单元测试和端到端测试。

## PR 模板与合并检查

- 仓库使用 `.github/pull_request_template.md` 统一收集 `Summary`、`Scope`、`Verification`、`Risk`、`Screenshots`。
- 自动化 PR 流程应先执行 `bash ./scripts/init-pr-template.sh` 初始化正文，再按模板填写，不要绕过模板直接自造 PR 描述。
- `Merge Checklist` 不是额外文档，而是 PR 模板的一部分，用来在合并前确认证据是否充足。
- UI 改动默认附截图或录屏；无 UI 改动明确写 `N/A`，避免 reviewer 猜测。
- 如果某项验证不适用，必须在 PR 中写明原因，不要只取消勾选。
- 当前 GitHub Actions 会在 `push main`、`pull_request -> main` 和手动 `workflow_dispatch` 时执行 `.github/workflows/ci.yml`，默认校验 `typecheck`、`build`、`test:unit`、`test:e2e`。
- `build` warning 不会直接阻断合并，但会写入 workflow summary，并在 PR 中生成可覆盖更新的提醒评论，方便 review 时评估风险。
- CI 会上传 `build.log` artifact 供 review 查看完整构建日志。
- CI 使用 `actions/setup-node` 基于 `pnpm-lock.yaml` 缓存 pnpm store，`pnpm install` 会复用依赖缓存。
- CI 会启动 PostgreSQL service，并在校验前执行 `pnpm db:push` 同步 schema。
- `test:e2e` 在 CI 中会额外触发一次系统 bootstrap，准备 owner、bot 和 provider 等最小测试数据。

## 仓库元数据

- `.nuxtrc` 已纳入版本控制，用于固定 Nuxt setup 元数据；只有在新增/移除 Nuxt setup 或相关依赖变更时才应更新它。

## Issue 与 PR 协作建议

- 先区分讨论态和执行态：讨论方案、评估影响时先不要建单；明确要求开始实现时再创建 Issue 并进入执行流。
- 如果用户已经给出 Issue 编号或 URL，直接续做该 Issue，不要重复创建同主题 issue。
- 新任务默认走 `issue -> issue branch/worktree -> commit -> draft PR`，不要停在当前 `main` 工作区直接开发。
- 主 Issue 正文只放稳定的目标、验收和约束；实现过程中发现的新信息优先写在 Issue 评论里，不要直接把额外问题混入当前验收范围。
- 如果新问题和当前任务强相关但不属于本次范围，创建相关 follow-up issue；如果无直接关联，创建独立 issue。发现型 issue 只负责记录，后续真正开始实现时再进入对应流程。
- issue 分支默认命名为 `${type}-${issue-id}`，例如 `feat-9`、`fix-9`。
- 当前工作区干净且就是本次任务目录时，可直接用 `gh issue develop <id> -c` 进入 issue 分支。
- 当前工作区已有未提交改动、仍停留在 `main`，或不适合直接切分支时，先用 `gh issue develop <id> -n <branch>` 创建关联分支，再用 `git worktree add <path> <branch>` 进入独立工作区。
- 本地提交默认使用 `Refs #<issue-id>` 保持关联；推荐在 PR 描述中使用 `Closes #<issue-id>` 统一收口。
- 后续统一显式执行 `git push origin <issue-branch>`；不要使用裸 `git push`，也不要直接 push `main`，随后继续创建 Draft PR。
- PR 创建成功后等待用户 review / merge，不自动合并，也不手动关闭 issue。
- issue / PR comment 引用仓库文件时，优先使用 `../blob/<ref>/<path>`，并保留路径文本；不要硬编码仓库归属或本机绝对路径。
- issue / PR / comment 禁止暴露本机路径、用户名、主机名、代理地址、端口、token 或其他敏感环境信息；引用错误信息前先手工脱敏。
- 废弃内容优先局部编辑：只对失效句子或条目加删除线，保留有效上下文并补更正说明；不要整段全文删除线，也不要直接删除。
- GitHub 远程写操作若因沙箱或代理失败，按环境错误重试放行，不视为业务失败。
- GitHub 评论优先使用 `gh issue comment` / `gh pr comment`；不确定参数用 `-h` 查，CLI 不支持时再用 `gh api`。

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
