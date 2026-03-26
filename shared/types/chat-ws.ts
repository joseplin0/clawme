import type { UIMessage, UIMessageChunk } from "ai";

export interface ChatWsClientMessage {
  type: "send" | "typing" | "read";
  requestId?: string;
  sessionId?: string;
  targetUserId?: string;
  content?: string;
  messageId?: string;
}

export interface ChatWsServerMessage<
  UI_MESSAGE extends UIMessage = UIMessage,
> {
  type: "ack" | "stream-chunk" | "message" | "typing" | "error";
  requestId?: string;
  chatId?: string;
  chunk?: UIMessageChunk;
  message?: UI_MESSAGE;
  sessionId?: string;
  userId?: string;
  code?: string;
  text?: string;
}

export interface ChatWsConnectionAuth {
  userId: string;
  username: string;
}
