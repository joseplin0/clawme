<template>
  <div class="relative flex h-full w-full overflow-hidden bg-background">
    <ChatList
      v-model="activeSessionId"
      :sessions="sessions"
      :messages="state?.messages ?? []"
    />

    <ChatBox
      :active-session-id="activeSessionId"
      :owner="owner"
      :assistant="assistant"
    />
  </div>
</template>

<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";
import {
  DefaultChatTransport,
  type UIMessage,
  type UIMessagePart,
  type UIDataTypes,
  type UITools,
} from "ai";
import ChatList from "~/components/chat/ChatList.vue";
import ChatBox from "~/components/chat/ChatBox.vue";
import type {
  ChatSessionRecord,
  ChatSessionDetailResponse,
} from "~~/shared/types/clawme";

const bootstrap = useState<PublicStateResponse | null>("bootstrap-state");
const toast = useToast();

const { data: sessionData, refresh } =
  await useFetch<ChatSessionResponse>("/api/chat/session");

const activeSessionId = ref<string | null>(
  sessionData.value?.activeSessionId ?? null,
);

watch(
  () => sessionData.value?.activeSessionId,
  (value) => {
    if (!activeSessionId.value && value) {
      activeSessionId.value = value;
    }
  },
  { immediate: true },
);

watch(activeSessionId, () => {
  if (activeSessionId.value) {
    // Load session messages when switching
    refresh();
  }
});

const state = computed(() => sessionData.value?.state);
const sessions = computed(() => state.value?.sessions ?? []);
const owner = computed(() => state.value?.owner);
const assistant = computed(() => state.value?.bot);
const ownerName = computed(() => owner.value?.nickname ?? "用户");
const assistantName = computed(() => assistant.value?.nickname ?? "虾米");

// Initialize Chat instance
const chat = new Chat<UIMessage>({
  id: activeSessionId.value ?? undefined,
  messages: [],
  transport: activeSessionId.value
    ? new DefaultChatTransport({
        api: `/api/chat/session/${activeSessionId.value}`,
        body: { model: "gpt-4o-mini" },
      })
    : undefined,
  onError(error) {
    toast.add({
      title: "聊天出错",
      description: error.message,
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  },
});

// Load existing messages when session changes
watch(
  activeSessionId,
  async (id) => {
    if (!id) return;

    try {
      const response = await $fetch<ChatSessionDetailResponse>(
        `/api/chat/session/${id}`,
      );
      chat.messages = response.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: m.parts as UIMessagePart<UIDataTypes, UITools>[],
        createdAt: new Date(m.createdAt),
      }));
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  },
  { immediate: true },
);

const inputMessage = ref("");

function handleSubmit() {
  if (!inputMessage.value.trim() || !activeSessionId.value) return;

  chat.sendMessage({ text: inputMessage.value });
  inputMessage.value = "";
}
</script>
