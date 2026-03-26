import { type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { toUIMessageRole, type MessagePart } from "~~/shared/types/clawme";
import { createMessage } from "~~/server/services/chat.service";
import { db, schema } from "~~/server/utils/db";

const { users, chatSessions, sessionParticipants, chatMessages } = schema;

export type UserWithProvider = typeof users.$inferSelect & {
  llmProvider: typeof schema.llmProviders.$inferSelect | null;
};

export interface PreparedChatCommand {
  activeSessionId: string;
  createdSessionId?: string;
  userMessage: typeof chatMessages.$inferSelect;
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

export async function getSessionParticipantsForUser(
  sessionId: string,
  userId: string,
) {
  const participants = await db.query.sessionParticipants.findMany({
    where: eq(sessionParticipants.sessionId, sessionId),
  });

  const isParticipant = participants.some((participant) => participant.userId === userId);
  if (!isParticipant) {
    return null;
  }

  return participants;
}

export async function prepareDirectChatMessage(input: {
  senderId: string;
  content: string;
  sessionId?: string;
  targetUserId?: string;
}): Promise<PreparedChatCommand> {
  const content = input.content.trim();
  if (!content) {
    throw new ChatCommandError("EMPTY_CONTENT", "消息内容不能为空", input.sessionId);
  }

  if (input.sessionId) {
    const session = await db.query.chatSessions.findFirst({
      where: eq(chatSessions.id, input.sessionId),
      with: {
        participants: {
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
        "会话不存在",
        input.sessionId,
      );
    }

    const senderParticipant = session.participants.find(
      (participant) => participant.userId === input.senderId,
    );

    if (!senderParticipant?.user) {
      throw new ChatCommandError("FORBIDDEN", "无权访问该会话", input.sessionId);
    }

    if (session.type !== "DIRECT") {
      throw new ChatCommandError(
        "UNSUPPORTED_SESSION_TYPE",
        "当前实时聊天仅支持 DIRECT 会话，GROUP_CHAT 后续走生态事件管线。",
        input.sessionId,
      );
    }

    const targetUser =
      session.participants.find((participant) => participant.userId !== input.senderId)?.user ?? null;
    if (!targetUser) {
      throw new ChatCommandError("TARGET_NOT_FOUND", "未找到会话目标", input.sessionId);
    }

    const userMessage = await createUserMessage({
      sessionId: session.id,
      senderId: input.senderId,
      content,
    });

    return {
      activeSessionId: session.id,
      userMessage,
      uiMessage: toChatUiMessage(userMessage),
      targetUser,
    };
  }

  if (!input.targetUserId) {
    throw new ChatCommandError(
      "MISSING_SESSION_OR_TARGET",
      "需要提供 sessionId 或 targetUserId",
    );
  }

  const [sender, targetUser] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, input.senderId),
    }),
    db.query.users.findFirst({
      where: eq(users.id, input.targetUserId),
      with: {
        llmProvider: true,
      },
    }),
  ]);

  if (!sender || !targetUser) {
    throw new ChatCommandError("USER_NOT_FOUND", "用户不存在");
  }

  const creation = await db.transaction(async (tx) => {
    const [newSession] = await tx
      .insert(chatSessions)
      .values({
        type: "DIRECT",
        title: `${sender.nickname} x ${targetUser.nickname}`,
      })
      .returning();

    if (!newSession) {
      throw new ChatCommandError("SESSION_CREATE_FAILED", "会话创建失败");
    }

    await tx.insert(sessionParticipants).values([
      { sessionId: newSession.id, userId: sender.id, role: "OWNER" },
      { sessionId: newSession.id, userId: targetUser.id, role: "MEMBER" },
    ]);

    const [userMessage] = await tx
      .insert(chatMessages)
      .values({
        sessionId: newSession.id,
        userId: input.senderId,
        role: "USER",
        parts: [{ type: "text", text: content }],
        status: "DONE",
      })
      .returning();

    if (!userMessage) {
      throw new ChatCommandError(
        "MESSAGE_CREATE_FAILED",
        "消息保存失败",
        newSession.id,
      );
    }

    return {
      activeSessionId: newSession.id,
      createdSessionId: newSession.id,
      userMessage,
    };
  });

  return {
    ...creation,
    uiMessage: toChatUiMessage(creation.userMessage),
    targetUser,
  };
}

async function createUserMessage(input: {
  sessionId: string;
  senderId: string;
  content: string;
}) {
  try {
    const message = await createMessage({
      sessionId: input.sessionId,
      userId: input.senderId,
      role: "USER",
      parts: [{ type: "text", text: input.content }],
      status: "DONE",
    });

    return {
      id: message.id,
      sessionId: message.sessionId,
      userId: message.userId,
      role: message.role,
      parts: message.parts,
      status: message.status,
      createdAt: new Date(message.createdAt),
    } as typeof chatMessages.$inferSelect;
  } catch {
    throw new ChatCommandError(
      "MESSAGE_CREATE_FAILED",
      "消息保存失败",
      input.sessionId,
    );
  }
}

function toChatUiMessage(
  message: typeof chatMessages.$inferSelect,
): UIMessage {
  return {
    id: message.id,
    role: toUIMessageRole(message.role),
    parts: ((message.parts as MessagePart[]) ?? []) as UIMessage["parts"],
    metadata: {
      createdAt: message.createdAt.getTime(),
      userId: message.userId,
    },
  };
}
