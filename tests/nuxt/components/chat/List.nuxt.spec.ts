import {
  mountSuspended,
  mockComponent,
  mockNuxtImport,
} from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import List from "~~/app/components/chat/List.vue";
import { createRoom } from "../../helpers/factories";

mockComponent("UDashboardSidebar", {
  template:
    "<aside data-testid=\"sidebar\"><slot name=\"header\" /><slot /></aside>",
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

mockComponent("UScrollArea", {
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  template: `
    <div data-testid="scroll-area">
      <template v-for="item in items" :key="item.id">
        <slot :item="item" />
      </template>
    </div>
  `,
});

mockComponent("UUser", {
  props: {
    description: {
      type: String,
      default: "",
    },
  },
  emits: ["click"],
  template: `
    <button
      data-testid="room-item"
      :data-description="description"
      @click="$emit('click')"
    >
      <slot name="name" />
      <span>{{ description }}</span>
    </button>
  `,
});

mockNuxtImport("useToast", () => () => ({
  add: vi.fn(),
}));

mockNuxtImport("useUserSession", () => () => ({
  user: {
    value: {
      id: "user-1",
    },
  },
  fetch: vi.fn(),
}));

describe("ChatList", () => {
  const createRoomTriggerStub = {
    template: '<div data-testid="create-room-trigger"><slot /></div>',
  };

  it("按搜索词过滤房间并在选择后关闭侧栏", async () => {
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2026-03-29T12:00:00.000Z").getTime(),
    );

    const wrapper = await mountSuspended(List, {
      global: {
        stubs: {
          CreateRoomTrigger: createRoomTriggerStub,
        },
      },
      props: {
        modelValue: null,
        open: true,
        rooms: [
          createRoom({
            id: "room-1",
            title: "Bot 讨论",
            lastMessage: "最近一条 BOT 消息",
            updatedAt: "2026-03-29T11:30:00.000Z",
          }),
          createRoom({
            id: "room-2",
            title: "产品设计",
            lastMessage: "同步视觉方案",
            updatedAt: "2026-03-29T09:00:00.000Z",
          }),
        ],
      },
    });

    expect(wrapper.text()).toContain("30 分钟前");
    expect(wrapper.text()).toContain("3 小时前");

    await wrapper.get('[data-testid="search-input"]').setValue("bot");

    const items = wrapper.findAll('[data-testid="room-item"]');
    expect(items).toHaveLength(1);
    expect(wrapper.text()).toContain("Bot 讨论");
    expect(wrapper.text()).not.toContain("产品设计");

    await items[0]!.trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["room-1"]]);
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });
});
