<script setup lang="ts">
interface SurroundingLink {
  title?: string;
  description?: string;
  path?: string;
}

defineProps<{
  next?: SurroundingLink | null;
  previous?: SurroundingLink | null;
}>();
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <NuxtLink
      v-if="previous?.path"
      :to="previous.path"
      class="docs-card rounded-2xl p-5 transition hover:-translate-y-0.5"
    >
      <div class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">上一篇</div>
      <div class="text-base font-semibold text-highlighted">{{ previous.title }}</div>
      <p v-if="previous.description" class="mt-2 text-sm text-toned">
        {{ previous.description }}
      </p>
    </NuxtLink>

    <div v-else class="hidden md:block" />

    <NuxtLink
      v-if="next?.path"
      :to="next.path"
      class="docs-card rounded-2xl p-5 text-left transition hover:-translate-y-0.5"
    >
      <div class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">下一篇</div>
      <div class="text-base font-semibold text-highlighted">{{ next.title }}</div>
      <p v-if="next.description" class="mt-2 text-sm text-toned">
        {{ next.description }}
      </p>
    </NuxtLink>
  </div>
</template>
