import type { UIMessage, UIMessageChunk } from "ai";

export type ChatWsClientMessage<
  UI_MESSAGE extends UIMessage = UIMessage,
> =
  | {
    type: "send";
    requestId?: string;
    /** 已有房间 ID */
    roomId?: string;
    /** 创建新房间时的成员 ID */
    memberIds?: string[];
    /** 前端发送的完整消息 */
    message: UI_MESSAGE;
  }
  | {
    type: "typing";
    roomId: string;
  }
  | {
    type: "read";
    roomId: string;
    messageId: string;
  };

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
