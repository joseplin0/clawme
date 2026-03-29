import { type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { type MessagePart } from "~~/shared/types/clawme";
import { createMessage } from "~~/server/services/chat.service";
import { createRoom, normalizeRoomType } from "~~/server/services/room.service";
import { db, schema } from "~~/server/utils/db";

const { users, roomMembers, roomMessages, rooms } = schema;

export type UserWithProvider = typeof users.$inferSelect & {
  llmProvider: typeof schema.llm.$inferSelect | null;
};

export interface PreparedChatCommand {
  activeRoomId: string;
  createdRoomId?: string;
  userMessage: typeof roomMessages.$inferSelect;
  uiMessage: UIMessage;
  targetUser: UserWithProvider;
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

export async function prepareDirectRoomMessage(input: {
  senderId: string;
  content: string;
  roomId?: string;
  memberIds?: string[];
}): Promise<PreparedChatCommand> {
  const content = input.content.trim();
  if (!content) {
    throw new ChatCommandError("EMPTY_CONTENT", "消息内容不能为空", input.roomId);
  }

  if (input.roomId) {
    const session = await db.query.rooms.findFirst({
      where: eq(rooms.id, input.roomId),
      with: {
        members: {
          with: {
            user: {
              with: {
                llmProvider: true,
              },
            },
          },
        },
      },
    });

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

    if (normalizeRoomType(session.type) !== "direct") {
      throw new ChatCommandError(
        "UNSUPPORTED_SESSION_TYPE",
        "当前实时聊天仅支持 direct 房间，group 后续再走扩展链路。",
        input.roomId,
      );
    }

    const targetUser =
      session.members.find((participant) => participant.userId !== input.senderId)?.user ?? null;
    if (!targetUser) {
      throw new ChatCommandError("TARGET_NOT_FOUND", "未找到房间目标", input.roomId);
    }

    const userMessage = await createUserMessage({
      roomId: session.id,
      senderId: input.senderId,
      content,
    });

    return {
      activeRoomId: session.id,
      userMessage,
      uiMessage: toChatUiMessage(userMessage),
      targetUser,
    };
  }

  const memberIds = Array.from(
    new Set((input.memberIds ?? []).filter((memberId) => memberId !== input.senderId)),
  );

  if (memberIds.length === 0) {
    throw new ChatCommandError(
      "MISSING_SESSION_OR_MEMBERS",
      "需要提供 roomId 或 memberIds",
    );
  }

  if (memberIds.length !== 1) {
    throw new ChatCommandError(
      "UNSUPPORTED_MEMBER_COUNT",
      "当前实时聊天仅支持通过 memberIds 创建 direct 房间，memberIds 需要且只能包含 1 个成员。",
    );
  }

  const [targetUserId] = memberIds;
  if (!targetUserId) {
    throw new ChatCommandError(
      "MISSING_SESSION_OR_MEMBERS",
      "需要提供 roomId 或 memberIds",
    );
  }

  const [sender, targetUser] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, input.senderId),
    }),
    db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      with: {
        llmProvider: true,
      },
    }),
  ]);

  if (!sender || !targetUser) {
    throw new ChatCommandError("USER_NOT_FOUND", "用户不存在");
  }

  const createdRoom = await createRoom({
    creatorId: sender.id,
    memberIds: [targetUser.id],
  }).catch((error) => {
    throw new ChatCommandError(
      "SESSION_CREATE_FAILED",
      error instanceof Error ? error.message : "房间创建失败",
    );
  });

  const userMessage = await createUserMessage({
    roomId: createdRoom.id,
    senderId: input.senderId,
    content,
  });

  const creation = {
    activeRoomId: createdRoom.id,
    createdRoomId: createdRoom.id,
    userMessage,
  };

  return {
    ...creation,
    uiMessage: toChatUiMessage(creation.userMessage),
    targetUser,
  };
}

async function createUserMessage(input: {
  roomId: string;
  senderId: string;
  content: string;
}) {
  try {
    const message = await createMessage({
      roomId: input.roomId,
      senderId: input.senderId,
      role: "user",
      parts: [{ type: "text", text: input.content }],
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
): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: ((message.parts as MessagePart[]) ?? []) as UIMessage["parts"],
    metadata: {
      createdAt: message.createdAt.getTime(),
      userId: message.senderId,
    },
  };
}
