#!/bin/bash
# 路径: scripts/init-template.sh
# 用法: FILE_PATH=$(bash ./scripts/init-template.sh feat)

set -euo pipefail

if [ $# -ne 1 ] || [ -z "${1:-}" ]; then
  echo "Usage: bash ./scripts/init-template.sh <type>" >&2
  exit 1
fi

TYPE="$1"

case "$TYPE" in
  feat | fix | docs | refactor) ;;
  *)
    echo "Error: 不支持的任务类型 '$TYPE'。支持类型: feat, fix, docs, refactor" >&2
    exit 1
    ;;
esac

TEMPLATE_PATH=".github/ISSUE_TEMPLATE/${TYPE}.md"

if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "Error: 模板 '$TEMPLATE_PATH' 不存在。请先补齐对应模板，再执行 /task 流程。" >&2
  exit 1
fi

# 生成带有 $$ (进程ID) 的唯一临时文件，防止并发冲突
TMP_FILE="/tmp/clawme_issue_${TYPE}_$$.md"

# 去掉 YAML 标头，保留模板正文并写入临时文件
awk 'BEGIN{front=0} /^---$/{front++; next} front<2{next} {print}' "$TEMPLATE_PATH" > "$TMP_FILE"

# 唯一输出：把文件路径交给 AI
echo "$TMP_FILE"
