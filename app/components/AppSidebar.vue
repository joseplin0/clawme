<template>
  <aside
    class="hidden w-14 shrink-0 border-r border-default/50 md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:self-start">
    <!-- 顶部：用户头像 -->
    <div class="flex items-center justify-center h-14 shrink-0">
      <UserAvatar
        :user-id="sessionUserId"
        size="sm"
        refresh-on-mount
        profile-card-side="right"
        profile-card-align="start"
        :profile-card-side-offset="14"
        :ui="{ root: 'ring-2 ring-transparent transition-all duration-200 hover:ring-primary' }"
      />
    </div>

    <!-- 分割线 -->
    <div class="h-px mx-3 bg-default/50" />

    <!-- 导航图标 -->
    <nav class="flex flex-1 flex-col items-center gap-1 px-2 py-3">
      <component
        :is="link.to ? NuxtLink : 'button'"
        v-for="(link, index) in links"
        :key="link.to || index"
        :to="link.to"
        :prefetch="true"
        :title="link.label"
        :class="[
          'relative flex items-center justify-center size-10 rounded-xl cursor-pointer transition-all duration-200',
          isActiveLink(link)
            ? 'text-primary'
            : 'text-muted hover:text-default hover:bg-elevated',
        ]"
        @click="link.onClick?.($event)"
      >
        <!-- 未读提示点 -->
        <span v-if="link.badge" class="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-default" />
        <UIcon :name="isActiveLink(link) ? (link.activeIcon || link.icon) : link.icon" class="text-xl" />
      </component>
    </nav>

    <!-- 底部：功能菜单 -->
    <div class="flex shrink-0 items-center justify-center p-3">
      <UDropdownMenu
        :items="menuItems"
        :content="{
          side: 'right',
          align: 'end',
          sideOffset: 12,
        }"
        :ui="{
          content: 'min-w-56 rounded-2xl border border-default/70 bg-default/95 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur',
          item: 'rounded-xl',
          separator: 'my-2',
        }"
      >
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="ghost"
          square
          title="更多"
          class="size-10 rounded-xl text-muted hover:text-default"
        />

        <template #theme-switch>
          <div class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5" @click.stop>
            <p class="text-sm font-medium text-default">主题</p>
            <UColorModeSwitch />
          </div>
        </template>
      </UDropdownMenu>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DropdownMenuItem } from "@nuxt/ui";

interface MenuItem {
  label: string;
  to?: string;
  icon: string;
  activeIcon?: string;
  badge?: boolean | string | number;
  onClick?: (e: MouseEvent) => void;
}

defineProps<{
  links: MenuItem[];
}>();

const route = useRoute();
const { user } = useUserSession();
const NuxtLink = resolveComponent("NuxtLink");
const sessionUserId = computed(() => user.value?.id ?? null);
const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      slot: "theme-switch",
      type: "label",
      class: "px-0 data-[highlighted]:bg-transparent",
    },
  ],
  [
    {
      label: "设置",
      icon: "i-lucide-settings-2",
      to: "/settings/general",
    },
  ],
]);

function isActiveLink(link: MenuItem) {
  if (!link.to) {
    return false;
  }

  return route.path === link.to || (link.to !== "/" && route.path.startsWith(`${link.to}/`));
}
</script>
