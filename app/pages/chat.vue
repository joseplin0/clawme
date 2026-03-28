<template>
  <div class="absolute inset-0 flex min-h-0 w-full overflow-hidden">
    <ChatList
      v-model="activeRoomId"
      :rooms="rooms"
      @create="handleCreateRoom"
    />

    <ChatBox :active-room-id="activeRoomId" :rooms="rooms" />
  </div>
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
