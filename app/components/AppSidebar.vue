<template>
  <USidebar
    class="hidden md:flex"
    collapsible="none"
    :open="false"
    :style="{
      '--sidebar-width': '3.5rem',
    }"
    :ui="{
      container: 'h-full bg-surface',
      inner: 'divide-transparent',
      header: 'p-2.5',
      body: 'p-2 flex-1 overflow-hidden',
      footer: 'p-3',
    }"
  >
    <template #header>
      <UButton
        to="/moment"
        label="C"
        variant="ghost"
        class="text-primary font-black text-xl tracking-tighter cursor-pointer"
      />
    </template>

    <template #default>
      <UScrollArea class="flex-1" orientation="vertical">
        <div class="flex flex-col gap-3">
          <component
            :is="link.to ? NuxtLink : 'div'"
            v-for="(link, index) in links"
            :key="link.to || index"
            :to="link.to"
            :prefetch="true"
            :class="[
              'rounded-lg hover:bg-gray-50 dark:hover:bg-gray-300 size-10 flex items-center justify-center cursor-pointer transition-all duration-200 hover:text-primary',
              {
                'text-primary': route.path === link.to,
              },
            ]"
            :title="link.label"
            @click="link.onClick?.($event)"
          >
            <UChip color="error" size="xs" :show="!!link.badge">
              <UIcon
                :name="
                  route.path === link.to
                    ? link.activeIcon || link.icon
                    : link.icon
                "
                class="text-xl"
              />
            </UChip>
          </component>
        </div>
      </UScrollArea>
    </template>

    <template #footer>
      <UAvatar size="md" />
    </template>
  </USidebar>
</template>

<script setup lang="ts">
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
const NuxtLink = resolveComponent("NuxtLink");
</script>
