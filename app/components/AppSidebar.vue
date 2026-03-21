<template>
  <USidebar
    class="hidden md:flex"
    collapsible="icon"
    :open="false"
    :ui="{
      container: 'h-full border-none bg-zinc-50 dark:bg-zinc-950',
      inner: 'divide-transparent',
    }"
  >
    <template #header>
      <UButton
        to="/feed"
        label="F"
        variant="ghost"
        class="text-orange-600 dark:text-orange-500 font-black text-xl tracking-tighter cursor-pointer"
      />
    </template>

    <template #default="{ state }">
      <UNavigationMenu
        :key="state"
        :items="menuItems"
        tooltip
        variant="link"
        orientation="vertical"
        :ui="{ link: 'p-2 px-1.5 overflow-hidden', linkLeadingIcon: 'size-5' }"
      />
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="ghost"
        class="rounded-full p-0 overflow-hidden transition-all cursor-pointer"
      >
        <UAvatar size="md" />
      </UButton>
    </template>
  </USidebar>
</template>

<script setup lang="ts">
const props = defineProps<{
  links: Array<{ label: string; to: string; icon: string; badge?: boolean }>;
}>();

const menuItems = computed(() => {
  return props.links.map((link) => ({
    label: link.label,
    to: link.to,
    icon: link.icon,
    badge: link.badge ? " " : undefined,
  }));
});
</script>
