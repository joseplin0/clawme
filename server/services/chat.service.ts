import { desc, eq } from "drizzle-orm";
import type {
  ChatMessageRecord,
  MessagePart,
  MessageRole,
  MessageStatus,
} from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";
import type { StoredClawmeAppState } from "./system.service";

const { chatMessages } = schema;

export async function createMessage(input: {
  sessionId: string;
  userId: string;
  role: MessageRole;
  parts: MessagePart[];
  status?: MessageStatus;
}) {
  const [message] = await db
    .insert(chatMessages)
    .values({
      sessionId: input.sessionId,
      userId: input.userId,
      role: input.role,
      parts: input.parts,
      status: input.status ?? "DONE",
    })
    .returning();

  if (!message) {
    throw new Error("Failed to create message");
  }

  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role as MessageRole,
    parts: (message.parts as MessagePart[]) ?? [],
    status: message.status as MessageStatus,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function updateMessage(
  messageId: string,
  updates: Partial<Pick<ChatMessageRecord, "parts" | "status">>,
) {
  const updateData: Record<string, unknown> = {};
  if (updates.parts !== undefined) updateData.parts = updates.parts;
  if (updates.status !== undefined) updateData.status = updates.status;

  const [message] = await db
    .update(chatMessages)
    .set(updateData)
    .where(eq(chatMessages.id, messageId))
    .returning();

  if (!message) {
    throw new Error("Failed to update message");
  }

  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role as MessageRole,
    parts: (message.parts as MessagePart[]) ?? [],
    status: message.status as MessageStatus,
    createdAt: message.createdAt.toISOString(),
  };
}

export function getActiveSessionId(state: StoredClawmeAppState) {
  return state.sessions[0]?.id ?? null;
}

export function createMockAssistantReply(
  prompt: string,
  state: StoredClawmeAppState,
) {
  const assistantName = state.bot?.nickname ?? "虾米";
  const provider = state.providers[0];
  const cleanedPrompt = prompt.trim().replace(/\s+/g, " ");

  return [
    `${assistantName} 已收到，我们先把这件事压进 Clawme 的可执行轨道。`,
    `当前输入聚焦在「${cleanedPrompt.slice(0, 60)}${cleanedPrompt.length > 60 ? "..." : ""}」这件事上。`,
    "我会先稳定底座，再补业务血肉：",
    "1. 固化初始化状态与账号边界。",
    "2. 让聊天链路先具备流式占位与收尾落盘。",
    "3. 把后续数据库接入点收敛到统一仓储层。",
    provider
      ? `当前预留的模型网关是 ${provider.name} / ${provider.modelId}。等真实本地模型接上后，这条 SSE 链路可以直接替换生成器。`
      : "当前还没有模型网关配置，所以我先用可替换的 mock 生成器把服务链打通。",
  ].join("\n\n");
}

/**
 * Get chat session list data with last message for each session
 */
export async function getChatSessionListData() {
  const sessions = await db.query.chatSessions.findMany({
    with: {
      messages: {
        limit: 1,
        orderBy: [desc(chatMessages.createdAt)],
      },
    },
  });

  const mappedSessions = sessions.map((s) => {
    const lastMsg = s.messages[0];
    let lastMessageText: string | undefined;
    if (lastMsg) {
      const parts = (lastMsg.parts as MessagePart[]) ?? [];
      const textPart = parts.find((p) => p.type === "text");
      lastMessageText = textPart?.text;
    }
    return {
      id: s.id,
      type: s.type,
      title: s.title || "",
      isArchived: s.isArchived,
      lastMessage: lastMessageText,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  });

  return {
    sessions: mappedSessions,
    activeSessionId: sessions[0]?.id ?? null,
  };
}
