import { type UIMessage } from "ai";
import type { MessageMetadata } from "~~/shared/types/clawme";
import {
  ChatCommandError,
  getRoomMembersForUser,
  prepareRoomMessage,
  type PreparedChatCommand,
  type UserWithModelConfig,
} from "./chat-command.service";
import { createAssistantMessageStreamFromRoom } from "./assistant";
import {
  publishRoomChunk,
  publishRoomMessage,
  publishWsError,
} from "~~/server/utils/ws-event-bus";

export type { PreparedChatCommand, UserWithModelConfig };
export { ChatCommandError, getRoomMembersForUser, prepareRoomMessage };

export interface SendRoomMessageResult {
  activeRoomId: string;
  createdRoomId?: string;
}

export async function sendRoomMessage(input: {
  senderId: string;
  roomId?: string;
  memberIds?: string[];
  /** 前端发送的完整消息 */
  clientMessage?: UIMessage<MessageMetadata>;
  requestId?: string;
  onRoomCreated?: (result: SendRoomMessageResult) => void;
}): Promise<SendRoomMessageResult> {
  console.log("[Core] sendRoomMessage called:", {
    senderId: input.senderId,
    roomId: input.roomId,
    memberIds: input.memberIds,
    hasClientMessage: !!input.clientMessage,
  });

  const prepared = await prepareRoomMessage({
    senderId: input.senderId,
    roomId: input.roomId,
    memberIds: input.memberIds,
    clientMessage: input.clientMessage,
  });

  console.log("[Core] Message prepared:", {
    activeRoomId: prepared.activeRoomId,
    createdRoomId: prepared.createdRoomId,
    hasAssistantTarget: !!prepared.assistantTargetUser,
    recipientCount: prepared.recipientUserIds.length,
  });

  const result: SendRoomMessageResult = {
    activeRoomId: prepared.activeRoomId,
    createdRoomId: prepared.createdRoomId,
  };

  // 通知房间创建（用于发送 ACK）
  if (input.onRoomCreated && prepared.createdRoomId) {
    input.onRoomCreated(result);
  }

  // 广播系统消息给所有房间成员
  if (prepared.systemMessages && prepared.systemMessages.length > 0) {
    const allMemberIds = [input.senderId, ...prepared.recipientUserIds];
    for (const sysMsg of prepared.systemMessages) {
      const uiMessage: UIMessage<MessageMetadata> = {
        id: sysMsg.id,
        role: sysMsg.role,
        parts: sysMsg.parts as UIMessage<MessageMetadata>["parts"],
        metadata: {
          createdAt: sysMsg.createdAt.getTime(),
          userId: sysMsg.senderId,
        },
      };
      publishRoomMessage(allMemberIds, {
        roomId: prepared.activeRoomId,
        message: uiMessage,
      });
    }
  }

  // 如果有 AI 助手目标，启动后台流式回复
  if (prepared.assistantTargetUser) {
    console.log("[Core] Starting assistant stream for user:", prepared.assistantTargetUser.username);

    // 先广播用户消息给发送者
    publishRoomMessage([input.senderId], {
      roomId: prepared.activeRoomId,
      message: prepared.uiMessage,
    });

    // 在后台运行 AI 回复
    streamAssistantReply({
      roomId: prepared.activeRoomId,
      requestId: input.requestId,
      senderUserId: input.senderId,
      spectatorUserIds: prepared.recipientUserIds,
      assistantUser: prepared.assistantTargetUser,
    }).catch((error) => {
      console.error("[Core] Assistant stream error:", error);
    });
  } else {
    console.log("[Core] No assistant target, broadcasting to recipients");

    // 广播消息给接收者
    if (prepared.recipientUserIds.length > 0) {
      publishRoomMessage(prepared.recipientUserIds, {
        roomId: prepared.activeRoomId,
        message: prepared.uiMessage,
      });
    }

    // 发送完成信号给发送者
    if (input.requestId) {
      publishRoomChunk([input.senderId], {
        roomId: prepared.activeRoomId,
        requestId: input.requestId,
        chunk: { type: "finish" },
      });
    }
  }

  return result;
}

async function streamAssistantReply(input: {
  roomId: string;
  requestId?: string;
  senderUserId: string;
  spectatorUserIds?: string[];
  assistantUser: UserWithModelConfig;
}) {
  console.log("[Core] streamAssistantReply started:", {
    roomId: input.roomId,
    assistantUser: input.assistantUser.username,
  });

  try {
    console.log("[Core] Creating assistant message stream...");
    const assistantReply = await createAssistantMessageStreamFromRoom({
      roomId: input.roomId,
      assistantUser: input.assistantUser,
    });
    console.log("[Core] Assistant stream created, consuming...");

    await consumeAssistantStream({
      roomId: input.roomId,
      requestId: input.requestId,
      senderUserId: input.senderUserId,
      spectatorUserIds: input.spectatorUserIds,
      prepared: assistantReply,
    });

    console.log("[Core] Assistant stream completed successfully");
  } catch (error) {
    console.error("[Core] Assistant stream error:", error);
    const wsError = toWsErrorPayload(error, input.roomId);
    publishWsError([input.senderUserId], {
      ...wsError,
      requestId: input.requestId,
    });
  }
}

async function consumeAssistantStream(input: {
  roomId: string;
  requestId?: string;
  senderUserId: string;
  spectatorUserIds?: string[];
  prepared: Awaited<ReturnType<typeof createAssistantMessageStreamFromRoom>>;
}) {
  const stream = input.prepared.stream;
  const targetUserIds = [
    input.senderUserId,
    ...(input.spectatorUserIds ?? []),
  ];
  console.log("[Core] consumeAssistantStream started, stream type:", typeof stream, "isReadableStream:", stream instanceof ReadableStream);

  if (stream instanceof ReadableStream) {
    console.log("[Core] Using ReadableStream reader");
    const reader = stream.getReader();
    try {
      let chunkCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        console.log("[Core] Read chunk:", { done, hasValue: !!value });
        if (done) break;

        chunkCount++;
        console.log("[Core] Publishing chunk #", chunkCount);
        publishRoomChunk(targetUserIds, {
          roomId: input.roomId,
          requestId: input.requestId,
          chunk: value,
        });
      }
      console.log("[Core] ReadableStream finished, total chunks:", chunkCount);
    } finally {
      reader.releaseLock();
    }
  } else {
    console.log("[Core] Using async iterator");
    let chunkCount = 0;
    for await (const chunk of stream) {
      chunkCount++;
      console.log("[Core] Publishing chunk #", chunkCount);
      publishRoomChunk(targetUserIds, {
        roomId: input.roomId,
        requestId: input.requestId,
        chunk,
      });
    }
    console.log("[Core] Async iterator finished, total chunks:", chunkCount);
  }

  console.log("[Core] Waiting for completed promise");
  await input.prepared.completed;
  console.log("[Core] Completed promise resolved");

  // 发送完成信号
  if (input.requestId) {
    console.log("[Core] Sending finish chunk");
    publishRoomChunk(targetUserIds, {
      roomId: input.roomId,
      requestId: input.requestId,
      chunk: { type: "finish" },
    });
  }
}

function toWsErrorPayload(
  error: unknown,
  chatId?: string,
): Pick<{ code: string; text: string; chatId?: string }, "code" | "text" | "chatId"> {
  if (error instanceof ChatCommandError) {
    return {
      code: error.code,
      text: error.message,
      chatId: error.chatId ?? chatId,
    };
  }

  return {
    code: "MESSAGE_ERROR",
    text: error instanceof Error ? error.message : "消息处理失败",
    chatId,
  };
}
