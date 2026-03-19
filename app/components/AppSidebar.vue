<template>
  <USidebar class="hidden md:flex shrink-0 shadow-sm" collapsible="icon" :open="false">
    <template #header>
      <div class="flex flex-col items-center gap-4 w-full mt-2">
        <UButton to="/feed" label="F" color="primary" variant="solid"
          class="flex h-10 w-10 items-center justify-center text-xl font-bold font-sans transition-transform duration-300 hover:scale-105" />
      </div>
    </template>

    <template #default="{ state }">
      <UNavigationMenu :key="state" :items="menuItems" orientation="vertical" :ui="{ link: 'p-1.5 overflow-hidden' }" />
    </template>

    <template #footer>
      <div class="mt-auto flex flex-col items-center gap-4">
        <!-- Theme Switcher -->
        <UColorModeButton />

        <!-- Avatar -->
        <UButton color="neutral" variant="ghost"
          class="rounded-full p-0 overflow-hidden transition-all cursor-pointer">
          <UAvatar size="md" />
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
