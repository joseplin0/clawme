import { beforeAll, describe, expect, it, vi } from "vitest";

let createHandleMessageSend: typeof import("~~/server/api/ws/chat").createHandleMessageSend;

beforeAll(async () => {
  vi.stubGlobal("defineWebSocketHandler", (handler: unknown) => handler);
  ({ createHandleMessageSend } = await import("~~/server/api/ws/chat"));
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

describe("ws chat send routing", () => {
  it("direct-human 消息推送给单个接收者，并向发送方补 finish", async () => {
    const peer = {
      send: vi.fn(),
    };
    const publishRoomMessage = vi.fn();
    const publishRoomChunk = vi.fn();
    const publishWsError = vi.fn();

    const handleMessageSend = createHandleMessageSend({
      prepareRoomMessage: vi.fn().mockResolvedValue(createPreparedMessage()),
      createAssistantMessageStreamFromRoom: vi.fn(),
      publishRoomMessage,
      publishRoomChunk,
      publishWsError,
      launchBackgroundTask: vi.fn(),
    } as any);

    await handleMessageSend(peer, {
      type: "send",
      requestId: "req-1",
      roomId: "room-1",
      content: "你好",
    }, "sender-1");

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
    expect(peer.send).not.toHaveBeenCalled();
    expect(publishWsError).not.toHaveBeenCalled();
  });

  it("direct-bot 消息启动后台流，并将 chunk 推给发送方", async () => {
    const peer = {
      send: vi.fn(),
    };
    const publishRoomMessage = vi.fn();
    const publishRoomChunk = vi.fn();
    const publishWsError = vi.fn();
    const backgroundTasks: Promise<void>[] = [];
    const assistantTargetUser = {
      id: "bot-1",
      type: "bot",
      username: "bot",
      nickname: "Bot",
      avatar: null,
      intro: null,
      role: null,
      catchphrase: null,
      mbti: null,
      currentMood: "平静",
      createdById: null,
      passwordHash: null,
      apiSecret: null,
      modelConfigId: null,
      callbackUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      modelConfig: null,
    } as any;

    const handleMessageSend = createHandleMessageSend({
      prepareRoomMessage: vi.fn().mockResolvedValue(createPreparedMessage({
        recipientUserIds: ["bot-1"],
        assistantTargetUser,
      })),
      createAssistantMessageStreamFromRoom: vi.fn().mockResolvedValue({
        stream: (async function* () {
          yield {
            type: "text-delta",
            id: "assistant-message-1",
            delta: "收到",
          };
          yield {
            type: "finish",
          };
        })(),
        completed: Promise.resolve(),
      }),
      publishRoomMessage,
      publishRoomChunk,
      publishWsError,
      launchBackgroundTask(task: Promise<void>) {
        backgroundTasks.push(task);
      },
    } as any);

    await handleMessageSend(peer, {
      type: "send",
      requestId: "req-2",
      roomId: "room-1",
      content: "你好",
    }, "sender-1");

    expect(backgroundTasks).toHaveLength(1);
    await backgroundTasks[0];

    expect(publishRoomMessage).not.toHaveBeenCalled();
    expect(publishRoomChunk).toHaveBeenNthCalledWith(1, ["sender-1"], {
      roomId: "room-1",
      requestId: "req-2",
      chunk: {
        type: "text-delta",
        id: "assistant-message-1",
        delta: "收到",
      },
    });
    expect(publishRoomChunk).toHaveBeenNthCalledWith(2, ["sender-1"], {
      roomId: "room-1",
      requestId: "req-2",
      chunk: {
        type: "finish",
      },
    });
    expect(publishWsError).not.toHaveBeenCalled();
  });

  it("group 消息广播给其他成员，不触发 assistant provider", async () => {
    const peer = {
      send: vi.fn(),
    };
    const publishRoomMessage = vi.fn();
    const publishRoomChunk = vi.fn();
    const publishWsError = vi.fn();
    const createAssistantMessageStreamFromRoom = vi.fn();

    const handleMessageSend = createHandleMessageSend({
      prepareRoomMessage: vi.fn().mockResolvedValue(createPreparedMessage({
        roomType: "group",
        recipientUserIds: ["user-2", "user-3"],
      })),
      createAssistantMessageStreamFromRoom,
      publishRoomMessage,
      publishRoomChunk,
      publishWsError,
      launchBackgroundTask: vi.fn(),
    } as any);

    await handleMessageSend(peer, {
      type: "send",
      requestId: "req-3",
      roomId: "room-1",
      content: "群消息",
    }, "sender-1");

    expect(publishRoomMessage).toHaveBeenCalledWith(["user-2", "user-3"], {
      roomId: "room-1",
      message: expect.objectContaining({
        id: "user-message-1",
      }),
    });
    expect(publishRoomChunk).toHaveBeenCalledWith(["sender-1"], {
      roomId: "room-1",
      requestId: "req-3",
      chunk: {
        type: "finish",
      },
    });
    expect(createAssistantMessageStreamFromRoom).not.toHaveBeenCalled();
    expect(publishWsError).not.toHaveBeenCalled();
  });
});
