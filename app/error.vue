<template>
  <div class="min-h-screen bg-surface px-4 py-12 text-default">
    <div class="mx-auto flex max-w-2xl flex-col gap-6 rounded-[2rem] border border-default/50 bg-elevated p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
          Startup Check
        </p>
        <h1 class="text-2xl font-bold tracking-tight">
          {{ title }}
        </h1>
        <p class="text-sm leading-6 text-muted">
          {{ summary }}
        </p>
      </div>

      <div
        v-if="detail"
        class="rounded-2xl border border-red-200/70 bg-red-50/80 p-4 text-sm leading-6 whitespace-pre-wrap text-red-950"
      >
        {{ detail }}
      </div>

      <div class="flex flex-wrap gap-3">
        <UButton color="primary" class="rounded-full px-5" @click="reloadPage">
          重新检查
        </UButton>
        <UButton
          variant="soft"
          color="neutral"
          class="rounded-full px-5"
          @click="clearError({ redirect: '/setup' })"
        >
          去初始化页
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{
  error: NuxtError & {
    data?: {
      detail?: string;
    };
  };
}>();

const title = computed(() => props.error.statusMessage || "页面加载失败");
const detail = computed(() => props.error.data?.detail || "");
const summary = computed(
  () =>
    "应用没有通过启动检查，所以没有继续停在空白页或无限转圈。下面会直接告诉你当前卡住的环节。",
);

function reloadPage() {
  clearError();
  reloadNuxtApp({
    force: true,
  });
}
</script>
