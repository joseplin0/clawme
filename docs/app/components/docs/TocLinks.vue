<script setup lang="ts">
defineOptions({
  name: "DocsTocLinks",
});

interface TocLink {
  id: string;
  depth: number;
  text: string;
  children?: TocLink[];
}

defineProps<{
  links: TocLink[];
}>();
</script>

<template>
  <ul class="space-y-2">
    <li v-for="link in links" :key="link.id" class="space-y-2">
      <a
        :href="`#${link.id}`"
        class="block rounded-lg px-3 py-2 text-sm text-toned transition hover:bg-muted hover:text-highlighted"
        :class="link.depth > 2 ? 'ml-3' : ''"
      >
        {{ link.text }}
      </a>
      <DocsTocLinks v-if="link.children?.length" :links="link.children" />
    </li>
  </ul>
</template>
