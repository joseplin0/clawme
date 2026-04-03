import { desc, eq, inArray, sql } from "drizzle-orm";
import type {
  ClawmeAppState,
  RoomMessageRecord,
  MessagePart,
  MessageRole,
  MessageStatus,
} from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";
import { normalizeRoomType } from "./room.service";

const { rooms, roomMembers, roomMessages } = schema;
type ChatStateSnapshot = Pick<ClawmeAppState, "bot" | "modelConfigs" | "rooms">;

export async function createMessage(input: {
  roomId: string;
  senderId: string;
  role: MessageRole;
  parts: MessagePart[];
  status?: MessageStatus;
}) {
  const [message] = await db
    .insert(roomMessages)
    .values({
      roomId: input.roomId,
      senderId: input.senderId,
      role: input.role,
      parts: input.parts,
      status: input.status ?? "done",
    })
    .returning();

  if (!message) {
    throw new Error("Failed to create message");
  }

  return {
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    role: message.role as MessageRole,
    parts: (message.parts as MessagePart[]) ?? [],
    status: message.status as MessageStatus,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function updateMessage(
  messageId: string,
  updates: Partial<Pick<RoomMessageRecord, "parts" | "status">>,
) {
  const updateData: Record<string, unknown> = {};
  if (updates.parts !== undefined) updateData.parts = updates.parts;
  if (updates.status !== undefined) updateData.status = updates.status;

  const [message] = await db
    .update(roomMessages)
    .set(updateData)
    .where(eq(roomMessages.id, messageId))
    .returning();

  if (!message) {
    throw new Error("Failed to update message");
  }

  return {
    id: message.id,
    roomId: message.roomId,
    role: message.role as MessageRole,
    parts: (message.parts as MessagePart[]) ?? [],
    status: message.status as MessageStatus,
    createdAt: message.createdAt.toISOString(),
  };
}

export function getActiveRoomId(state: ChatStateSnapshot) {
  return state.rooms[0]?.id ?? null;
}

export function createMockAssistantReply(
  prompt: string,
  state: ChatStateSnapshot,
) {
  const assistantName = state.bot?.nickname ?? "虾米";
  const modelConfig = state.modelConfigs[0];
  const cleanedPrompt = prompt.trim().replace(/\s+/g, " ");

  return [
    `${assistantName} 已收到，我们先把这件事压进 Clawme 的可执行轨道。`,
    `当前输入聚焦在「${cleanedPrompt.slice(0, 60)}${cleanedPrompt.length > 60 ? "..." : ""}」这件事上。`,
    "我会先稳定底座，再补业务血肉：",
    "1. 固化初始化状态与账号边界。",
    "2. 让聊天链路先具备流式占位与收尾落盘。",
    "3. 把后续数据库接入点收敛到统一仓储层。",
    modelConfig
      ? `当前预留的模型网关是 ${modelConfig.name} / ${modelConfig.modelId}。等真实本地模型接上后，这条 SSE 链路可以直接替换生成器。`
      : "当前还没有模型网关配置，所以我先用可替换的 mock 生成器把服务链打通。",
  ].join("\n\n");
}

/**
 * Get chat session list data with last message for each session
 */
export async function getChatRoomListData() {
  const roomsList = await db.query.rooms.findMany({
    with: {
      members: true,
      messages: {
        limit: 1,
        orderBy: [desc(roomMessages.createdAt)],
      },
    },
  });

  const mappedRooms = roomsList.map((s) => {
    const lastMsg = s.messages[0];
    let lastMessageText: string | undefined;
    if (lastMsg) {
      const parts = (lastMsg.parts as MessagePart[]) ?? [];
      const textPart = parts.find((p) => p.type === "text");
      lastMessageText = textPart?.text;
    }
    return {
      id: s.id,
      type: normalizeRoomType(s.type),
      title: s.name || "",
      memberIds: s.members.map((member) => member.userId),
      lastMessage: lastMessageText,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  });

  return {
    rooms: mappedRooms,
    activeRoomId: roomsList[0]?.id ?? null,
  };
}
