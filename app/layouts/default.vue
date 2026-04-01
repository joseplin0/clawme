<template>
  <div
    :class="[
      'flex flex-col text-default antialiased md:flex-row bg-default',
      isChatRoute ? 'h-dvh overflow-hidden' : 'min-h-screen',
    ]"
  >
    <!-- Desktop Sidebar -->
    <AppSidebar :links="navLinks" />

    <!-- Main Content -->
    <main
      :class="[
        'relative flex-1 pb-[calc(env(safe-area-inset-bottom)+3.5rem)] md:pb-0',
        isChatRoute ? 'flex min-h-0 min-w-0 overflow-hidden' : '',
      ]"
    >
      <slot />
    </main>

    <!-- Mobile Bottom Navigation (WeChat/Telegram Style) -->
    <nav
      v-if="navLinks"
      class="flex h-14 shrink-0 items-center justify-around border-t border-default/50 bg-default/85 md:hidden z-50 fixed bottom-0 left-0 right-0 backdrop-blur-xl transition-all duration-300 pb-safe"
    >
      <NuxtLink
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="relative flex flex-col items-center justify-center w-full h-full gap-0.5 group"
      >
        <div class="relative flex items-center justify-center p-1">
          <!-- Notification Badge -->
          <div
            v-if="link.badge"
            class="absolute top-0 right-0 size-2.5 rounded-full bg-error ring-2 ring-default shadow-sm"
          />
          <!-- Icon -->
          <UIcon
            :name="route.path === link.to ? (link.activeIcon || link.icon) : link.icon"
            class="text-[22px] transition-all duration-200"
            :class="[
              route.path === link.to
                ? 'text-primary scale-110'
                : 'text-muted group-hover:text-default',
            ]"
          />
        </div>
        <!-- Label -->
        <span
          class="text-[10px] font-medium leading-none transition-colors duration-200"
          :class="route.path === link.to ? 'text-primary' : 'text-muted group-hover:text-default'"
        >
          {{ link.label }}
        </span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const isChatRoute = computed(() => route.path === "/chat" || route.path.startsWith("/chat/"));

const navLinks = [
  {
    label: "消息",
    to: "/chat",
    icon: "i-ph-chat-circle",
    activeIcon: "i-ph-chat-circle-fill",
    badge: true,
  },
  {
    label: "时刻",
    to: "/moment",
    icon: "i-ph-compass", // "cm-waterfalls-h" or other outline version if not standard
    activeIcon: "i-ph-compass-fill",
  },
  {
    label: "我的",
    to: "/settings",
    icon: "i-ph-user",
    activeIcon: "i-ph-user-fill",
  },
];
</script>
