import { streamText, type ModelMessage, type UIMessage, type UIMessageChunk } from "ai";
import { eq } from "drizzle-orm";
import type {
  ChatWsClientMessage,
  ChatWsConnectionAuth,
  ChatWsServerMessage,
} from "~~/shared/types/chat-ws";
import { toUIMessageRole } from "~~/shared/types/clawme";
import { getOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import { createModelFromProvider, resolveUserLlmProvider } from "~~/server/utils/llm";

const { users, chatSessions, sessionParticipants, chatMessages } = schema;

type UserWithProvider = typeof users.$inferSelect & {
  llmProvider: typeof schema.llmProviders.$inferSelect | null;
};

type WSMessage = ChatWsClientMessage;
type WSResponse = ChatWsServerMessage;

export default defineWebSocketHandler({
  async upgrade(request: any) {
    const session = await getOwnerSession(request as any);

    if (!session?.user?.id) {
      throw new Response("未授权的连接", {
        status: 401,
        statusText: "Unauthorized",
      });
    }

    request.context.auth = {
      userId: session.user.id,
      username: session.user.username,
    } satisfies ChatWsConnectionAuth;
  },

  async open(peer: any) {
    try {
      const auth = getPeerConnectionAuth(peer);

      if (!auth) {
        peer.send(
          JSON.stringify({
            type: "error",
            code: "MISSING_CONTEXT",
            text: "连接鉴权上下文缺失",
          } satisfies WSResponse),
        );
        peer.close(4400, "连接鉴权上下文缺失");
        return;
      }

      peer.subscribe(`user:${auth.userId}`);

      console.log(`[WS] User ${auth.username} connected`);
    } catch (error) {
      console.error("[WS] Connection error:", error);
      peer.send(
        JSON.stringify({
          type: "error",
          code: "CONNECTION_ERROR",
          text: "连接建立失败",
        } satisfies WSResponse),
      );
      peer.close(1011, "连接建立失败");
    }
  },

  async message(peer: any, message: any) {
    let data: WSMessage | null = null;

    try {
      const parsedData =
        typeof message.json === "function"
          ? (message.json() as WSMessage)
          : (JSON.parse(message.toString()) as WSMessage);
      data = parsedData;
      const auth = getPeerConnectionAuth(peer);
      const senderId = auth?.userId;

      if (!senderId) {
        sendWsError(peer, "UNAUTHORIZED", "用户未认证", {
          requestId: parsedData.requestId,
        });
        return;
      }

      switch (parsedData.type) {
        case "send":
          await handleMessageSend(peer, parsedData, senderId);
          break;
        case "typing":
          await handleTyping(peer, parsedData, senderId);
          break;
        case "read":
          await handleRead(peer, parsedData, senderId);
          break;
        default:
          sendWsError(peer, "UNKNOWN_TYPE", `未知的消息类型: ${parsedData.type}`, {
            requestId: parsedData.requestId,
          });
      }
    } catch (error) {
      console.error("[WS] Message handling error:", error);
      sendWsError(
        peer,
        "MESSAGE_ERROR",
        error instanceof Error ? error.message : "消息处理失败",
        {
          requestId: data?.requestId,
        },
      );
    }
  },

  close(peer: any) {
    const auth = getPeerConnectionAuth(peer);
    const userId = auth?.userId;
    if (userId) {
      peer.unsubscribe(`user:${userId}`);
      console.log(`[WS] User ${auth.username} disconnected`);
    }
  },
});

function getPeerConnectionAuth(peer: any): ChatWsConnectionAuth | null {
  const auth = peer.context?.auth;

  if (!auth || typeof auth !== "object") {
    return null;
  }

  const { userId, username } = auth as Partial<ChatWsConnectionAuth>;
  if (!userId || !username) {
    return null;
  }

  return { userId, username };
}

function sendWsError(
  peer: any,
  code: string,
  text: string,
  options: {
    chatId?: string;
    requestId?: string;
  } = {},
) {
  peer.send(
    JSON.stringify({
      type: "error",
      code,
      text,
      chatId: options.chatId,
      requestId: options.requestId,
    } satisfies WSResponse),
  );
}

function sendStreamChunk(
  peer: any,
  chatId: string,
  requestId: string | undefined,
  chunk: UIMessageChunk,
) {
  peer.send(
    JSON.stringify({
      type: "stream-chunk",
      chatId,
      requestId,
      chunk,
    } satisfies WSResponse),
  );
}

function sendFinishedStream(
  peer: any,
  chatId: string,
  requestId?: string,
) {
  sendStreamChunk(peer, chatId, requestId, { type: "finish" });
}

function sendSessionAck(
  peer: any,
  chatId: string,
  requestId: string,
  sessionId: string,
) {
  peer.send(
    JSON.stringify({
      type: "ack",
      requestId,
      chatId,
      sessionId,
    } satisfies WSResponse),
  );
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

function buildModelMessages(
  history: Array<typeof chatMessages.$inferSelect>,
): ModelMessage[] {
  const modelMessages: ModelMessage[] = [];

  for (const message of history) {
    const text = extractTextContent(
      Array.isArray(message.parts) ? message.parts : [],
    );

    if (!text) {
      continue;
    }

    if (message.role === "SYSTEM") {
      modelMessages.push({ role: toUIMessageRole(message.role), content: text });
      continue;
    }

    if (message.role === "ASSISTANT") {
      modelMessages.push({ role: toUIMessageRole(message.role), content: text });
      continue;
    }

    modelMessages.push({ role: toUIMessageRole(message.role), content: text });
  }

  return modelMessages;
}

async function getSessionParticipantsForUser(
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

async function handleMessageSend(
  peer: any,
  data: WSMessage,
  senderId: string,
) {
  const sessionId = data.sessionId;
  const requestId = data.requestId;
  const targetUserId = data.targetUserId;
  const content = data.content?.trim();

  if (!content) {
    sendWsError(peer, "EMPTY_CONTENT", "消息内容不能为空", {
      chatId: sessionId,
      requestId,
    });
    return;
  }

  let activeSessionId: string | null = null;
  let createdSessionId: string | undefined;
  let targetUser: UserWithProvider | null = null;

  if (sessionId) {
    const session = await db.query.chatSessions.findFirst({
      where: eq(chatSessions.id, sessionId),
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
      sendWsError(peer, "SESSION_NOT_FOUND", "会话不存在", {
        chatId: sessionId,
        requestId,
      });
      return;
    }

    const senderParticipant = session.participants.find(
      (participant) => participant.userId === senderId,
    );

    if (!senderParticipant) {
      sendWsError(peer, "FORBIDDEN", "无权访问该会话", {
        chatId: sessionId,
        requestId,
      });
      return;
    }

    activeSessionId = session.id;
    targetUser =
      session.participants.find((participant) => participant.userId !== senderId)?.user ?? null;
  } else if (targetUserId) {
    const [sender, target] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, senderId),
      }),
      db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        with: {
          llmProvider: true,
        },
      }),
    ]);

    if (!sender || !target) {
      sendWsError(peer, "USER_NOT_FOUND", "用户不存在", {
        requestId,
      });
      return;
    }

    const [newSession] = await db
      .insert(chatSessions)
      .values({
        type: "DIRECT",
        title: `${sender.nickname} x ${target.nickname}`,
      })
      .returning();

    if (!newSession) {
      sendWsError(peer, "SESSION_CREATE_FAILED", "会话创建失败", {
        requestId,
      });
      return;
    }

    await db.insert(sessionParticipants).values([
      { sessionId: newSession.id, userId: sender.id, role: "OWNER" },
      { sessionId: newSession.id, userId: target.id, role: "MEMBER" },
    ]);

    activeSessionId = newSession.id;
    createdSessionId = newSession.id;
    targetUser = target;
  } else {
    sendWsError(peer, "MISSING_SESSION_OR_TARGET", "需要提供 sessionId 或 targetUserId", {
      requestId,
    });
    return;
  }

  if (!activeSessionId) {
    sendWsError(peer, "SESSION_RESOLVE_FAILED", "无法解析当前会话", {
      chatId: sessionId,
      requestId,
    });
    return;
  }

  const [userMessage] = await db
    .insert(chatMessages)
    .values({
      sessionId: activeSessionId,
      userId: senderId,
      role: "USER",
      parts: [{ type: "text", text: content }],
      status: "DONE",
    })
    .returning();

  if (!userMessage) {
    sendWsError(peer, "MESSAGE_CREATE_FAILED", "消息保存失败", {
      chatId: activeSessionId,
      requestId,
    });
    return;
  }

  const uiMessage: UIMessage = {
    id: userMessage.id,
    role: toUIMessageRole(userMessage.role),
    parts: [{ type: "text", text: content }],
    metadata: {
      createdAt: userMessage.createdAt.getTime(),
      userId: senderId,
    },
  };

  if (requestId && createdSessionId) {
    sendSessionAck(peer, activeSessionId, requestId, createdSessionId);
  }

  if (!targetUser) {
    sendWsError(peer, "TARGET_NOT_FOUND", "未找到会话目标", {
      chatId: activeSessionId,
      requestId,
    });
    return;
  }

  if (targetUser.type === "BOT") {
    await streamAIResponse(peer, activeSessionId, targetUser, requestId);
    return;
  }

  peer.publish(
    `user:${targetUser.id}`,
    JSON.stringify({
      type: "message",
      chatId: activeSessionId,
      message: uiMessage,
      sessionId: createdSessionId,
    } satisfies WSResponse),
  );

  sendFinishedStream(peer, activeSessionId, requestId);
}

