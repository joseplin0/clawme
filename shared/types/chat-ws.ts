import type { UIMessage, UIMessageChunk } from "ai";

export interface ChatWsClientMessage {
  type: "send" | "typing" | "read";
  requestId?: string;
  roomId?: string;
  memberIds?: string[];
  content?: string;
  messageId?: string;
}

export type ChatWsRoomMessagePayload<
  UI_MESSAGE extends UIMessage = UIMessage,
> =
  | {
      kind: "message";
      message: UI_MESSAGE;
    }
  | {
      kind: "chunk";
      chunk: UIMessageChunk;
    };

export type ChatWsServerMessage<
  UI_MESSAGE extends UIMessage = UIMessage,
> =
  | {
      type: "ack";
      requestId: string;
      chatId: string;
      roomId: string;
    }
  | {
      type: "room-message";
      roomId: string;
      requestId?: string;
      payload: ChatWsRoomMessagePayload<UI_MESSAGE>;
    }
  | {
      type: "typing";
      chatId: string;
      userId: string;
    }
  | {
      type: "error";
      code: string;
      text: string;
      chatId?: string;
      requestId?: string;
    };

export interface ChatWsConnectionAuth {
  userId: string;
  username: string;
}
