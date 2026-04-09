import {
  mountSuspended,
  mockComponent,
  mockNuxtImport,
} from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatCreate from "~~/app/components/chat/Create.vue";
import { createUser, createRoom } from "../../helpers/factories";

const triggerState = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  fetchMock: vi.fn(),
  currentUser: {
    value: {
      id: "owner-1",
    },
  },
}));

mockNuxtImport("useToast", () => () => ({
  add: triggerState.toastAdd,
}));

mockNuxtImport("useUserSession", () => () => ({
  user: triggerState.currentUser,
  fetch: vi.fn(),
}));

mockComponent("UCard", {
  template:
    '<div data-testid="card"><slot name="header" /><slot /><slot name="footer" /></div>',
});

mockComponent("UInput", {
  props: {
    modelValue: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  template: `
    <input
      data-testid="search-input"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
});

mockComponent("UButton", {
  emits: ["click"],
  template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
});

mockComponent("UAvatar", {
  template: '<span data-testid="avatar" />',
});

mockComponent("UserAvatar", {
  template: '<span data-testid="avatar" />',
});

mockComponent("UBadge", {
  template: "<span><slot /></span>",
});

mockComponent("UIcon", {
  template: '<span data-testid="icon" />',
});

function clickDocumentButtonByText(text: string) {
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.includes(text),
  );

  expect(button).toBeTruthy();
  button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("CreateRoomTrigger", () => {
  beforeEach(() => {
    triggerState.toastAdd.mockReset();
    triggerState.fetchMock.mockReset();
    triggerState.currentUser.value = {
      id: "owner-1",
    };

    vi.stubGlobal("$fetch", triggerState.fetchMock);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("传入成员时直接创建 direct 会话", async () => {
    triggerState.fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/chat/room") {
        return createRoom({
          id: "room-direct",
          type: "direct",
          title: "林 x 虾米",
          memberIds: ["owner-1", "bot-1"],
        });
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const wrapper = await mountSuspended(ChatCreate, {
      props: {
        memberIds: ["owner-1", "bot-1"],
      },
      slots: {
        default: '<button data-testid="trigger-button">创建会话</button>',
      },
    });

    await wrapper.get('[data-testid="trigger-button"]').trigger("click");
    await flushPromises();

    expect(triggerState.fetchMock).toHaveBeenCalledWith(
      "/api/chat/room",
      expect.objectContaining({
        method: "POST",
        body: {
          memberIds: ["bot-1"],
        },
      }),
    );
    expect(wrapper.emitted("created")).toEqual([
      [
        expect.objectContaining({
          id: "room-direct",
          type: "direct",
        }),
      ],
    ]);
  });

  it("未传成员时打开选择器并可创建 group 会话", async () => {
    const owner = createUser({
      id: "owner-1",
      username: "lin",
      nickname: "林",
    });
    const memberA = createUser({
      id: "user-2",
      username: "ming",
      nickname: "阿明",
    });
    const memberB = createUser({
      id: "user-3",
      type: "bot",
      username: "clawme-2",
      nickname: "阿虾",
      role: "助理",
    });

    triggerState.fetchMock.mockImplementation(async (
      url: string,
      options?: { method?: string; body?: unknown },
    ) => {
      if (url === "/api/users") {
        return [owner, memberA, memberB];
      }

      if (url === "/api/chat/room" && options?.method === "POST") {
        return createRoom({
          id: "room-group",
          type: "group",
          title: "多人讨论",
          memberIds: ["owner-1", "user-2", "user-3"],
        });
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    });

    const wrapper = await mountSuspended(ChatCreate, {
      slots: {
        default: '<button data-testid="trigger-button">创建会话</button>',
      },
    });

    await wrapper.get('[data-testid="trigger-button"]').trigger("click");
    await flushPromises();

    expect(triggerState.fetchMock).toHaveBeenCalledWith("/api/users");


    clickDocumentButtonByText("阿明");
    clickDocumentButtonByText("阿虾");
    await flushPromises();

    clickDocumentButtonByText("创建会话");
    await flushPromises();

    expect(triggerState.fetchMock).toHaveBeenCalledWith(
      "/api/chat/room",
      expect.objectContaining({
        method: "POST",
        body: {
          memberIds: ["user-2", "user-3"],
        },
      }),
    );
    expect(wrapper.emitted("created")).toEqual([
      [
        expect.objectContaining({
          id: "room-group",
          type: "group",
        }),
      ],
    ]);
  });
});
