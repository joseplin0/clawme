#!/bin/bash
# 路径: scripts/init-pr-template.sh
# 用法: FILE_PATH=$(bash ./scripts/init-pr-template.sh)

set -euo pipefail

TEMPLATE_PATH=".github/pull_request_template.md"

if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "Error: 模板 '$TEMPLATE_PATH' 不存在。请先补齐 PR 模板，再执行发布流程。" >&2
  exit 1
fi

TMP_FILE="/tmp/clawme_pr_template_$$.md"

cp "$TEMPLATE_PATH" "$TMP_FILE"

echo "$TMP_FILE"