async function streamAIResponse(
  peer: any,
  sessionId: string,
  assistantUser: UserWithProvider,
  requestId?: string,
) {
  const provider = await resolveUserLlmProvider(assistantUser);

  if (!provider) {
    sendWsError(peer, "NO_LLM_PROVIDER", "AI 助理未配置 LLM 提供商", {
      chatId: sessionId,
      requestId,
    });
    return;
  }

  const history = await db.query.chatMessages.findMany({
    where: eq(chatMessages.sessionId, sessionId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  try {
    const assistantMessageMetadata = {
      userId: assistantUser.id,
      createdAt: Date.now(),
    };
    const model = createModelFromProvider(provider);
    const result = streamText({
      model,
      system: `你是 ${assistantUser.nickname || "虾米"}，一个有帮助的 AI 助手。请简洁友好地回复。`,
      messages: buildModelMessages(history),
    });

    for await (const chunk of result.toUIMessageStream({
      messageMetadata: () => assistantMessageMetadata,
    })) {
      sendStreamChunk(peer, sessionId, requestId, chunk);
    }

    const fullResponse = await result.text;
    await db.insert(chatMessages).values({
      sessionId,
      userId: assistantUser.id,
      role: "ASSISTANT",
      parts: [{ type: "text", text: fullResponse }],
      status: "DONE",
    });
  } catch (error) {
    console.error("[WS] AI response error:", error);
    sendWsError(
      peer,
      "AI_ERROR",
      error instanceof Error ? error.message : "AI 响应失败",
      {
        chatId: sessionId,
        requestId,
      },
    );
  }
}

async function handleTyping(peer: any, data: WSMessage, senderId: string) {
  const sessionId = data.sessionId;

  if (!sessionId) {
    return;
  }

  const participants = await getSessionParticipantsForUser(sessionId, senderId);
  if (!participants) {
    sendWsError(peer, "FORBIDDEN", "无权访问该会话", {
      chatId: sessionId,
    });
    return;
  }

  for (const participant of participants) {
    if (participant.userId === senderId) {
      continue;
    }

    peer.publish(
      `user:${participant.userId}`,
      JSON.stringify({
        type: "typing",
        chatId: sessionId,
        userId: senderId,
      } satisfies WSResponse),
    );
  }
}

async function handleRead(peer: any, data: WSMessage, senderId: string) {
  const sessionId = data.sessionId;
  const messageId = data.messageId;

  if (!sessionId || !messageId) {
    return;
  }

  const participants = await getSessionParticipantsForUser(sessionId, senderId);
  if (!participants) {
    sendWsError(peer, "FORBIDDEN", "无权访问该会话", {
      chatId: sessionId,
    });
    return;
  }

  console.log(`[WS] User ${senderId} read message ${messageId} in session ${sessionId}`);
}
