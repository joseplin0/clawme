import { mountSuspended, mockComponent, mockNuxtImport } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";
import AppSidebar from "~~/app/components/AppSidebar.vue";

const sidebarState = vi.hoisted(() => ({
  route: {
    path: "/moment",
  },
}));

mockNuxtImport("useRoute", () => () => sidebarState.route);
mockNuxtImport("useUserSession", () => () => ({
  user: {
    value: {
      id: "owner-1",
    },
  },
}));

mockComponent("NuxtLink", {
  props: {
    to: {
      type: [String, Object],
      default: undefined,
    },
  },
  template:
    "<a :href=\"typeof to === 'string' ? to : '#'\" v-bind=\"$attrs\"><slot /></a>",
});

mockComponent("USidebar", {
  template:
    "<aside data-testid=\"sidebar\"><slot name=\"header\" /><slot /><slot name=\"footer\" /></aside>",
});

mockComponent("UScrollArea", {
  template: "<div data-testid=\"scroll-area\"><slot /></div>",
});

mockComponent("UChip", {
  props: {
    show: {
      type: Boolean,
      default: false,
    },
  },
  template:
    "<div data-testid=\"chip\" :data-show=\"String(show)\"><slot /></div>",
});

mockComponent("UIcon", {
  props: {
    name: {
      type: String,
      default: "",
    },
  },
  template: "<i data-testid=\"icon\" :data-name=\"name\" />",
});

mockComponent("UButton", {
  props: {
    to: {
      type: String,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
  },
  template:
    "<button :title=\"title\" data-testid=\"u-button\"><slot>{{ label }}</slot></button>",
});

mockComponent("UAvatar", {
  template: "<div data-testid=\"avatar\" />",
});

mockComponent("UserAvatar", {
  template: "<div data-testid=\"avatar\" />",
});

mockComponent("UDropdownMenu", {
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  template: `
    <div data-testid="dropdown-menu">
      <slot />
      <div data-testid="dropdown-content">
        <template v-for="(group, groupIndex) in items" :key="groupIndex">
          <template v-for="(item, itemIndex) in group" :key="itemIndex">
            <slot v-if="item.slot" :name="item.slot" :item="item" />
            <div v-else>{{ item.label }}</div>
          </template>
        </template>
      </div>
    </div>
  `,
});

mockComponent("UColorModeSwitch", {
  template: "<div data-testid=\"color-mode-switch\" />",
});

describe("AppSidebar", () => {
  it("高亮当前路由并显示激活图标", async () => {
    const onRefresh = vi.fn();

    const wrapper = await mountSuspended(AppSidebar, {
      props: {
        links: [
          {
            label: "动态",
            to: "/moment",
            icon: "i-lucide-sparkles",
            activeIcon: "i-lucide-sparkles-filled",
            badge: 2,
          },
          {
            label: "聊天",
            to: "/chat",
            icon: "i-lucide-message-circle",
          },
          {
            label: "刷新",
            icon: "i-lucide-rotate-cw",
            onClick: onRefresh,
          },
        ],
      },
    });

    const activeLink = wrapper.get('a[title="动态"]');
    const inactiveLink = wrapper.get('a[title="聊天"]');

    expect(activeLink.classes()).toContain("text-primary");
    expect(
      activeLink.get('[data-testid="icon"]').attributes("data-name"),
    ).toBe("i-lucide-sparkles-filled");
    expect(
      inactiveLink.get('[data-testid="icon"]').attributes("data-name"),
    ).toBe("i-lucide-message-circle");
    expect(
      activeLink.find("span.bg-red-500").exists(),
    ).toBe(true);

    await wrapper.get('[title="刷新"]').trigger("click");
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("显示底部更多菜单并支持主题切换", async () => {
    const wrapper = await mountSuspended(AppSidebar, {
      props: {
        links: [
          {
            label: "消息",
            to: "/chat",
            icon: "i-ph-chat-circle",
          },
        ],
      },
    });

    expect(wrapper.text()).toContain("主题");
    expect(wrapper.text()).toContain("设置");
    expect(wrapper.find('[data-testid="color-mode-switch"]').exists()).toBe(true);
    expect(wrapper.find('[title="更多"]').exists()).toBe(true);
  });
});
