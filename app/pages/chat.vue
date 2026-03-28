<template>
  <UDashboardGroup
    storage-key="chat-layout"
    :ui="{
      base: '!relative !inset-auto min-h-0 flex-1',
    }"
  >
    <ChatList
      v-model="activeRoomId"
      v-model:open="sidebarOpen"
      :rooms="rooms"
      @create="handleCreateRoom"
    />

    <ChatBox :active-room-id="activeRoomId" :rooms="rooms" />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { ChatRoomRecord } from "~~/shared/types/clawme";

const toast = useToast();

interface RoomListResponse {
  rooms: ChatRoomRecord[];
  activeRoomId: string | null;
}

const { data: roomData, refresh } = useFetch<RoomListResponse>(
  "/api/chat/room",
  { lazy: true },
);

const activeRoomId = ref<string | null>(null);
const sidebarOpen = ref(false);

// Set activeRoomId when data loads
watch(
  () => roomData.value,
  (value) => {
    if (!value) return;
    if (!activeRoomId.value && value.activeRoomId) {
      activeRoomId.value = value.activeRoomId;
    }
  },
  { immediate: true },
);

watch(activeRoomId, (value) => {
  if (value) {
    sidebarOpen.value = false;
  }
});

const rooms = computed(() => roomData.value?.rooms ?? []);

async function handleCreateRoom() {
  // TODO: Create new room
  toast.add({
    title: "创建房间",
    description: "功能开发中...",
    color: "info",
    icon: "i-lucide-info",
  });
}
</script>
