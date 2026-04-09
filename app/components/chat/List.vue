<template>
  <UDashboardSidebar
v-model:open="sidebarOpen" side="left" mode="slideover" :toggle="false" :auto-close="true"
    resizable :collapsed-size="0" :default-size="24" :min-size="20" :max-size="70" units="px" :ui="{
      root: '!min-h-0 border-r border-default/50 bg-default',
      header: 'h-16 px-4',
      body: '!min-h-0 !overflow-hidden p-2',
    }">
    <template #header>
      <div class="flex w-full items-center gap-3">
        <UInput
v-model="searchQuery" icon="i-lucide-search" placeholder="搜索房间..." variant="soft"
          class="flex-1 rounded-full" :ui="{ base: 'rounded-full text-sm' }" />
        <ChatCreate @created="handleRoomCreated">
          <UButton icon="i-lucide-plus" color="neutral" variant="ghost" class="rounded-full" />
        </ChatCreate>
      </div>
    </template>

    <div v-if="showRoomSkeletons" class="min-h-0 flex-1 w-full space-y-2 px-1">
      <div
        v-for="(item, index) in roomSkeletons"
        :key="index"
        class="flex items-center gap-3 rounded-lg p-3"
      >
        <USkeleton class="h-10 w-10 shrink-0 rounded-full" />
        <div class="min-w-0 flex-1 space-y-2">
          <div class="flex items-center justify-between gap-3">
            <USkeleton class="h-4 rounded-full" :class="item.titleWidth" />
            <USkeleton class="h-3 w-10 shrink-0 rounded-full" />
          </div>
          <USkeleton class="h-3 rounded-full" :class="item.previewWidth" />
        </div>
      </div>
    </div>
    <div
      v-else-if="showEmptyState"
      class="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center"
    >
      <div class="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-default/40 px-3 text-xs font-medium text-muted">
        {{ emptyStateBadge }}
      </div>
      <p class="mt-4 text-sm font-medium text-default">{{ emptyStateTitle }}</p>
      <p class="mt-1 text-xs leading-5 text-muted">{{ emptyStateDescription }}</p>
    </div>
    <UScrollArea
      v-else
      v-slot="{ item }"
      :items="filteredRooms"
      :virtualize="{
        estimateSize: 76,
        skipMeasurement: true,
      }"
      class="min-h-0 flex-1 w-full"
    >
      <div
        data-testid="room-item"
        class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-200"
        :class="item.id === activeRoomId ? 'bg-elevated shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05)]' : 'hover:bg-elevated/70'"
        @click="handleSelectRoom(item.id)"
      >
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
  open?: boolean;
  hasMore?: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  loadMore: [];
}>();

const { rooms, activeRoomId, pending, initialized, fetchRooms, upsertRoom } = useChatRooms();
const searchQuery = ref("");
const sidebarOpen = computed({
  get: () => props.open ?? false,
  set: (value: boolean) => emit("update:open", value),
});
const roomSkeletons = [
  { titleWidth: "w-28", previewWidth: "w-40" },
  { titleWidth: "w-24", previewWidth: "w-32" },
  { titleWidth: "w-32", previewWidth: "w-44" },
  { titleWidth: "w-20", previewWidth: "w-28" },
] as const;
const showRoomSkeletons = computed(
  () => pending.value && rooms.value.length === 0,
);

const filteredRooms = computed(() => {
  if (!searchQuery.value) return rooms.value;
  const query = searchQuery.value.toLowerCase();
  return rooms.value.filter((s) => s.title.toLowerCase().includes(query));
});
const showEmptyState = computed(
  () => !pending.value && filteredRooms.value.length === 0,
);
const isSearching = computed(() => searchQuery.value.trim().length > 0);
const emptyStateTitle = computed(() =>
  isSearching.value ? "没有找到匹配房间" : "还没有聊天房间",
);
const emptyStateDescription = computed(() =>
  isSearching.value
    ? "试试别的关键词，或者直接创建一个新房间。"
    : "点击右上角加号，开始新的聊天。",
);
const emptyStateBadge = computed(() =>
  isSearching.value ? "搜索" : "会话",
);

function handleRoomCreated(room: ChatRoomRecord) {
  upsertRoom(room);
}

function handleSelectRoom(roomId: string) {
  activeRoomId.value = roomId;
  sidebarOpen.value = false;
}

onMounted(() => {
  if (!initialized.value) {
    void fetchRooms();
  }
});

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
