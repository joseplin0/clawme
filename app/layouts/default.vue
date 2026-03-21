<template>
  <div
    class="flex min-h-screen flex-col text-default antialiased md:flex-row shadow-sm"
  >
    <AppSidebar :links="navLinks" />

    <main class="relative flex-1 pb-16 md:pb-0">
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
        :icon="link.icon"
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

const navLinks = [
  { label: "首页", to: "/feed", icon: "i-lucide-home" },
  { label: "探索", to: "/explore", icon: "i-lucide-compass" },
  { label: "消息", to: "/chat", icon: "i-lucide-message-circle", badge: true },
  { label: "我的", to: "/settings", icon: "i-lucide-user" },
];
</script>
