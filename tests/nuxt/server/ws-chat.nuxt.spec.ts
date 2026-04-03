import { beforeAll, describe, expect, it, vi } from "vitest";

let sendRoomMessage: typeof import("~~/server/chat/core").sendRoomMessage;
let prepareRoomMessage: typeof import("~~/server/chat/chat-command.service").prepareRoomMessage;

beforeAll(async () => {
  vi.stubGlobal("defineWebSocketHandler", (handler: unknown) => handler);
  ({ sendRoomMessage } = await import("~~/server/chat/core"));
  ({ prepareRoomMessage } = await import("~~/server/chat/chat-command.service"));
});

function createPreparedMessage(overrides: Record<string, unknown> = {}) {
  return {
    activeRoomId: "room-1",
    roomType: "direct",
    userMessage: {
      id: "user-message-1",
    },
    uiMessage: {
      id: "user-message-1",
      role: "user",
      parts: [{ type: "text", text: "你好" }],
      metadata: {
        userId: "sender-1",
        createdAt: Date.now(),
      },
    },
    recipientUserIds: ["user-2"],
    assistantTargetUser: undefined,
    ...overrides,
  };
}

describe("sendRoomMessage", () => {
  it("direct-human 消息推送给单个接收者，并向发送方补 finish", async () => {
    const publishRoomMessage = vi.fn();
    const publishRoomChunk = vi.fn();

    vi.mocked(prepareRoomMessage).mockResolvedValue(createPreparedMessage() as any);

    vi.doMock("~~/server/utils/ws-event-bus", () => ({
      publishRoomMessage,
      publishRoomChunk,
      publishWsError: vi.fn(),
    }));

    await sendRoomMessage({
      senderId: "sender-1",
      roomId: "room-1",
      content: "你好",
      requestId: "req-1",
    });

    expect(publishRoomMessage).toHaveBeenCalledWith(["user-2"], {
      roomId: "room-1",
      message: expect.objectContaining({
        id: "user-message-1",
      }),
    });
    expect(publishRoomChunk).toHaveBeenCalledWith(["sender-1"], {
      roomId: "room-1",
      requestId: "req-1",
      chunk: {
        type: "finish",
      },
    });
  });
});
