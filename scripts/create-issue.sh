#!/bin/bash
# 路径: scripts/create-issue.sh
# 用法: bash ./scripts/create-issue.sh feat "新增悬浮效果" false /tmp/clawme_issue_feat_1234.md

if [ $# -ne 4 ]; then
  echo "Usage: bash ./scripts/create-issue.sh <type> <title> <true|false> <body-file>" >&2
  exit 1
fi

TYPE=$1
TITLE=$2
USE_BRANCH=$3
BODY_FILE=$4

if [ -z "$TYPE" ]; then
  echo "Error: TYPE 不能为空" >&2
  exit 1
fi

if [ -z "$TITLE" ]; then
  echo "Error: TITLE 不能为空" >&2
  exit 1
fi

case "$USE_BRANCH" in
  true | false) ;;
  *)
    echo "Error: USE_BRANCH 必须是 true 或 false" >&2
    exit 1
    ;;
esac

if [ ! -f "$BODY_FILE" ]; then
  echo "Error: 找不到正文文件 $BODY_FILE" >&2
  exit 1
fi

# 1. 建单
ISSUE_URL=$(gh issue create --title "${TYPE}: ${TITLE}" --body-file "$BODY_FILE" --label "$TYPE")
CREATE_EXIT_CODE=$?

if [ $CREATE_EXIT_CODE -ne 0 ]; then
  exit $CREATE_EXIT_CODE
fi

ISSUE_NUM=$(basename "$ISSUE_URL")

if [ -z "$ISSUE_NUM" ]; then
  echo "Error: 创建 Issue 后未拿到有效的 ISSUE_ID。" >&2
  exit 1
fi

# 2. 切分支
if [ "$USE_BRANCH" == "true" ]; then
  gh issue develop "$ISSUE_NUM" --name "${TYPE}-${ISSUE_NUM}" --checkout
  DEVELOP_EXIT_CODE=$?

  if [ $DEVELOP_EXIT_CODE -ne 0 ]; then
    exit $DEVELOP_EXIT_CODE
  fi
fi

# 3. 唯一输出编号
echo "$ISSUE_NUM"
