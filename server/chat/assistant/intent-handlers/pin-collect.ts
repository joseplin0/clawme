import { isTextMessagePart } from "~~/shared/types/clawme";
import {
  extractUrlsFromText,
  ingestPinsFromMessage,
  stripUrlsFromText,
} from "~~/server/services/pin.service";
import type {
  AssistantIntentDecision,
  AssistantIntentHandler,
  AssistantInvocationContext,
} from "../intent-types";

const COLLECT_KEYWORDS = [
  "采集",
  "存一下",
  "稍后看",
  "入库",
  "收起来",
  "记一下",
];

export const pinCollectIntentHandler: AssistantIntentHandler = {
  name: "pin-collect",
  match(context) {
    return extractUrlsFromText(extractMessageText(context)).length > 0;
  },
  async handle(context): Promise<AssistantIntentDecision> {
    const text = extractMessageText(context);
    const urls = extractUrlsFromText(text);

    if (!urls.length) {
      return { kind: "pass" };
    }

    if (shouldAskForConfirmation(text)) {
      return {
        kind: "needs_confirmation",
        text: "我检测到你发来了链接，但这条更像是在提问或讨论。想让我直接采集入库的话，再补一句“采集这个”就行。",
      };
    }

    const result = await ingestPinsFromMessage({
      ownerId: context.triggerMessage.senderId,
      roomId: context.roomId,
      messageId: context.triggerMessage.id,
      text,
    });

    return {
      kind: "handled",
      text: renderCollectSummary(result),
    };
  },
};

function extractMessageText(context: AssistantInvocationContext) {
  return context.triggerMessage.parts
    .filter(isTextMessagePart)
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function shouldAskForConfirmation(text: string) {
  const normalized = stripUrlsFromText(text);
  if (!normalized) {
    return false;
  }

  if (COLLECT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  return normalized.length > 20 || normalized.includes("?") || normalized.includes("？");
}

function renderCollectSummary(input: {
  savedCount: number;
  duplicateCount: number;
  failedCount: number;
}) {
  const lines = ["已帮你处理这批链接。"];

  if (input.savedCount > 0) {
    lines.push(`新增采集 ${input.savedCount} 条。`);
  }

  if (input.duplicateCount > 0) {
    lines.push(`其中 ${input.duplicateCount} 条已经在库里了，我没有重复保存。`);
  }

  if (input.failedCount > 0) {
    lines.push(`还有 ${input.failedCount} 条处理失败了，可以稍后重试。`);
  }

  lines.push("你可以去 /moment?tab=pins 查看。");

  return lines.join("\n");
}
