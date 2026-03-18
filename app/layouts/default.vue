<template>
  <div class="flex h-screen bg-[#F3F4F6] flex-col md:flex-row font-sans text-gray-900 antialiased selection:bg-blue-200">
    <!-- Sidebar for md and up -->
    <nav class="hidden md:flex flex-col w-[72px] bg-white border-r border-gray-200/60 justify-between items-center py-6 flex-shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-20">
      <div class="flex flex-col gap-8 w-full items-center">
        <UTooltip text="探索动态" :content="{ side: 'right' }">
          <UButton
            to="/feed"
            icon="i-lucide-layout-grid"
            variant="ghost"
            color="neutral"
            size="lg"
            class="rounded-2xl"
            :active="route.path === '/feed'"
            active-class="text-blue-600 bg-blue-50"
          />
        </UTooltip>
        <UTooltip text="会话沟通" :content="{ side: 'right' }">
          <UButton
            to="/chat"
            icon="i-lucide-message-circle"
            variant="ghost"
            color="neutral"
            size="lg"
            class="rounded-2xl"
            :active="route.path === '/chat'"
            active-class="text-blue-600 bg-blue-50"
          />
        </UTooltip>
        <UTooltip text="系统设置" :content="{ side: 'right' }">
          <UButton
            to="/settings"
            icon="i-lucide-settings"
            variant="ghost"
            color="neutral"
            size="lg"
            class="rounded-2xl"
            :active="route.path === '/settings'"
            active-class="text-blue-600 bg-blue-50"
          />
        </UTooltip>
      </div>
      <div class="mb-2">
        <button class="relative hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <UAvatar :ui="{ wrapper: 'bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500' }" />
        </button>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-hidden relative shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] bg-[#FAFAFA]">
      <slot />
    </main>

    <!-- Bottom Tab Navigation for sm and below -->
    <nav class="md:hidden flex h-16 bg-white/90 backdrop-blur-md border-t border-gray-200/80 justify-around items-center flex-shrink-0 z-50 pb-safe shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)]">
      <UButton
        to="/feed"
        icon="i-lucide-layout-grid"
        variant="ghost"
        color="neutral"
        size="xl"
        class="rounded-xl p-2 w-full justify-center"
        :active="route.path === '/feed'"
        active-class="text-blue-600"
      />
      <UButton
        to="/chat"
        icon="i-lucide-message-circle"
        variant="ghost"
        color="neutral"
        size="xl"
        class="rounded-xl p-2 w-full justify-center"
        :active="route.path === '/chat'"
        active-class="text-blue-600"
      />
      <UButton
        to="/settings"
        icon="i-lucide-settings"
        variant="ghost"
        color="neutral"
        size="xl"
        class="rounded-xl p-2 w-full justify-center"
        :active="route.path === '/settings'"
        active-class="text-blue-600"
      />
    </nav>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
