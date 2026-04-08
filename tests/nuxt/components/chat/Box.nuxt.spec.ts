import {
  mountSuspended,
  mockComponent,
  mockNuxtImport,
} from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Box from "~~/app/components/chat/Box.vue";
import { createUser, createRoom } from "../../helpers/factories";

const boxState = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  getUser: vi.fn(),
  fetchUsers: vi.fn().mockResolvedValue([]),
  setUsers: vi.fn(),
  onIncomingMessage: vi.fn(() => vi.fn()),
  onIncomingChunk: vi.fn(() => vi.fn()),
  currentUser: {
    value: {
      id: "owner-1",
    },
  },
  fetchMock: vi.fn(),
  chatInstances: [] as Array<{
    id: string;
    messages: unknown[];
    status: string;
    sendMessage: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("@ai-sdk/vue", () => ({
  Chat: class {
    id: string;
    messages: unknown[];
    status: string;
    sendMessage: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;

    constructor(options: { id: string; messages?: unknown[] }) {
      this.id = options.id;
      this.messages = options.messages ?? [];
      this.status = "ready";
      this.sendMessage = vi.fn();
      this.stop = vi.fn().mockResolvedValue(undefined);
      boxState.chatInstances.push(this);
    }
  },
}));

vi.mock("ai", () => ({
  getToolName: (part: { toolName?: string }) => part.toolName ?? "",
  isReasoningUIPart: () => false,
  isTextUIPart: (part: { type?: string }) => part.type === "text",
  isToolUIPart: () => false,
}));

vi.mock("@nuxt/ui/utils/ai", () => ({
  isReasoningStreaming: () => false,
  isToolStreaming: () => false,
}));

mockNuxtImport("useToast", () => () => ({
  add: boxState.toastAdd,
}));

mockNuxtImport("useUsers", () => () => ({
  getUser: boxState.getUser,
  fetchUsers: boxState.fetchUsers,
  setUsers: boxState.setUsers,
}));

mockNuxtImport("useGlobalChatClient", () => () => ({
  transport: {
    kind: "test-transport",
  },
  onIncomingMessage: boxState.onIncomingMessage,
  onIncomingChunk: boxState.onIncomingChunk,
}));

mockNuxtImport("useUserSession", () => () => ({
  user: boxState.currentUser,
  loggedIn: {
    value: true,
  },
  fetch: vi.fn(),
}));

mockComponent("UDashboardNavbar", {
  props: {
    title: {
      type: String,
      default: "",
    },
  },
  template:
    '<header data-testid="navbar" :data-title="title"><slot name="right" /></header>',
});

mockComponent("UButton", {
  template: "<button><slot /></button>",
});

mockComponent("UContainer", {
  template: '<div data-testid="container"><slot /></div>',
});

mockComponent("UChatMessages", {
  template:
    '<div data-testid="messages"><slot name="indicator" /><slot /></div>',
});

mockComponent("UChatShimmer", {
  template: '<div data-testid="shimmer" />',
});

mockComponent("UChatMessage", {
  template: '<article data-testid="message"><slot name="content" /></article>',
});

mockComponent("UChatReasoning", {
  template: "<div><slot /></div>",
});

mockComponent("UChatTool", {
  template: "<div />",
});

mockComponent("MDC", {
  template: "<div />",
});

mockComponent("MDCCached", {
  props: {
    value: {
      type: String,
      default: "",
    },
  },
  template: "<div>{{ value }}</div>",
});

mockComponent("ChatComposer", {
  props: {
    ready: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "ready",
    },
    placeholder: {
      type: String,
      default: "",
    },
    mentionItems: {
      type: Array,
      default: () => [],
    },
    quotedMessage: {
      type: Object,
      default: null,
    },
  },
  emits: ["submit", "stop", "reload", "clear-quote"],
  template: `
    <div
      data-testid="composer"
      :data-ready="String(ready)"
      :data-status="status"
      :data-placeholder="placeholder"
      :data-mention-count="String(mentionItems.length)"
    >
      <button
        data-testid="submit"
        @click="$emit('submit', { text: '问候', attachments: [], quotedMessageId: undefined, quotedExcerpt: undefined })"
      >
        提交
      </button>
      <button
        data-testid="submit-attachment"
        @click="$emit('submit', {
          text: '',
          attachments: [{
            type: 'file',
            assetId: 'asset-1',
            url: 'data:text/plain;base64,SGVsbG8=',
            mediaType: 'text/plain',
            filename: 'demo.txt',
            size: 5,
          }],
          quotedMessageId: undefined,
          quotedExcerpt: undefined,
        })"
      >
        附件提交
      </button>
      <button data-testid="stop" @click="$emit('stop')">停止</button>
    </div>
  `,
});

