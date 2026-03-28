<template>
  <UDashboardSidebar
    v-model:open="sidebarOpen"
    side="left"
    mode="slideover"
    :toggle="false"
    :auto-close="true"
    :resizable="true"
    :default-size="24"
    :min-size="13"
    :max-size="70"
    :ui="{
      root: '!min-h-0',
      header: 'h-16 px-3',
      body: '!min-h-0 !overflow-hidden p-1',
    }"
  >
    <template #header>
      <div class="flex w-full items-center gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="搜索房间..."
          variant="none"
          class="flex-1"
        />
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="link"
          @click="handleCreateRoom"
        />
      </div>
    </template>

    <UScrollArea
      v-slot="{ item }"
      :items="filteredRooms"
      :virtualize="{
        estimateSize: 72,
        skipMeasurement: true,
      }"
      class="min-h-0 flex-1 w-full"
    >
      <UUser
        size="xl"
        class="cursor-pointer rounded p-3"
        :class="{ 'bg-gray-100': item.id === modelValue }"
        :description="item.lastMessage"
        :ui="{
          wrapper: 'flex-1 min-w-0',
          description: 'truncate',
        }"
        @click="handleSelectRoom(item.id)"
      >
        <template #name>
          <div class="flex items-center justify-between gap-3">
            <span class="truncate">
              {{ item.title }}
            </span>
            <span class="shrink-0 text-xs text-muted">
              {{ formatRelativeTime(item.updatedAt) }}
            </span>
          </div>
        </template>
      </UUser>
    </UScrollArea>
  </UDashboardSidebar>
</template>

<script setup lang="ts">
import type { ChatRoomRecord } from "~~/shared/types/clawme";

const props = defineProps<{
  modelValue: string | null;
  open?: boolean;
  rooms: ChatRoomRecord[];
  hasMore?: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  "update:open": [value: boolean];
  create: [];
  loadMore: [];
}>();

const searchQuery = ref("");
const sidebarOpen = computed({
  get: () => props.open ?? false,
  set: (value: boolean) => emit("update:open", value),
});

const filteredRooms = computed(() => {
  if (!searchQuery.value) return props.rooms;
  const query = searchQuery.value.toLowerCase();
  return props.rooms.filter((s) => s.title.toLowerCase().includes(query));
});

function handleCreateRoom() {
  emit("create");
}

function handleSelectRoom(roomId: string) {
  emit("update:modelValue", roomId);
  sidebarOpen.value = false;
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
