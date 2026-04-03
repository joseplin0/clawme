import type { UIMessage, UIMessageChunk } from "ai";
import EventEmitter from "node:events";
import type { ChatWsServerMessage } from "~~/shared/types/chat-ws";

const PUBLISH_WS_EVENT = "publish-ws";

interface PublishWsEvent {
  userIds: string[];
  message: ChatWsServerMessage;
}

const wsEventBus = new EventEmitter();

export function onPublishWs(
  listener: (event: PublishWsEvent) => void,
): () => void {
  wsEventBus.on(PUBLISH_WS_EVENT, listener);
  return () => wsEventBus.off(PUBLISH_WS_EVENT, listener);
}

function publishWsMessage(userIds: string[], message: ChatWsServerMessage) {
  if (userIds.length === 0) {
    return;
  }

  console.log("[WS EventBus] Emitting to", userIds.length, "users, type:", message.type);
  wsEventBus.emit(PUBLISH_WS_EVENT, {
    userIds,
    message,
  } satisfies PublishWsEvent);
}

export function publishRoomMessage(
  userIds: string[],
  input: {
    roomId: string;
    message: UIMessage;
    requestId?: string;
  },
) {
  publishWsMessage(userIds, {
    type: "room-message",
    roomId: input.roomId,
    requestId: input.requestId,
    payload: {
      kind: "message",
      message: input.message,
    },
  });
}

export function publishRoomChunk(
  userIds: string[],
  input: {
    roomId: string;
    chunk: UIMessageChunk;
    requestId?: string;
  },
) {
  console.log("[WS EventBus] publishRoomChunk called:", {
    userIds,
    roomId: input.roomId,
    chunkType: (input.chunk as any)?.type,
  });
  publishWsMessage(userIds, {
    type: "room-message",
    roomId: input.roomId,
    requestId: input.requestId,
    payload: {
      kind: "chunk",
      chunk: input.chunk,
    },
  });
}

export function publishWsError(
  userIds: string[],
  input: {
    code: string;
    text: string;
    chatId?: string;
    requestId?: string;
  },
) {
  publishWsMessage(userIds, {
    type: "error",
    code: input.code,
    text: input.text,
    chatId: input.chatId,
    requestId: input.requestId,
  });
}
