import { mountSuspended, mockComponent, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MomentPage from "~~/app/pages/moment/index.vue";

const pageState = vi.hoisted(() => ({
  route: {
    path: "/moment",
    query: {} as Record<string, string>,
  },
  routerPush: vi.fn(),
  fetchMock: vi.fn(),
}));
const route = reactive(pageState.route);

pageState.routerPush.mockImplementation(async (to: any) => {
  if (to?.query) {
    Object.assign(route.query, to.query);
  }
});

mockNuxtImport("useRoute", () => () => route as any);
mockNuxtImport("useRouter", () => () => ({
  replace: async (to: any) => {
    if (to?.query) {
      Object.assign(route.query, to.query);
    }
  },
  push: pageState.routerPush,
}));

mockComponent("MomentCard", {
  props: {
    moment: {
      type: Object,
      default: () => ({}),
    },
  },
  template: '<article data-testid="moment-card">{{ moment.id }}</article>',
});

mockComponent("PinCard", {
  props: {
    pin: {
      type: Object,
      default: () => ({}),
    },
  },
  template: '<article data-testid="pin-card">{{ pin.id }}</article>',
});

mockComponent("UInput", {
  props: {
    modelValue: {
      type: String,
      default: "",
    },
  },
  template: '<input data-testid="search-input" :value="modelValue" />',
});

mockComponent("UButton", {
  props: {
    label: {
      type: String,
      default: "",
    },
  },
  template: '<button type="button" :data-label="label"><slot>{{ label }}</slot></button>',
});

mockComponent("UColorModeButton", {
  template: '<button type="button" data-testid="color-mode-button" />',
});

mockComponent("UIcon", {
  props: {
    name: {
      type: String,
      default: "",
    },
  },
  template: '<i data-testid="icon" :data-name="name" />',
});

describe("moment content center", () => {
  beforeEach(() => {
    route.query = {};
    pageState.routerPush.mockClear();
    pageState.fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("根据 query.tab 在动态流和采集流之间切换", async () => {
    pageState.fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/moment") {
        return {
          list: [{ id: "moment-1", title: "动态 1" }],
          pageNum: 1,
          pageSize: 20,
          total: 1,
        };
      }

      if (url === "/api/pins") {
        return {
          list: [{ id: "pin-1", title: "采集 1" }],
          pageNum: 1,
          pageSize: 20,
          total: 1,
        };
      }

      throw new Error(`Unexpected fetch url: ${url}`);
    });

    vi.stubGlobal("$fetch", pageState.fetchMock);

    const wrapper = await mountSuspended(MomentPage);
    await flushPromises();

    expect(pageState.fetchMock).toHaveBeenCalledWith(
      "/api/moment",
      expect.objectContaining({
        query: {
          page: 1,
          limit: 20,
        },
      }),
    );
    expect(wrapper.findAll('[data-testid="moment-card"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="pin-card"]').exists()).toBe(false);

    await wrapper.get('button[data-label="采集"]').trigger("click");
    await flushPromises();

    expect(pageState.routerPush).toHaveBeenCalledWith({
      query: {
        tab: "pins",
      },
    });
    expect(pageState.fetchMock).toHaveBeenCalledWith(
      "/api/pins",
      expect.objectContaining({
        query: {
          page: 1,
          limit: 20,
        },
      }),
    );
    expect(wrapper.findAll('[data-testid="pin-card"]')).toHaveLength(1);
  });

  it("初始 query.tab = pins 时直接加载采集流", async () => {
    route.query = { tab: "pins" };
    pageState.fetchMock.mockResolvedValue({
      list: [{ id: "pin-1", title: "采集 1" }],
      pageNum: 1,
      pageSize: 20,
      total: 1,
    });

    vi.stubGlobal("$fetch", pageState.fetchMock);

    const wrapper = await mountSuspended(MomentPage);
    await flushPromises();

    expect(pageState.fetchMock).toHaveBeenCalledWith(
      "/api/pins",
      expect.objectContaining({
        query: {
          page: 1,
          limit: 20,
        },
      }),
    );
    expect(wrapper.findAll('[data-testid="pin-card"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="moment-card"]').exists()).toBe(false);
  });
});
