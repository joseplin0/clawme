import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocketChatTransport } from "~~/app/composables/WebSocketChatTransport";

type MessageHandler = (event: { data: string }) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: MessageHandler | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = 1;
      this.onopen?.();
    });
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000, reason: "closed" });
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

describe("WebSocketChatTransport", () => {
  afterEach(() => {
    FakeWebSocket.instances = [];
    vi.unstubAllGlobals();
  });

  it("创建新会话并发送首条消息时使用 memberIds 协议字段", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);

    const transport = new WebSocketChatTransport({
      url: "ws://localhost:3000/api/ws/chat",
    });

    const result = await transport.sendMessageToMembers({
      memberIds: ["bot-1"],
      content: "你好",
    });

    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeTruthy();

    const payload = JSON.parse(socket!.sent[0] ?? "{}");
    expect(payload).toMatchObject({
      type: "send",
      memberIds: ["bot-1"],
      content: "你好",
    });
    expect(payload.targetUserId).toBeUndefined();

    socket!.emitMessage({
      type: "ack",
      requestId: payload.requestId,
      chatId: "room-1",
      roomId: "room-1",
    });

    await expect(result.roomId).resolves.toBe("room-1");
  });

  it("将 room-message chunk payload 路由到待处理流", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);

    const transport = new WebSocketChatTransport({
      url: "ws://localhost:3000/api/ws/chat",
    });

    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "room-1",
      messageId: undefined,
      messages: [{
        id: "user-message-1",
        role: "user",
        parts: [{ type: "text", text: "你好" }],
      }] as any,
      abortSignal: undefined,
    });

    const socket = FakeWebSocket.instances[0];
    const payload = JSON.parse(socket!.sent[0] ?? "{}");
    const reader = stream.getReader();

    socket!.emitMessage({
      type: "room-message",
      roomId: "room-1",
      requestId: payload.requestId,
      payload: {
        kind: "chunk",
        chunk: {
          type: "text-delta",
          id: "assistant-message-1",
          delta: "世界",
        },
      },
    });

    await expect(reader.read()).resolves.toMatchObject({
      done: false,
      value: {
        type: "text-delta",
        delta: "世界",
      },
    });

    socket!.emitMessage({
      type: "room-message",
      roomId: "room-1",
      requestId: payload.requestId,
      payload: {
        kind: "chunk",
        chunk: {
          type: "finish",
        },
      },
    });

    await expect(reader.read()).resolves.toMatchObject({
      done: false,
      value: {
        type: "finish",
      },
    });

    await expect(reader.read()).resolves.toEqual({
      done: true,
      value: undefined,
    });
  });

  it("将 room-message message payload 路由到消息回调", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);

    const transport = new WebSocketChatTransport({
      url: "ws://localhost:3000/api/ws/chat",
    });
    const callback = vi.fn();
    transport.onIncomingMessage(callback);

    await transport.sendMessageToMembers({
      memberIds: ["bot-1"],
      content: "你好",
    });

    const socket = FakeWebSocket.instances[0];
    socket!.emitMessage({
      type: "room-message",
      roomId: "room-1",
      payload: {
        kind: "message",
        message: {
          id: "assistant-message-1",
          role: "assistant",
          parts: [{ type: "text", text: "收到" }],
        },
      },
    });

    expect(callback).toHaveBeenCalledWith(
      "room-1",
      expect.objectContaining({
        id: "assistant-message-1",
      }),
      undefined,
    );
  });
});
