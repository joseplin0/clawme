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
      @created="handleRoomCreated"
    />

    <ChatBox
      :active-room-id="activeRoomId"
      :rooms="rooms"
      @created="handleRoomCreated"
    />
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { ChatRoomRecord } from "~~/shared/types/clawme";

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

async function handleRoomCreated(room: ChatRoomRecord) {
  activeRoomId.value = room.id;
  sidebarOpen.value = false;
  const current = roomData.value ?? { rooms: [], activeRoomId: null };
  roomData.value = {
    ...current,
    rooms: [room, ...current.rooms.filter((item) => item.id !== room.id)],
    activeRoomId: room.id,
  };
  await refresh();
}
</script>
