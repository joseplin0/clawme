---
name: task
description: 执行 ClawMe 的 `/task` 标准研发流。仅当用户明确要求运行 `/task`、按标准流程建单推进需求，或要求走“建单 -> 编码 -> 审核 -> 收尾”链路时使用。
---

# ClawMe Task Workflow

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

读取并重写该文件，只保留本次需求所需内容：

- `Objective` 写清用户结果。
- `Checklist` 按当前模块和需求拆成可验证步骤，不预设固定颗粒度。

再创建 Issue：

```bash
ISSUE_ID=$(bash ./scripts/create-issue.sh <type> "<title>" <USE_BRANCH> "$TMP_PATH")
```

执行后必须校验 `ISSUE_ID` 非空；若为空或命令失败，立即停止并汇报，不继续编码、审核或提交。
保留 `TMP_PATH` 文件，不自动删除，便于复核和重试。

## 3. 全栈工程师 Subagent

- 默认让全栈工程师 subagent 介入实现阶段；若当前环境不支持 subagent，再由主 agent 代行并明确说明。
- 使用 `gh issue view "$ISSUE_ID"` 读取 Issue 标题和正文，Issue 是实现阶段的主事实来源。
- `TMP_PATH` 作为建单草稿保留，可用于交叉核对，但不替代 Issue。
- subagent 按 Issue 目标修改 Vue/Nuxt 与相关业务代码，完成后返回变更结果。
- 代码改动完成后读取 `docs/content/DOCS_GUIDE.md`，按指南更新对应文档或新增 ADR。

## 4. 主 Agent 审核

- 主 agent 必须在开发完成后重新读取 Issue 内容和代码 diff。
- 审核重点是：目标是否达成、是否有越界改动、文档是否同步、是否引入明显回归。
- 审核不通过时，不进入提交阶段；继续修正或退回给实现方。

## 5. Release

- 只在主 agent 审核通过后，且用户明确要求或确认后执行 git 写操作。
- 只暂存本次修改文件，不使用 `git add .`。
- 如果存在 `ISSUE_ID`，提交信息使用：

```bash
git add <changed-files>
git commit -m "<type>: <title>" -m "closes #$ISSUE_ID"
```

## 规则

- 按顺序执行，不跳过建单直接进入编码。
- 成功时保持输出简洁；失败时直接暴露错误，不吞掉报错。
- Issue 创建成功后，Issue 正文优先于临时文件。
