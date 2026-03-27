<template>
  <div class="absolute inset-0 flex min-h-0 w-full overflow-hidden">
    <ChatList
      v-model="activeSessionId"
      :sessions="sessions"
      @create="handleCreateSession"
    />

    <ChatBox :active-session-id="activeSessionId" :sessions="sessions" />
  </div>
</template>

<script setup lang="ts">
import type { ChatSessionRecord } from "~~/shared/types/clawme";

const toast = useToast();

interface SessionListResponse {
  sessions: ChatSessionRecord[];
  activeSessionId: string | null;
}

const { data: sessionData, refresh } = useFetch<SessionListResponse>(
  "/api/chat/session",
  { lazy: true },
);

const activeSessionId = ref<string | null>(null);

// Set activeSessionId when data loads
watch(
  () => sessionData.value,
  (value) => {
    if (!value) return;
    if (!activeSessionId.value && value.activeSessionId) {
      activeSessionId.value = value.activeSessionId;
    }
  },
  { immediate: true },
);

const sessions = computed(() => sessionData.value?.sessions ?? []);

async function handleCreateSession() {
  // TODO: Create new session
  toast.add({
    title: "创建会话",
    description: "功能开发中...",
    color: "info",
    icon: "i-lucide-info",
  });
}
</script>
