<template>
  <UDashboardGroup
    storage-key="chat-layout"
    :ui="{
      base: '!relative !inset-auto min-h-0 flex-1',
    }"
  >
    <LazyChatList v-model:open="sidebarOpen" />

    <LazyChatBox />
  </UDashboardGroup>
</template>

<script setup lang="ts">
const { activeRoomId } = useChatRooms();
const sidebarOpen = ref(false);

// Set activeRoomId when data loads
watch(activeRoomId, (value) => {
  if (value) {
    sidebarOpen.value = false;
  }
});
</script>
