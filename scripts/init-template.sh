#!/bin/bash
# 路径: scripts/init-template.sh
# 用法: FILE_PATH=$(bash ./scripts/init-template.sh feat)

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "Usage: bash ./scripts/init-template.sh <type>" >&2
  exit 1
fi

TYPE=$1
TEMPLATE_PATH=".github/ISSUE_TEMPLATE/${TYPE}.md"
# 生成带有 $$ (进程ID) 的唯一临时文件，防止并发冲突
TMP_FILE="/tmp/clawme_issue_${TYPE}_$$.md"

if [ -f "$TEMPLATE_PATH" ]; then
  # 完美砍掉 YAML 标头，保留正文并写入临时文件
  awk 'BEGIN{front=0} /^---$/{front++; next} front<2{next} {print}' "$TEMPLATE_PATH" > "$TMP_FILE"
else
  echo "Warning: 模板 $TEMPLATE_PATH 不存在，已使用兜底结构生成临时正文。" >&2
  # 兜底生成空结构
  echo -e "### 🎯 任务目标 (Objective)\n\n### 💡 核心逻辑 / 验收标准 (Checklist)\n\n### 📎 参考资料\n" > "$TMP_FILE"
fi

# 唯一输出：把文件路径交给 AI
echo "$TMP_FILE"
