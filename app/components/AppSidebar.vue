<template>
  <USidebar class="hidden md:flex shrink-0 shadow-sm" collapsible="icon" :open="false">
    <template #header>
      <div class="flex flex-col items-center gap-4 w-full mt-2">
        <UButton to="/feed" label="F" color="primary" variant="solid"
          class="flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold font-sans shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105" />
      </div>
    </template>

    <template #default="{ state }">
      <UNavigationMenu :key="state" :items="menuItems" orientation="vertical" :ui="{ link: 'p-1.5 overflow-hidden' }" />
    </template>

    <template #footer>
      <div class="mt-auto flex flex-col items-center gap-4">
        <!-- Theme Switcher -->
        <UColorModeButton class="rounded-full text-gray-400 hover:text-primary dark:text-muted" />

        <!-- Avatar -->
        <UButton color="neutral" variant="ghost"
          class="rounded-full p-0 overflow-hidden shadow-sm transition-all hover:ring-2 hover:ring-primary/20 cursor-pointer border-2 border-white dark:border-[#140e0c]">
          <UAvatar size="md" :ui="{ root: 'bg-gradient-to-br from-primary-500 via-primary-400 to-amber-300' }" />
        </UButton>
      </div>
    </template>
  </USidebar>
</template>

<script setup lang="ts">
const route = useRoute()

const props = defineProps<{
  links: Array<{ label: string; to: string; icon: string; badge?: boolean }>
}>()

const menuItems = computed(() => {
  return props.links.map(link => ({
    label: link.label,
    to: link.to,
    icon: link.icon,
    badge: link.badge ? ' ' : undefined
  }))
})
</script>
