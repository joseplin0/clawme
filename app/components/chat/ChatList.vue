<template>
  <div
    :class="[
      'absolute inset-y-0 left-0 z-10 flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden bg-white md:relative md:w-80 dark:bg-[#111111]',
    ]"
  >
    <div class="flex h-16 shrink-0 items-center px-3">
      <div class="flex w-full items-center gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="搜索会话..."
          variant="none"
          class="flex-1"
        />
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="link"
          @click="handleCreateSession"
        />
      </div>
    </div>

    <UScrollArea
      ref="scrollArea"
      v-slot="{ item }"
      :items="filteredSessions"
      :virtualize="{
        estimateSize: 72,
        skipMeasurement: true,
      }"
      class="min-h-0 flex-1 w-full p-1"
    >
      <UUser
        size="xl"
        class="p-3 rounded"
        :class="{ 'bg-gray-100': item.id === modelValue }"
        :description="item.lastMessage"
        :ui="{
          wrapper: 'flex-1 min-w-0',
          description: 'truncate',
        }"
      >
        <template #name>
          <div class="flex items-center justify-between gap-3">
            <span class="truncate">
              {{ item.title }}
            </span>
            <span class="text-xs text-muted shrink-0">
              {{ formatRelativeTime(item.updatedAt) }}
            </span>
          </div>
        </template>
      </UUser>
    </UScrollArea>
  </div>
</template>

<script setup lang="ts">
import type { ChatSessionRecord } from "~~/shared/types/clawme";

const props = defineProps<{
  modelValue: string | null;
  sessions: ChatSessionRecord[];
  hasMore?: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  create: [];
  loadMore: [];
}>();

const searchQuery = ref("");

const filteredSessions = computed(() => {
  if (!searchQuery.value) return props.sessions;
  const query = searchQuery.value.toLowerCase();
  return props.sessions.filter((s) => s.title.toLowerCase().includes(query));
});

function handleCreateSession() {
  emit("create");
}

function formatRelativeTime(value?: string) {
  if (!value) {
    return "刚刚";
  }

  const deltaMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );

  if (deltaMinutes < 1) {
    return "刚刚";
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes} 分钟前`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  return `${deltaHours} 小时前`;
}
</script>
