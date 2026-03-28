---
name: task
description: 执行 ClawMe 的 `/task` 标准研发流。仅当用户明确要求运行 `/task`、按标准流程建单推进需求，或要求走“建单 -> 编码 -> 审核 -> 收尾”链路时使用。
---

# ClawMe Task Workflow

## 0. 状态边界

- **讨论态**：用户在问方案、影响、取舍或明确要求“先讨论”时，不创建 Issue，不进入 `/task`。
- **执行态**：用户明确要求“开始做”“直接修”“建单处理”“按方案推进”时，进入 `/task`，并按下面步骤执行。
- **发现型 Issue**：coding 过程中临时暴露的新问题可以即时创建 Issue，但这只是记录，不代表已经进入该 Issue 的 `/task` 流程。

## 1. 技术负责人 / 产品

- 识别任务类型：`feat`、`fix`、`docs`、`refactor`。
- 生成不带前缀的精简标题。
- 评估是否需要独立分支：
  - 简单改动默认 `USE_BRANCH="false"`。
  - 多文件、新功能或高风险改动再询问用户是否建分支。
- 明确本次任务的目标文件、约束和验收标准。

## 2. Automator

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

- 如果本次需要分支隔离，Issue 创建成功后再进入分支 / worktree 准备阶段。
- Draft PR 不在建单时立即创建，而是在至少完成一轮本地提交和自检后再创建。

## 3. 全栈工程师 Subagent

- 默认让全栈工程师 subagent 介入实现阶段；若当前环境不支持 subagent，再由主 agent 代行并明确说明。
- 使用 `gh issue view "$ISSUE_ID"` 读取 Issue 标题和正文，Issue 是实现阶段的主事实来源。
- `TMP_PATH` 作为建单草稿保留，可用于交叉核对，但不替代 Issue。
- 如果当前工作树不干净、改动范围较大或需要并行处理，优先使用 issue 分支；需要额外隔离时再配合 `git worktree`。
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

- 如果新问题与当前任务强相关但不应并入当前验收，立即创建 sub-issue；如果无直接关联，立即创建独立 issue。
- 这些 follow-up issue 用于沉淀发现，不走当前 `/task` 流程；只有后续真正开始处理时，才对对应 issue 进入 `/task`。
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

- 如果走 PR，PR 描述使用 `Closes #$ISSUE_ID` 收口；只有明确不走 PR 且直接提交到默认分支时，才在提交正文使用 `Closes #$ISSUE_ID`。

## 规则

- 显式使用 `$task` 时，必须先建单并以 Issue 为准；建单失败或没有有效 `ISSUE_ID` 时立即停止，不进入后续阶段。
- 成功时保持输出简洁；失败时直接暴露错误，不吞掉报错。
- Issue 创建成功后，Issue 正文优先于临时文件。
- 不要把实现过程中暴露的新问题静默吸收到当前验收范围；改用评论、sub-issue 或独立 issue 分流。
