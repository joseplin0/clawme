<template>
  <div
    :class="[
      'flex flex-col text-default antialiased shadow-sm md:flex-row',
      isChatRoute ? 'h-dvh overflow-hidden' : 'min-h-screen',
    ]"
  >
    <AppSidebar :links="navLinks" />

    <main
      :class="[
        'relative flex-1 pb-16 md:pb-0',
        isChatRoute ? 'flex min-h-0 min-w-0 overflow-hidden' : '',
      ]"
    >
      <slot />
    </main>

    <nav
      v-if="navLinks"
      class="flex h-16 shrink-0 items-center justify-around border-t border-muted/70 bg-white/90 dark:bg-[#140e0c]/90 pb-safe shadow-[0_-16px_48px_-36px_rgba(100,50,32,0.35)] dark:shadow-none backdrop-blur md:hidden z-50 fixed bottom-0 left-0 right-0"
    >
      <UButton
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        :icon="route.path === link.to ? link.activeIcon : link.icon"
        variant="ghost"
        color="neutral"
        size="xl"
        class="w-full justify-center rounded-xl p-2 text-toned relative"
        :active="route.path === link.to"
        active-class="text-primary"
      >
        <span
          v-if="link.badge"
          class="absolute top-2 right-1/2 -mr-3 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#140e0c]"
        ></span>
      </UButton>
    </nav>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const isChatRoute = computed(() => route.path === "/chat");

const navLinks = [
  {
    label: "首页",
    to: "/moment",
    icon: "cm-waterfalls-h",
    activeIcon: "cm-waterfalls-h-fill",
  },
  {
    label: "消息",
    to: "/chat",
    icon: "ph-chat-circle-bold",
    activeIcon: "ph-chat-circle-fill",
    badge: true,
  },
  {
    label: "我的",
    to: "/settings",
    icon: "ph-user-bold",
    activeIcon: "ph-user-fill",
  },
];
</script>
