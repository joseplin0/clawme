import { beforeAll, describe, expect, it, vi } from "vitest";

let sendRoomMessage: typeof import("~~/server/chat/core").sendRoomMessage;
let chatCommandService: typeof import("~~/server/chat/chat-command.service");
let wsEventBus: typeof import("~~/server/utils/ws-event-bus");

beforeAll(async () => {
  vi.stubGlobal("defineWebSocketHandler", (handler: unknown) => handler);
  ({ sendRoomMessage } = await import("~~/server/chat/core"));
  chatCommandService = await import("~~/server/chat/chat-command.service");
  wsEventBus = await import("~~/server/utils/ws-event-bus");
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
    const publishRoomMessage = vi
      .spyOn(wsEventBus, "publishRoomMessage")
      .mockImplementation(() => {});
    const publishRoomChunk = vi
      .spyOn(wsEventBus, "publishRoomChunk")
      .mockImplementation(() => {});

    vi.spyOn(chatCommandService, "prepareRoomMessage").mockResolvedValue(
      createPreparedMessage() as any,
    );

    await sendRoomMessage({
      senderId: "sender-1",
      roomId: "room-1",
      clientMessage: {
        id: "user-message-1",
        role: "user",
        parts: [{ type: "text", text: "你好" }],
      },
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

  it("附件消息也会被透传给接收者", async () => {
    const publishRoomMessage = vi
      .spyOn(wsEventBus, "publishRoomMessage")
      .mockImplementation(() => {});

    vi.spyOn(chatCommandService, "prepareRoomMessage").mockResolvedValue(
      createPreparedMessage({
        uiMessage: {
          id: "user-message-attachment-1",
          role: "user",
          parts: [{
            type: "file",
            url: "data:text/plain;base64,SGVsbG8=",
            mediaType: "text/plain",
            filename: "demo.txt",
            size: 5,
          }],
          metadata: {
            userId: "sender-1",
            createdAt: Date.now(),
          },
        },
      }) as any,
    );

    await sendRoomMessage({
      senderId: "sender-1",
      roomId: "room-1",
      clientMessage: {
        id: "user-message-attachment-1",
        role: "user",
        parts: [{
          type: "file",
          url: "data:text/plain;base64,SGVsbG8=",
          mediaType: "text/plain",
          filename: "demo.txt",
          size: 5,
        }],
      } as any,
    });

    expect(publishRoomMessage).toHaveBeenCalledTimes(1);
    expect(publishRoomMessage.mock.calls[0]).toMatchObject([
      ["user-2"],
      {
        roomId: "room-1",
        message: {
          parts: [{
            type: "file",
            filename: "demo.txt",
          }],
        },
      },
    ]);
  });
});
