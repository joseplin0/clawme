import { type UIMessageChunk } from "ai";
import type {
  ChatWsClientMessage,
  ChatWsConnectionAuth,
  ChatWsServerMessage,
} from "~~/shared/types/chat-ws";
import {
  ChatCommandError,
  getRoomMembersForUser,
  prepareDirectRoomMessage,
} from "~~/server/services/chat-command.service";
import { createAssistantMessageStreamFromRoom } from "~~/server/ecosystem/core/AssistantInstant";
import { resolveOwnerSocketUser } from "~~/server/utils/auth";

type WSMessage = ChatWsClientMessage;
type WSResponse = ChatWsServerMessage;

export default defineWebSocketHandler({
  async upgrade(request: any) {
    const user = await resolveOwnerSocketUser(request);

    if (!user?.id) {
      throw new Response("未授权的连接", {
        status: 401,
        statusText: "Unauthorized",
      });
    }

    request.context.auth = {
      userId: user.id,
      username: user.username,
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
          sendWsError(
            peer,
            "UNKNOWN_TYPE",
            `未知的消息类型: ${parsedData.type}`,
            {
              requestId: parsedData.requestId,
            },
          );
      }
    } catch (error) {
      console.error("[WS] Message handling error:", error);
      sendChatCommandError(peer, error, {
        requestId: data?.requestId,
        chatId: data?.roomId,
      });
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

function sendChatCommandError(
  peer: any,
  error: unknown,
  options: {
    chatId?: string;
    requestId?: string;
  } = {},
) {
  if (error instanceof ChatCommandError) {
    sendWsError(peer, error.code, error.message, {
      chatId: error.chatId ?? options.chatId,
      requestId: options.requestId,
    });
    return;
  }

  sendWsError(
    peer,
    "MESSAGE_ERROR",
    error instanceof Error ? error.message : "消息处理失败",
    options,
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

function sendFinishedStream(peer: any, chatId: string, requestId?: string) {
  sendStreamChunk(peer, chatId, requestId, { type: "finish" });
}

function sendRoomAck(
  peer: any,
  chatId: string,
  requestId: string,
  roomId: string,
) {
  peer.send(
    JSON.stringify({
      type: "ack",
      requestId,
      chatId,
      roomId,
    } satisfies WSResponse),
  );
}

async function handleMessageSend(peer: any, data: WSMessage, senderId: string) {
  const requestId = data.requestId;
  let chatId = data.roomId;

  try {
    const prepared = await prepareDirectRoomMessage({
      senderId,
      roomId: data.roomId,
      targetUserId: data.targetUserId,
      content: data.content ?? "",
    });

    chatId = prepared.activeRoomId;

    if (requestId && prepared.createdRoomId) {
      sendRoomAck(
        peer,
        prepared.activeRoomId,
        requestId,
        prepared.createdRoomId,
      );
    }

    if (prepared.targetUser.type !== "bot") {
      peer.publish(
        `user:${prepared.targetUser.id}`,
        JSON.stringify({
          type: "message",
          chatId: prepared.activeRoomId,
          message: prepared.uiMessage,
          roomId: prepared.createdRoomId,
        } satisfies WSResponse),
      );

      sendFinishedStream(peer, prepared.activeRoomId, requestId);
      return;
    }

    const assistantReply = await createAssistantMessageStreamFromRoom({
      roomId: prepared.activeRoomId,
      assistantUser: prepared.targetUser,
    });

    for await (const chunk of assistantReply.stream) {
      sendStreamChunk(peer, prepared.activeRoomId, requestId, chunk);
    }

    await assistantReply.completed;
  } catch (error) {
    console.error("[WS] Send message error:", error);
    sendChatCommandError(peer, error, {
      chatId,
      requestId,
    });
  }
}

async function handleTyping(peer: any, data: WSMessage, senderId: string) {
  const roomId = data.roomId;

  if (!roomId) {
    return;
  }

  const participants = await getRoomMembersForUser(roomId, senderId);
  if (!participants) {
    sendWsError(peer, "FORBIDDEN", "无权访问该房间", {
      chatId: roomId,
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
        chatId: roomId,
        userId: senderId,
      } satisfies WSResponse),
    );
  }
}

async function handleRead(peer: any, data: WSMessage, senderId: string) {
  const roomId = data.roomId;
  const messageId = data.messageId;

  if (!roomId || !messageId) {
    return;
  }

  const participants = await getRoomMembersForUser(roomId, senderId);
  if (!participants) {
    sendWsError(peer, "FORBIDDEN", "无权访问该房间", {
      chatId: roomId,
    });
    return;
  }

  console.log(
    `[WS] User ${senderId} read message ${messageId} in room ${roomId}`,
  );
}
