import { eq } from "drizzle-orm";
import type { ModelMessage } from "ai";
import { db, schema } from "~~/server/utils/db";
import type { UserWithModelConfig } from "~~/server/services/chat-command.service";

// 引入类型和各个 Provider
import type { BotStreamProvider } from "./types";
import { LlmBotProvider } from "./providers/llm.provider";
import { AcpxBotProvider } from "./providers/acpx.provider";

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
}) {
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

    if (!text) {
      continue;
    }

    modelMessages.push({
      role: message.role,
      content: text,
    });
  }

  return modelMessages;
}

function extractTextContent(parts: unknown[]): string {
  return parts
    .flatMap((part) => {
      if (!part || typeof part !== "object") {
        return [];
      }

      const candidate = part as { type?: string; text?: unknown };
      if (candidate.type !== "text" || typeof candidate.text !== "string") {
        return [];
      }

      const text = candidate.text.trim();
      return text ? [text] : [];
    })
    .join("\n");
}
