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
});
