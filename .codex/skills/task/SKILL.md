---
name: task
description: 执行 ClawMe 的 `/task` 标准研发流。仅当用户明确要求运行 `/task`、按标准流程建单推进需求，或要求走“建单 -> 编码 -> 审核 -> 收尾”链路时使用。
---

# ClawMe Task Workflow

## 0. 状态边界

- **讨论态**：用户在问方案、影响、取舍或明确要求“先讨论”时，不创建 Issue，不进入 `/task`。
- **执行态**：用户明确要求“开始做”“直接修”“建单处理”“按方案推进”时，进入 `/task`，并按下面步骤执行。
- **发现型 Issue**：coding 过程中临时暴露的新问题可以即时创建 Issue，但这只是记录，不代表已经进入该 Issue 的 `/task` 流程。
- **续做态**：如果用户已经给出 `ISSUE_ID`、Issue URL，或明确要求“继续处理某个 issue”，直接读取该 Issue 继续执行，不重复创建新 issue。

## 1. 技术负责人 / 产品

- 识别任务类型：`feat`、`fix`、`docs`、`refactor`。
- 生成不带前缀的精简标题。
- 新任务默认进入 issue 关联分支与 PR 流程，`USE_BRANCH="true"`。
- 如果当前工作区不适合直接切分支，默认改用 `git worktree` 隔离，不再停留在当前 `main` 工作区开发。
- 明确本次任务的目标文件、约束和验收标准。

## 2. Automator

- 如果用户已经给出 `ISSUE_ID` 或 Issue URL，跳过模板初始化和 `create-issue.sh`，直接执行：

```bash
gh issue view "$ISSUE_ID"
```

- 续做态下必须沿用已有 Issue 作为唯一事实来源，不得再补建一张同主题 issue。

先初始化模板：

```bash
TMP_PATH=$(bash ./scripts/init-template.sh <type>)
```

读取并按当前类型模板结构填写该文件，只保留本次需求所需内容：

- 保留模板原有章节和命名，不要把不同类型模板抹平成统一结构。
- 只填写与当前需求直接相关的信息，删除无关占位内容。
- 验收项按当前模块和需求拆成可验证步骤，不预设固定颗粒度。
- 如果 `init-template.sh` 因模板缺失或类型非法而失败，立即停止并汇报，不得私自生成通用正文继续流程。

再创建 Issue：

```bash
ISSUE_ID=$(bash ./scripts/create-issue.sh <type> "<title>" <USE_BRANCH> "$TMP_PATH")
```

执行后必须校验 `ISSUE_ID` 非空；若为空或命令失败，立即停止并汇报，不继续编码、审核或提交。
保留 `TMP_PATH` 文件，不自动删除，便于复核和重试。

- 新任务建单成功后，默认进入 issue 分支准备阶段。
- 如果当前工作区干净且就是本次任务的专用目录，可直接执行：

```bash
gh issue develop "$ISSUE_ID" -c
```

- 如果当前工作区已有未提交改动、仍停留在 `main`，或不适合直接切分支，则先创建 issue 关联分支，再进入独立 worktree：

```bash
gh issue develop "$ISSUE_ID" -n "${TYPE}-${ISSUE_ID}"
git worktree add "/tmp/clawme-issue-$ISSUE_ID" "${TYPE}-${ISSUE_ID}"
```

- 后续开发、审核、提交和 PR 创建都应在该 issue 分支或对应 worktree 中完成，而不是留在原工作区。

## 3. 全栈工程师 Subagent

- 默认让全栈工程师 subagent 介入实现阶段；若当前环境不支持 subagent，再由主 agent 代行并明确说明。
- 使用 `gh issue view "$ISSUE_ID"` 读取 Issue 标题和正文，Issue 是实现阶段的主事实来源。
- `TMP_PATH` 作为建单草稿保留，可用于交叉核对，但不替代 Issue。
- 新任务默认在 issue 分支中开发；当前工作树不干净或需要隔离时，必须切到对应 worktree，不在原工作区继续编码。
- subagent 按 Issue 目标修改 Vue/Nuxt 与相关业务代码，完成后返回变更结果。
- coding 过程中如果发现新问题，先在当前 Issue 评论中记录：

```md
## Discovery
发现了什么

## Impact
是否影响当前验收

## Decision
本次纳入 / 延后处理 / 后续跟进
```

- 如果新问题与当前任务强相关但不应并入当前验收，直接创建相关 follow-up issue；如果无直接关联，创建独立 issue。
- 这些 follow-up issue 用于沉淀发现，不走当前 `/task` 流程；只有后续真正开始处理时，才对对应 issue 进入 `/task`。
- 在 issue / PR comment 中引用仓库文件时，默认使用 `../blob/<ref>/<path>`，并附带路径文本；默认 `ref=main`，固定快照再改用 commit SHA。
- issue / PR / comment 禁止暴露本机路径、用户名、主机名、代理地址、端口、token 或环境变量值；引用错误信息前先手工脱敏。
- 废弃内容优先局部编辑：只对失效句子或条目加删除线，保留有效上下文并补更正说明；不要整段全文删除线，也不要直接删除。
- GitHub 远程写操作若因沙箱或代理失败，按环境错误重试放行，不视为业务失败。
- 代码改动完成后读取 `docs/content/DOCS_GUIDE.md`，按指南更新对应文档或新增 ADR。

## 4. 主 Agent 审核

- 主 agent 必须在开发完成后重新读取 Issue 内容和代码 diff。
- 审核重点是：目标是否达成、是否有越界改动、文档是否同步、是否引入明显回归。
- 审核不通过时，不进入提交阶段；继续修正或退回给实现方。

## 5. Release

- 只在主 agent 审核通过后，且用户明确要求或确认后执行 git 写操作。
- 只暂存本次修改文件，不使用 `git add .`。
- 审核通过后，先在当前 Issue 追加 closing comment，至少包含：

```md
## Result
本次完成了什么

## Verification
怎么验证的

## Follow-up
还剩什么后续项
```

- 如果存在 `ISSUE_ID`，本地提交默认使用：

```bash
git add <changed-files>
git commit -m "<type>: <title>" -m "refs #$ISSUE_ID"
```

- 本地提交后继续在 issue 分支上 push，并创建 Draft PR：

```bash
git push -u origin <issue-branch>
gh pr create -d
```

- PR 描述使用 `Closes #$ISSUE_ID` 收口；主 agent 在 PR 创建成功后停止自动推进，等待用户 review / merge，不自动合并，也不手动关闭 issue。

## 规则

- 显式使用 `$task` 时，必须先建单并以 Issue 为准；建单失败或没有有效 `ISSUE_ID` 时立即停止，不进入后续阶段。
- 新任务默认闭环是 `issue -> issue branch/worktree -> commit -> draft PR`，不能停在本地提交。
- 续做态如果不在对应 issue 分支或 worktree 中，先补齐 issue 分支 / worktree，再进入开发。
- 成功时保持输出简洁；失败时直接暴露错误，不吞掉报错。
- Issue 创建成功后，Issue 正文优先于临时文件。
- 不要把实现过程中暴露的新问题静默吸收到当前验收范围；改用评论、follow-up issue 或独立 issue 分流。
