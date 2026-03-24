<template>
  <div class="relative flex h-full w-full overflow-hidden bg-background">
    <ChatList
      v-model="activeSessionId"
      :sessions="sessions"
      @create="handleCreateSession"
    />

    <ChatBox :active-session-id="activeSessionId" :sessions="sessions" />
  </div>
</template>

<script setup lang="ts">
import ChatList from "~/components/chat/ChatList.vue";
import ChatBox from "~/components/chat/ChatBox.vue";
import type { ChatSessionResponse } from "~~/shared/types/clawme";

const toast = useToast();

const { data: sessionData, refresh } = useFetch<ChatSessionResponse>(
  "/api/chat/session",
  { lazy: true },
);

const activeSessionId = ref<string | null>(null);

// Global actors cache
const { setActors } = useActors();

// Set activeSessionId and cache actors when data loads
watch(
  () => sessionData.value,
  (value) => {
    if (!value) return;
    if (!activeSessionId.value && value.activeSessionId) {
      activeSessionId.value = value.activeSessionId;
    }
    // Cache owner and bot profiles
    const actors = [value.state.owner, value.state.bot].filter(
      (a): a is NonNullable<typeof a> => a !== null,
    );
    setActors(actors);
  },
  { immediate: true },
);

const sessions = computed(() => sessionData.value?.state.sessions ?? []);

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
