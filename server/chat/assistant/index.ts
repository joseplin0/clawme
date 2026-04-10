import { eq } from "drizzle-orm";
import type { ModelMessage } from "ai";
import { db, schema } from "~~/server/utils/db";
import {
  isFileMessagePart,
  isImageMessagePart,
  isTextMessagePart,
} from "~~/shared/types/clawme";
import type { UserWithModelConfig } from "../chat-command.service";

// 引入类型和各个 Provider
import type { BotStreamProvider } from "./types";
import { LlmBotProvider } from "./providers/llm.provider";
import { AcpxBotProvider } from "./providers/acpx.provider";
import { routeAssistantIntent } from "./intent-router";

const { roomMessages } = schema;

// ============================================================================
// 1. 注册表：将所有支持的引擎放到数组中
// ============================================================================
const providers: BotStreamProvider[] = [
  new LlmBotProvider(),
  new AcpxBotProvider(),
];

// ============================================================================
// 2. 统一入口 (WebSocket 直接调用)
// ============================================================================
export async function createAssistantMessageStreamFromRoom(input: {
  roomId: string;
  assistantUser: UserWithModelConfig;
  triggerMessageId: string;
}) {
  const routed = await routeAssistantIntent({
    roomId: input.roomId,
    assistantUser: {
      id: input.assistantUser.id,
      username: input.assistantUser.username,
    },
    triggerMessageId: input.triggerMessageId,
  });

  if (routed.kind === "handled") {
    return routed.streamResult;
  }

  const modelMessages = await buildRoomModelMessages(input.roomId);
  const botType = input.assistantUser.type || "bot";

  // 动态寻找匹配的 Provider
  const provider = providers.find((p) => p.supports(botType));

  if (!provider) {
    throw new Error(`无法处理当前类型的 AI 助理: ${botType}`);
  }

  // 委托给对应的 Provider 处理并返回
  return provider.createStream({
    roomId: input.roomId,
    assistantUser: input.assistantUser,
    modelMessages,
  });
}

// ============================================================================
// 3. 共享的辅助函数
// ============================================================================
async function buildRoomModelMessages(roomId: string): Promise<ModelMessage[]> {
  const history = await db.query.roomMessages.findMany({
    where: eq(roomMessages.roomId, roomId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  const modelMessages: ModelMessage[] = [];

  for (const message of history) {
    const text = extractTextContent(
      Array.isArray(message.parts) ? message.parts : [],
    );
    const content = message.quotedExcerpt?.trim()
      ? [`引用内容：${message.quotedExcerpt.trim()}`, text].filter(Boolean).join("\n")
      : text;

    if (!content) {
      continue;
    }

    modelMessages.push({
      role: message.role,
      content,
    });
  }

  return modelMessages;
}

function extractTextContent(parts: unknown[]): string {
  return parts
    .flatMap((part) => {
      if (isTextMessagePart(part)) {
        const text = part.text.trim();
        return text ? [text] : [];
      }

      if (isImageMessagePart(part)) {
        return [`[图片: ${part.filename}]`];
      }

      if (isFileMessagePart(part)) {
        return [`[附件: ${part.filename}]`];
      }

      return [];
    })
    .join("\n");
}