describe("ChatBox", () => {
  const createRoomTriggerStub = {
    template: '<div data-testid="create-room-trigger"><slot /></div>',
  };

  beforeEach(() => {
    const owner = createUser({
      id: "owner-1",
      username: "lin",
      nickname: "林",
    });
    const assistant = createUser({
      id: "bot-1",
      type: "bot",
      username: "clawme",
      nickname: "虾米",
      role: "本地助理",
    });

    const usersById = {
      [owner.id]: owner,
      [assistant.id]: assistant,
    };

    boxState.toastAdd.mockReset();
    boxState.getUser.mockReset();
    boxState.fetchUsers.mockClear();
    boxState.setUsers.mockClear();
    boxState.onIncomingMessage.mockClear();
    boxState.onIncomingChunk.mockClear();
    boxState.fetchMock.mockReset();
    boxState.chatInstances.length = 0;
    boxState.currentUser.value = {
      id: owner.id,
    };

    boxState.getUser.mockImplementation((id: string) => usersById[id]);
    boxState.fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/chat/room/room-1") {
        return {
          id: "room-1",
          title: "产品讨论",
          members: [owner, assistant],
          messages: [],
        };
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    vi.stubGlobal("$fetch", boxState.fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("初始化房间后向 ChatComposer 传递上下文并转发提交动作", async () => {
    const wrapper = await mountSuspended(Box, {
      global: {
        stubs: {
          ChatCreateRoomTrigger: createRoomTriggerStub,
        },
      },
      props: {
        activeRoomId: "room-1",
        rooms: [
          createRoom({
            id: "room-1",
            title: "产品讨论",
            memberIds: ["owner-1", "bot-1"],
          }),
        ],
      },
    });

    await flushPromises();

    expect(boxState.fetchMock).toHaveBeenCalledWith("/api/chat/room/room-1");
    expect(boxState.setUsers).toHaveBeenCalledTimes(1);
    expect(boxState.chatInstances).toHaveLength(1);

    const composer = wrapper.get('[data-testid="composer"]');
    expect(composer.attributes("data-ready")).toBe("true");
    expect(composer.attributes("data-mention-count")).toBe("1");

    await wrapper.get('[data-testid="submit"]').trigger("click");

    expect(boxState.chatInstances[0]!.sendMessage).toHaveBeenCalledWith({
      parts: [{ type: "text", text: "问候" }],
      metadata: expect.objectContaining({
        userId: "owner-1",
        quotedMessageId: undefined,
        quotedExcerpt: undefined,
      }),
    });

    await wrapper.get('[data-testid="stop"]').trigger("click");
    expect(boxState.chatInstances[0]!.stop).toHaveBeenCalledTimes(1);
  });

  it("group 房间允许提交消息并复用同一套发送链路", async () => {
    boxState.fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/chat/room/room-group") {
        const owner = createUser({
          id: "owner-1",
          username: "lin",
          nickname: "林",
        });
        const assistant = createUser({
          id: "bot-1",
          type: "bot",
          username: "clawme",
          nickname: "虾米",
          role: "本地助理",
        });

        return {
          id: "room-group",
          title: "多人讨论",
          members: [owner, assistant],
          messages: [],
        };
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const wrapper = await mountSuspended(Box, {
      global: {
        stubs: {
          ChatCreateRoomTrigger: createRoomTriggerStub,
        },
      },
      props: {
        activeRoomId: "room-group",
        rooms: [
          createRoom({
            id: "room-group",
            type: "group",
            title: "多人讨论",
            memberIds: ["owner-1", "bot-1", "actor-2"],
          }),
        ],
      },
    });

    await flushPromises();

    const composer = wrapper.get('[data-testid="composer"]');
    expect(composer.attributes("data-ready")).toBe("true");

    await wrapper.get('[data-testid="submit"]').trigger("click");

    expect(boxState.chatInstances[0]!.sendMessage).toHaveBeenCalledWith({
      parts: [{ type: "text", text: "问候" }],
      metadata: expect.objectContaining({
        userId: "owner-1",
        quotedMessageId: undefined,
        quotedExcerpt: undefined,
      }),
    });
    expect(boxState.toastAdd).not.toHaveBeenCalled();
  });

  it("允许发送仅包含附件的消息", async () => {
    const wrapper = await mountSuspended(Box, {
      global: {
        stubs: {
          ChatCreateRoomTrigger: createRoomTriggerStub,
        },
      },
      props: {
        activeRoomId: "room-1",
        rooms: [
          createRoom({
            id: "room-1",
            title: "产品讨论",
            memberIds: ["owner-1", "bot-1"],
          }),
        ],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="submit-attachment"]').trigger("click");

    expect(boxState.chatInstances[0]!.sendMessage).toHaveBeenCalledWith({
      parts: [
        {
          type: "file",
          assetId: "asset-1",
          url: "data:text/plain;base64,SGVsbG8=",
          mediaType: "text/plain",
          filename: "demo.txt",
          size: 5,
        },
      ],
      metadata: expect.objectContaining({
        userId: "owner-1",
        quotedMessageId: undefined,
        quotedExcerpt: undefined,
      }),
    });
    expect(boxState.toastAdd).not.toHaveBeenCalled();
  });
});
