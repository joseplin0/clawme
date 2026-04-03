import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import type {
  ChatWsClientMessage,
  ChatWsServerMessage,
} from "~~/shared/types/chat-ws";

export interface WebSocketChatTransportOptions {
  url: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export type WebSocketConnectionState =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected"
  | "reconnecting";

type PendingStream = {
  controller: ReadableStreamDefaultController<UIMessageChunk>;
  abortController: AbortController;
};

type PendingRoomRequest = {
  resolve: (roomId: string) => void;
  reject: (error: Error) => void;
};

export class WebSocketChatTransport<UI_MESSAGE extends UIMessage>
  implements ChatTransport<UI_MESSAGE> {
  private ws: WebSocket | null = null;
  private connectionState: WebSocketConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private intentionallyClosed = false;
  private hasConnected = false;
  private reconnectAllowed = true;
  private connectionCloseError: Error | null = null;
  private pendingStreams = new Map<string, PendingStream>();
  private pendingRoomRequests = new Map<string, PendingRoomRequest>();
  private messageCallbacks = new Set<
    (chatId: string, message: UIMessage, roomId?: string) => void
  >();
  private stateChangeCallbacks = new Set<(state: WebSocketConnectionState) => void>();
  private connectionPromise: Promise<WebSocket> | null = null;

  constructor(private options: WebSocketChatTransportOptions) { }

  getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  onStateChange(callback: (state: WebSocketConnectionState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  private createRequestId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    return `ws-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private extractTextContent(message: UI_MESSAGE): string {
    return message.parts
      .flatMap((part) => {
        if (part.type !== "text") {
          return [];
        }

        const text = part.text.trim();
        return text ? [text] : [];
      })
      .join("\n");
  }

  private cleanupPendingRequest(requestId: string): void {
    this.pendingStreams.delete(requestId);
    this.pendingRoomRequests.delete(requestId);
  }

  private rejectPendingRequest(requestId: string, error: Error): void {
    const stream = this.pendingStreams.get(requestId);
    if (stream) {
      try {
        stream.controller.error(error);
      } catch {
        // stream may already be closed or errored
      }
      stream.abortController.abort();
    }

    const pendingRoom = this.pendingRoomRequests.get(requestId);
    pendingRoom?.reject(error);

    this.cleanupPendingRequest(requestId);
  }

  private closeAllPendingRequests(error: Error): void {
    const requestIds = new Set([
      ...this.pendingStreams.keys(),
      ...this.pendingRoomRequests.keys(),
    ]);

    for (const requestId of requestIds) {
      this.rejectPendingRequest(requestId, error);
    }
  }

  private resolvePendingRoomRequest(requestId: string, roomId: string): void {
    const pendingRoom = this.pendingRoomRequests.get(requestId);
    if (!pendingRoom) {
      return;
    }

    pendingRoom.resolve(roomId);
    this.pendingRoomRequests.delete(requestId);
  }

  private updateConnectionState(state: WebSocketConnectionState): void {
    this.connectionState = state;
    for (const callback of this.stateChangeCallbacks) {
      callback(state);
    }
  }

  private markConnectionClosed(error: Error, allowReconnect: boolean): void {
    this.connectionCloseError = error;
    this.reconnectAllowed = allowReconnect;
  }

  private consumeConnectionCloseError(event?: CloseEvent): Error {
    const error =
      this.connectionCloseError ??
      new Error(event?.reason || "WebSocket connection closed");

    this.connectionCloseError = null;

    return error;
  }

  private shouldReconnect(code: number): boolean {
    if (
      this.intentionallyClosed ||
      !this.reconnectAllowed ||
      !this.hasConnected
    ) {
      return false;
    }

    return !new Set([1000, 1001, 1008, 1011, 4400, 4401, 4403, 4500]).has(code);
  }

  private async connect(): Promise<WebSocket> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.intentionallyClosed = false;
    this.reconnectAllowed = true;
    this.connectionCloseError = null;
    this.connectionPromise = this.createConnection();

    try {
      return await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private createConnection(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      this.updateConnectionState("connecting");

      const ws = new WebSocket(this.options.url);
      let settled = false;

      ws.onopen = () => {
        this.ws = ws;
        this.hasConnected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionState("connected");
        settled = true;
        resolve(ws);
      };

      ws.onerror = (error) => {
        console.error("[WS] Connection error:", error);
        if (!settled) {
          this.markConnectionClosed(
            new Error("WebSocket connection failed"),
            true,
          );
        }
      };

      ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      ws.onclose = (event) => {
        console.log("[WS] Connection closed:", event.code, event.reason);
        this.ws = null;
        this.updateConnectionState("disconnected");

        const closeError = this.consumeConnectionCloseError(event);

        if (!settled) {
          settled = true;
          reject(closeError);
        }

        this.closeAllPendingRequests(closeError);

        if (this.shouldReconnect(event.code)) {
          this.attemptReconnect();
        }
      };
    });
  }

  private attemptReconnect(): void {
    if (this.intentionallyClosed) {
      return;
    }

    const maxAttempts = this.options.maxReconnectAttempts ?? 5;
    if (this.reconnectAttempts >= maxAttempts) {
      console.log("[WS] Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    this.updateConnectionState("reconnecting");

    const delay =
      (this.options.reconnectDelay ?? 1000) *
      Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(async () => {
      if (this.intentionallyClosed) {
        return;
      }

      try {
        await this.connect();
      } catch (error) {
        console.error("[WS] Reconnect failed:", error);
      }
    }, delay);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const rawData =
        typeof event.data === "string" ? event.data : String(event.data);
      const data: ChatWsServerMessage = JSON.parse(rawData);
      const { type } = data;

      switch (type) {
        case "ack":
          if (data.requestId && data.roomId) {
            this.resolvePendingRoomRequest(data.requestId, data.roomId);
          }
          break;

        case "room-message":
          console.log(`[WS] Received message for room ${data.roomId}, requestId: ${data.requestId}`);
          if (data.payload.kind === "chunk" && data.requestId) {
            this.handleStreamChunk(data.requestId, data.payload.chunk);
          }
          if (data.payload.kind === "message") {
            this.handleIncomingMessage(data.roomId, data.payload.message);
          }
          break;

        case "typing":
          console.log(`[WS] User ${data.userId} is typing in chat ${data.chatId}`);
          break;

        case "error":
          console.error(`[WS] Server error: ${data.code} - ${data.text}`);
          {
            const error = new Error(data.text || "Unknown server error");

            if (data.requestId) {
              this.rejectPendingRequest(data.requestId, error);
              return;
            }

            this.markConnectionClosed(error, false);
            this.closeAllPendingRequests(error);
          }
          break;
      }
    } catch (error) {
      console.error("[WS] Failed to parse message:", error);
    }
  }

  private handleStreamChunk(requestId: string, chunk: UIMessageChunk): void {
    const stream = this.pendingStreams.get(requestId);
    if (!stream) {
      return;
    }

    stream.controller.enqueue(chunk);

    if (chunk.type === "finish" || chunk.type === "error") {
      stream.controller.close();
      this.pendingStreams.delete(requestId);
    }
  }

  private handleIncomingMessage(
    chatId: string,
    message: UIMessage,
    roomId?: string,
  ): void {
    for (const callback of this.messageCallbacks) {
      callback(chatId, message, roomId);
    }
  }

  async sendMessages({
    trigger,
    chatId,
    messageId,
    messages,
    abortSignal,
  }: {
    trigger: "submit-message" | "regenerate-message";
    chatId: string;
    messageId: string | undefined;
    messages: UI_MESSAGE[];
    abortSignal: AbortSignal | undefined;
  }): Promise<ReadableStream<UIMessageChunk>> {
    if (trigger === "regenerate-message") {
      throw new Error("WebSocket transport 暂不支持 regenerate-message");
    }

    const lastMessage = messages[messages.length - 1];
    const content = lastMessage ? this.extractTextContent(lastMessage) : "";
    if (!content) {
      throw new Error("最后一条消息缺少可发送的文本内容");
    }

    const requestId = this.createRequestId();
    const ws = await this.connect();
    const abortController = new AbortController();

    if (abortSignal) {
      abortSignal.addEventListener(
        "abort",
        () => {
          this.rejectPendingRequest(
            requestId,
            new DOMException("The operation was aborted.", "AbortError"),
          );
          abortController.abort();
        },
        { once: true },
      );
    }

    const stream = new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        this.pendingStreams.set(requestId, { controller, abortController });
      },
      cancel: () => {
        this.pendingStreams.delete(requestId);
        abortController.abort();
      },
    });

    const payload: ChatWsClientMessage = {
      type: "send",
      requestId,
      roomId: chatId,
      content,
      messageId,
    };

    ws.send(JSON.stringify(payload));

    return stream;
  }

  async sendMessageToMembers({
    memberIds,
    content,
    abortSignal,
  }: {
    memberIds: string[];
    content: string;
    abortSignal?: AbortSignal;
  }): Promise<{
    stream: ReadableStream<UIMessageChunk>;
    roomId: Promise<string>;
  }> {
    const requestId = this.createRequestId();
    const ws = await this.connect();
    const abortController = new AbortController();

    if (abortSignal) {
      abortSignal.addEventListener(
        "abort",
        () => {
          this.rejectPendingRequest(
            requestId,
            new DOMException("The operation was aborted.", "AbortError"),
          );
          abortController.abort();
        },
        { once: true },
      );
    }

    const roomIdPromise = new Promise<string>((resolve, reject) => {
      this.pendingRoomRequests.set(requestId, { resolve, reject });
    });

    const stream = new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        this.pendingStreams.set(requestId, { controller, abortController });
      },
      cancel: () => {
        this.cleanupPendingRequest(requestId);
        abortController.abort();
      },
    });

    const payload: ChatWsClientMessage = {
      type: "send",
      requestId,
      memberIds,
      content,
    };

    ws.send(JSON.stringify(payload));

    return { stream, roomId: roomIdPromise };
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }

  onIncomingMessage(
    callback: (chatId: string, message: UIMessage, roomId?: string) => void,
  ): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  async sendTyping(roomId: string): Promise<void> {
    const ws = await this.connect();
    ws.send(JSON.stringify({ type: "typing", roomId } satisfies ChatWsClientMessage));
  }

  async sendRead(roomId: string, messageId: string): Promise<void> {
    const ws = await this.connect();
    ws.send(
      JSON.stringify({
        type: "read",
        roomId,
        messageId,
      } satisfies ChatWsClientMessage),
    );
  }

  close(): void {
    this.intentionallyClosed = true;

    if (this.ws) {
      this.updateConnectionState("disconnecting");
      this.ws.close();
      this.ws = null;
    }

    this.closeAllPendingRequests(new Error("Transport closed"));
    this.updateConnectionState("disconnected");
  }
}
