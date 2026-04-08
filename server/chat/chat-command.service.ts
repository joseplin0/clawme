import { type UIMessage } from "ai";
import { eq, inArray } from "drizzle-orm";
import {
  isBotUserType,
  type MessagePart,
  type SessionType,
} from "~~/shared/types/clawme";
import { createMessage } from "./chat.service";
import { createRoom, normalizeRoomType, type SystemMessageData } from "./room.service";
import { db, schema } from "~~/server/utils/db";

/** 从 UIMessage.parts 中提取文本内容 */
function extractTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .flatMap((part) => {
      if (part.type !== "text") {
        return [];
      }
      const text = part.text.trim();
      return text ? [text] : [];
    })
    .join("\n");
}

const { users, roomMembers, rooms, roomMessages } = schema;

export type UserWithModelConfig = typeof users.$inferSelect & {
  modelConfig: typeof schema.modelConfigs.$inferSelect | null;
};

export interface PreparedChatCommand {
  activeRoomId: string;
  createdRoomId?: string;
  roomType: SessionType;
  userMessage: typeof roomMessages.$inferSelect;
  uiMessage: UIMessage;
  recipientUserIds: string[];
  assistantTargetUser?: UserWithModelConfig;
  systemMessages?: SystemMessageData[];
}

export class ChatCommandError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly chatId?: string,
  ) {
    super(message);
    this.name = "ChatCommandError";
  }
}

export async function getRoomMembersForUser(
  roomId: string,
  userId: string,
) {
  const participants = await db.query.roomMembers.findMany({
    where: eq(roomMembers.roomId, roomId),
  });

  const isParticipant = participants.some((participant) => participant.userId === userId);
  if (!isParticipant) {
    return null;
  }

  return participants;
}

export async function prepareRoomMessage(input: {
  senderId: string;
  /** 前端发送的完整消息 */
  clientMessage?: UIMessage;
  roomId?: string;
  memberIds?: string[];
}): Promise<PreparedChatCommand> {
  console.log("[ChatCommand] prepareRoomMessage called:", {
    senderId: input.senderId,
    roomId: input.roomId,
    memberIds: input.memberIds,
    hasClientMessage: !!input.clientMessage,
  });

  if (!input.clientMessage) {
    throw new ChatCommandError("EMPTY_CONTENT", "消息内容不能为空", input.roomId);
  }

  const parts = input.clientMessage.parts;
  const content = extractTextFromParts(parts);
  if (!content) {
    throw new ChatCommandError("EMPTY_CONTENT", "消息内容不能为空", input.roomId);
  }

  if (input.roomId) {
    console.log("[ChatCommand] Finding existing room:", input.roomId);

    const session = await db.query.rooms.findFirst({
      where: eq(rooms.id, input.roomId),
      with: {
        members: {
          with: {
            user: {
              with: {
                modelConfig: true,
              },
            },
          },
        },
      },
    });

    console.log("[ChatCommand] Room query completed, found:", !!session);

    if (!session) {
      throw new ChatCommandError(
        "SESSION_NOT_FOUND",
        "房间不存在",
        input.roomId,
      );
    }

    const senderParticipant = session.members.find(
      (participant) => participant.userId === input.senderId,
    );

    if (!senderParticipant?.user) {
      throw new ChatCommandError("FORBIDDEN", "无权访问该房间", input.roomId);
    }

    const roomType = normalizeRoomType(session.type);
    const otherParticipants = session.members.filter(
      (participant) => participant.userId !== input.senderId,
    );
    if (otherParticipants.length === 0) {
      throw new ChatCommandError(
        "TARGET_NOT_FOUND",
        "未找到房间目标",
        input.roomId,
      );
    }

    const userMessage = await createUserMessage({
      roomId: session.id,
      senderId: input.senderId,
      parts,
    });

    console.log("[ChatCommand] User message created:", userMessage.id);

    const assistantTargetUser =
      roomType === "direct" &&
        otherParticipants[0]?.user &&
        isBotUserType(otherParticipants[0].user.type)
        ? otherParticipants[0].user
        : undefined;

    console.log("[ChatCommand] Prepared result:", {
      activeRoomId: session.id,
      roomType,
      recipientCount: otherParticipants.length,
      hasAssistantTarget: !!assistantTargetUser,
      assistantType: assistantTargetUser?.type,
    });

    return {
      activeRoomId: session.id,
      roomType,
      userMessage,
      uiMessage: toChatUiMessage(userMessage, input.clientMessage?.id),
      recipientUserIds: otherParticipants.map((participant) => participant.userId),
      assistantTargetUser,
    };
  }

  console.log("[ChatCommand] Creating new room with memberIds:", input.memberIds);

  const memberIds = Array.from(
    new Set((input.memberIds ?? []).filter((memberId) => memberId !== input.senderId)),
  );

  if (memberIds.length === 0) {
    throw new ChatCommandError(
      "MISSING_SESSION_OR_MEMBERS",
      "需要提供 roomId 或 memberIds",
    );
  }

  const [sender, targetUsers] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, input.senderId),
    }),
    db.query.users.findMany({
      where: inArray(users.id, memberIds),
      with: {
        modelConfig: true,
      },
    }),
  ]);

  if (!sender) {
    throw new ChatCommandError("USER_NOT_FOUND", "用户不存在");
  }

  if (targetUsers.length !== memberIds.length) {
    throw new ChatCommandError("USER_NOT_FOUND", "用户不存在");
  }

  const createdRoom = await createRoom({
    creatorId: sender.id,
    memberIds,
  }).catch((error) => {
    throw new ChatCommandError(
      "SESSION_CREATE_FAILED",
      error instanceof Error ? error.message : "房间创建失败",
    );
  });

  const userMessage = await createUserMessage({
    roomId: createdRoom.id,
    senderId: input.senderId,
    parts,
  });

  const creation = {
    activeRoomId: createdRoom.id,
    createdRoomId: createdRoom.id,
    userMessage,
  };

  return {
    ...creation,
    roomType: createdRoom.type,
    uiMessage: toChatUiMessage(creation.userMessage, input.clientMessage?.id),
    recipientUserIds: memberIds,
    assistantTargetUser:
      createdRoom.type === "direct" &&
        memberIds.length === 1 &&
        targetUsers[0] &&
        isBotUserType(targetUsers[0].type)
        ? targetUsers[0]
        : undefined,
    systemMessages: createdRoom.systemMessages,
  };
}

async function createUserMessage(input: {
  roomId: string;
  senderId: string;
  parts: UIMessage["parts"];
}) {
  try {
    const message = await createMessage({
      roomId: input.roomId,
      senderId: input.senderId,
      role: "user",
      parts: input.parts as MessagePart[],
      status: "done",
    });

    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      role: message.role,
      parts: message.parts,
      status: message.status,
      createdAt: new Date(message.createdAt),
    } as typeof roomMessages.$inferSelect;
  } catch {
    throw new ChatCommandError(
      "MESSAGE_CREATE_FAILED",
      "消息保存失败",
      input.roomId,
    );
  }
}

function toChatUiMessage(
  message: typeof roomMessages.$inferSelect,
  clientMessageId?: string,
): UIMessage {
  return {
    id: clientMessageId ?? message.id,
    role: message.role,
    parts: ((message.parts as MessagePart[]) ?? []) as UIMessage["parts"],
    metadata: {
      createdAt: message.createdAt.getTime(),
      userId: message.senderId,
    },
  };
}
