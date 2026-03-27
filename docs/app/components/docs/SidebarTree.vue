<script setup lang="ts">
defineOptions({
  name: "DocsSidebarTree",
});

interface NavItem {
  title?: string;
  path?: string;
  children?: NavItem[];
}

const props = defineProps<{
  currentPath: string;
  items: NavItem[];
  filter?: string;
}>();

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function matchesFilter(item: NavItem, query: string): boolean {
  if (!query) {
    return true;
  }

  if (normalize(item.title).includes(query) || normalize(item.path).includes(query)) {
    return true;
  }

  return item.children?.some((child) => matchesFilter(child, query)) ?? false;
}

function filterItems(items: NavItem[], query: string): NavItem[] {
  return items
    .filter((item) => matchesFilter(item, query))
    .map((item) => ({
      ...item,
      children: item.children ? filterItems(item.children, query) : undefined,
    }));
}

function isActive(path?: string) {
  if (!path) {
    return false;
  }

  return props.currentPath === path || props.currentPath.startsWith(`${path}/`);
}

const visibleItems = computed(() => filterItems(props.items, normalize(props.filter)));
</script>

<template>
  <ul class="space-y-2">
    <li v-for="item in visibleItems" :key="item.path || item.title" class="space-y-2">
      <NuxtLink
        v-if="item.path"
        :to="item.path"
        class="group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition"
        :class="
          isActive(item.path)
            ? 'bg-primary/12 text-primary ring-1 ring-primary/25'
            : 'text-highlighted hover:bg-muted'
        "
      >
        <span class="min-w-0 truncate font-medium">{{ item.title || item.path }}</span>
        <UIcon
          v-if="isActive(item.path)"
          name="i-lucide-arrow-right"
          class="size-4 shrink-0"
        />
      </NuxtLink>

      <div
        v-else
        class="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
      >
        {{ item.title }}
      </div>

      <DocsSidebarTree
        v-if="item.children?.length"
        :items="item.children"
        :current-path="currentPath"
        :filter="filter"
        class="border-l border-default/40 pl-3"
      />
    </li>
  </ul>
</template>
