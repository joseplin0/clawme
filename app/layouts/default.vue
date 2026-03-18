<template>
  <div class="flex min-h-screen flex-col bg-transparent text-default antialiased md:flex-row">
    <nav
      class="hidden w-[88px] shrink-0 flex-col justify-between border-r border-muted/70 bg-white/80 px-4 py-6 shadow-[0_30px_90px_-48px_rgba(100,50,32,0.35)] backdrop-blur md:flex"
    >
      <div class="flex flex-col items-center gap-8">
        <NuxtLink
          to="/feed"
          class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20 transition-transform duration-300 hover:-translate-y-0.5"
        >
          <UIcon name="i-lucide-shell" class="size-6" />
        </NuxtLink>
        <span class="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
          Clawme
        </span>
      </div>

      <div class="flex flex-col gap-5">
        <UTooltip text="探索动态" :content="{ side: 'right' }">
          <UButton
            to="/feed"
            icon="i-lucide-layout-grid"
            variant="ghost"
            color="neutral"
            size="lg"
            class="rounded-2xl text-toned transition-transform duration-300 hover:-translate-y-0.5"
            :active="route.path === '/feed'"
            active-class="bg-primary/10 text-primary"
          />
        </UTooltip>
        <UTooltip text="会话沟通" :content="{ side: 'right' }">
          <UButton
            to="/chat"
            icon="i-lucide-message-circle"
            variant="ghost"
            color="neutral"
            size="lg"
            class="rounded-2xl text-toned transition-transform duration-300 hover:-translate-y-0.5"
            :active="route.path === '/chat'"
            active-class="bg-primary/10 text-primary"
          />
        </UTooltip>
        <UTooltip text="系统设置" :content="{ side: 'right' }">
          <UButton
            to="/settings"
            icon="i-lucide-settings"
            variant="ghost"
            color="neutral"
            size="lg"
            class="rounded-2xl text-toned transition-transform duration-300 hover:-translate-y-0.5"
            :active="route.path === '/settings'"
            active-class="bg-primary/10 text-primary"
          />
        </UTooltip>
      </div>

      <div class="flex flex-col items-center gap-3">
        <div class="rounded-[1.5rem] bg-muted/80 p-2 ring-1 ring-muted">
          <UAvatar
            size="md"
            :ui="{ root: 'bg-gradient-to-br from-clawme-500 via-clawme-400 to-amber-300' }"
          />
        </div>
        <span class="text-[11px] font-medium text-muted">Owner</span>
      </div>
    </nav>

    <main class="relative flex-1 overflow-hidden bg-transparent">
      <slot />
    </main>

    <nav
      class="flex h-16 shrink-0 items-center justify-around border-t border-muted/70 bg-white/90 pb-safe shadow-[0_-16px_48px_-36px_rgba(100,50,32,0.35)] backdrop-blur md:hidden"
    >
      <UButton
        to="/feed"
        icon="i-lucide-layout-grid"
        variant="ghost"
        color="neutral"
        size="xl"
        class="w-full justify-center rounded-xl p-2 text-toned"
        :active="route.path === '/feed'"
        active-class="text-primary"
      />
      <UButton
        to="/chat"
        icon="i-lucide-message-circle"
        variant="ghost"
        color="neutral"
        size="xl"
        class="w-full justify-center rounded-xl p-2 text-toned"
        :active="route.path === '/chat'"
        active-class="text-primary"
      />
      <UButton
        to="/settings"
        icon="i-lucide-settings"
        variant="ghost"
        color="neutral"
        size="xl"
        class="w-full justify-center rounded-xl p-2 text-toned"
        :active="route.path === '/settings'"
        active-class="text-primary"
      />
    </nav>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
