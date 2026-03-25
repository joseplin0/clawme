import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

interface ClientWSMessage {
  type: "send" | "typing" | "read";
  requestId?: string;
  sessionId?: string;
  targetUserId?: string;
  content?: string;
  messageId?: string;
}

interface ServerWSMessage {
  type: "stream-chunk" | "message" | "typing" | "error";
  requestId?: string;
  chatId?: string;
  chunk?: UIMessageChunk;
  message?: UIMessage;
  sessionId?: string;
  userId?: string;
  code?: string;
  text?: string;
}

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

type PendingSessionRequest = {
  resolve: (sessionId: string) => void;
  reject: (error: Error) => void;
};

export class WebSocketChatTransport<UI_MESSAGE extends UIMessage>
  implements ChatTransport<UI_MESSAGE>
{
  private ws: WebSocket | null = null;
  private connectionState: WebSocketConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private intentionallyClosed = false;
  private hasConnected = false;
  private reconnectAllowed = true;
  private connectionCloseError: Error | null = null;
  private pendingStreams = new Map<string, PendingStream>();
  private pendingSessionRequests = new Map<string, PendingSessionRequest>();
  private messageCallbacks = new Set<
    (chatId: string, message: UIMessage, sessionId?: string) => void
  >();
  private stateChangeCallbacks = new Set<(state: WebSocketConnectionState) => void>();
  private connectionPromise: Promise<WebSocket> | null = null;

  constructor(private options: WebSocketChatTransportOptions) {}

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
    this.pendingSessionRequests.delete(requestId);
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

    const pendingSession = this.pendingSessionRequests.get(requestId);
    pendingSession?.reject(error);

    this.cleanupPendingRequest(requestId);
  }

  private closeAllPendingRequests(error: Error): void {
    const requestIds = new Set([
      ...this.pendingStreams.keys(),
      ...this.pendingSessionRequests.keys(),
    ]);

    for (const requestId of requestIds) {
      this.rejectPendingRequest(requestId, error);
    }
  }

  private resolvePendingSessionRequest(requestId: string, sessionId: string): void {
    const pendingSession = this.pendingSessionRequests.get(requestId);
    if (!pendingSession) {
      return;
    }

    pendingSession.resolve(sessionId);
    this.pendingSessionRequests.delete(requestId);
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
      const data: ServerWSMessage = JSON.parse(rawData);
      const { type, requestId, chatId, chunk, message, sessionId, userId, code, text } =
        data;

      switch (type) {
        case "stream-chunk":
          if (requestId && chunk) {
            this.handleStreamChunk(requestId, chunk);
          }
          break;

        case "message":
          if (requestId && sessionId) {
            this.resolvePendingSessionRequest(requestId, sessionId);
          }

          // 带 requestId 的 message 是发送确认，不应再次当作“收到新消息”广播给当前客户端。
          if (!requestId && chatId && message) {
            this.handleIncomingMessage(chatId, message, sessionId);
          }
          break;

        case "typing":
          console.log(`[WS] User ${userId} is typing in chat ${chatId}`);
          break;

        case "error":
          console.error(`[WS] Server error: ${code} - ${text}`);
          {
            const error = new Error(text || "Unknown server error");

            if (requestId) {
              this.rejectPendingRequest(requestId, error);
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
    sessionId?: string,
  ): void {
    for (const callback of this.messageCallbacks) {
      callback(chatId, message, sessionId);
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

    const payload: ClientWSMessage = {
      type: "send",
      requestId,
      sessionId: chatId,
      content,
      messageId,
    };

    ws.send(JSON.stringify(payload));

    return stream;
  }

  async sendMessageToUser({
    targetUserId,
    content,
    abortSignal,
  }: {
    targetUserId: string;
    content: string;
    abortSignal?: AbortSignal;
  }): Promise<{
    stream: ReadableStream<UIMessageChunk>;
    sessionId: Promise<string>;
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

    const sessionIdPromise = new Promise<string>((resolve, reject) => {
      this.pendingSessionRequests.set(requestId, { resolve, reject });
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

    const payload: ClientWSMessage = {
      type: "send",
      requestId,
      targetUserId,
      content,
    };

    ws.send(JSON.stringify(payload));

    return { stream, sessionId: sessionIdPromise };
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }

  onIncomingMessage(
    callback: (chatId: string, message: UIMessage, sessionId?: string) => void,
  ): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  async sendTyping(sessionId: string): Promise<void> {
    const ws = await this.connect();
    ws.send(JSON.stringify({ type: "typing", sessionId } satisfies ClientWSMessage));
  }

  async sendRead(sessionId: string, messageId: string): Promise<void> {
    const ws = await this.connect();
    ws.send(
      JSON.stringify({
        type: "read",
        sessionId,
        messageId,
      } satisfies ClientWSMessage),
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
