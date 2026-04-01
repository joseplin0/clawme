<template>
  <UDashboardSidebar v-model:open="sidebarOpen" side="left" mode="slideover" :toggle="false" :auto-close="true"
    resizable :collapsed-size="0" :default-size="24" :min-size="20" :max-size="70" units="px" :ui="{
      root: '!min-h-0 bg-white dark:bg-gray-900 border-r border-default/50',
      header: 'h-16 px-4',
      body: '!min-h-0 !overflow-hidden p-2',
    }">
    <template #header>
      <div class="flex w-full items-center gap-3">
        <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="搜索房间..." variant="soft"
          class="flex-1 rounded-full" :ui="{ base: 'rounded-full text-sm' }" />
        <ChatCreate @created="handleRoomCreated">
          <UButton icon="i-lucide-plus" color="neutral" variant="ghost" class="rounded-full" />
        </ChatCreate>
      </div>
    </template>

    <UScrollArea v-slot="{ item }" :items="filteredRooms" :virtualize="{
      estimateSize: 76,
      skipMeasurement: true,
    }" class="min-h-0 flex-1 w-full">
      <div data-testid="room-item"
        class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-200"
        :class="item.id === modelValue ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'"
        @click="handleSelectRoom(item.id)">
        <!-- Avatar Placeholder (can be customized using room participants logic) -->
        <UAvatar :text="item.title.slice(0, 1)" size="md" />
        <div class="flex flex-col flex-1 min-w-0 justify-center">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-default truncate">{{ item.title }}</span>
            <span class="text-[10px] text-muted whitespace-nowrap">{{ formatRelativeTime(item.updatedAt) }}</span>
          </div>
          <span class="text-[12px] text-muted truncate mt-0.5">{{ item.lastMessage || '...' }}</span>
        </div>
      </div>
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
  created: [room: ChatRoomRecord];
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

function handleRoomCreated(room: ChatRoomRecord) {
  emit("created", room);
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
  if (deltaHours < 24) {
    return `${deltaHours} 小时前`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays} 天前`;
}
</script>
