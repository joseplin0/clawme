<template>
  <section
    class="absolute inset-0 z-20 flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-surface transition-transform duration-300 md:relative border-l border-default"
  >
    <template v-if="activeSessionId">
      <header
        class="flex h-16 shrink-0 items-center justify-between gap-4 px-4 bg-surface"
      >
        <div class="flex min-w-0 items-center gap-3">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            size="sm"
            class="md:hidden"
            @click="activeSessionId = null"
          />
          <h2 class="truncate text-lg font-semibold text-highlighted">
            {{ selectedSession?.title || "默认会话" }}
          </h2>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <UButton variant="outline" color="neutral" icon="i-lucide-shell">
            Feed Draft
          </UButton>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto py-4 sm:py-6">
        <UContainer class="flex min-h-0 flex-1 flex-col">
          <UChatMessages
            :messages="chatMessages"
            :status="chatStatus"
            should-auto-scroll
            should-scroll-to-bottom
            :spacing-offset="80"
            class="space-y-4"
          >
            <template #indicator>
              <UChatShimmer text="思考中。。。" />
            </template>
            <UChatMessage
              v-for="message in chatMessages"
              :key="message.id"
              :id="message.id"
              :role="message.role"
              :parts="message.parts"
              v-bind="getMessageDisplayProps(message)"
            >
              <template #content>
                <template
                  v-for="(part, index) in message.parts"
                  :key="`${message.id}-${part.type}-${index}`"
                >
                  <UChatReasoning
                    v-if="isReasoningUIPart(part)"
                    :text="part.text"
                    :streaming="getReasoningStreaming(message, index)"
                  >
                    <MDC
                      :value="part.text"
                      :cache-key="`reasoning-${message.id}-${index}`"
                      class="*:first:mt-0 *:last:mb-0"
                    />
                  </UChatReasoning>
                  <UChatTool
                    v-else-if="isToolUIPart(part)"
                    :text="getToolName(part)"
                    :streaming="isToolStreaming(part)"
                  />
                  <MDCCached
                    v-else-if="isTextUIPart(part)"
                    :value="part.text"
                    :cache-key="`${message.id}-${index}`"
                    class="*:first:mt-0 *:last:mb-0"
                  />
                </template>
              </template>
            </UChatMessage>
          </UChatMessages>
        </UContainer>
      </div>

      <div class="shrink-0 border-t border-muted/50 pb-safe">
        <UChatPrompt
          v-model="inputMessage"
          :rows="1"
          :maxrows="6"
          autoresize
          variant="soft"
          :disabled="!isChatReady"
          :placeholder="
            activeSessionId ? '告诉虾米接下来该先做什么...' : '请先选择会话...'
          "
          :ui="{
            root: 'backdrop-none',
            body: 'text-sm leading-7',
            footer: 'px-3 py-2',
          }"
          class="w-full"
          @submit="handleSubmit"
        >
          <template #footer>
            <p class="text-xs text-muted"></p>
            <UChatPromptSubmit
              :status="chatStatus"
              size="lg"
              class="shrink-0"
              :disabled="!isChatReady || !inputMessage.trim()"
              @stop="handleStop"
              @reload="handleReload"
            />
          </template>
        </UChatPrompt>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  shallowRef,
  markRaw,
} from "vue";
import { Chat } from "@ai-sdk/vue";
import {
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type ChatStatus,
} from "ai";
import type {
  ChatSessionRecord,
  ChatSessionDetailResponse,
  ClawmeUIMessage,
} from "~~/shared/types/clawme";

import {
  isReasoningStreaming as getNuxtReasoningStreaming,
  isToolStreaming,
} from "@nuxt/ui/utils/ai";

// Typed UIMessage with custom metadata

const toast = useToast();

const props = defineProps<{
  activeSessionId: string | null;
  sessions: ChatSessionRecord[];
}>();

const activeSessionId = ref<string | null>(props.activeSessionId);

// Use global actors cache
const { getActor, fetchActors } = useActors();
const { transport, onIncomingMessage } = useGlobalChatClient();

watch(
  () => props.activeSessionId,
  (value) => {
    activeSessionId.value = value;
  },
  { immediate: true },
);

const inputMessage = ref("");

// Initialize Chat instance
const chat = shallowRef<Chat<ClawmeUIMessage> | null>(null);
const chatMessages = computed<ClawmeUIMessage[]>(
  () => chat.value?.messages ?? [],
);
const chatStatus = computed<ChatStatus>(() => chat.value?.status ?? "ready");
const lastMessageId = computed(
  () => chatMessages.value[chatMessages.value.length - 1]?.id,
);
const isChatReady = computed(() =>
  Boolean(activeSessionId.value && chat.value),
);

onMounted(async () => {
  if (activeSessionId.value) {
    await initializeChat();
  }
});

watch(activeSessionId, async (id) => {
  await stopActiveChat();

  if (id) {
    await initializeChat();
  } else {
    chat.value = null;
  }
});

const unsubscribeIncomingMessage = onIncomingMessage(
  async (chatId, message) => {
    if (!chat.value || chat.value.id !== chatId) {
      return;
    }

    const senderId = message.metadata?.userId;
    if (senderId) {
      await fetchActors([senderId]);
    }

    if (
      chat.value.messages.some(
        (existingMessage) => existingMessage.id === message.id,
      )
    ) {
      return;
    }

    chat.value.messages = [...chat.value.messages, message as ClawmeUIMessage];
  },
);

onUnmounted(() => {
  void stopActiveChat();
  unsubscribeIncomingMessage();
});

async function stopActiveChat() {
  if (!chat.value) {
    return;
  }

  await chat.value.stop();
}

async function initializeChat() {
  if (!activeSessionId.value) return;

  try {
    const response = await $fetch<ChatSessionDetailResponse>(
      `/api/chat/session/${activeSessionId.value}`,
    );

    // Collect all userIds and fetch them
    const userIds = response.messages
      .map((m) => m.metadata?.userId)
      .filter((id): id is string => Boolean(id));
    // await fetchActors(userIds);
    const messages = response.messages as ClawmeUIMessage[];
    console.log("Fetched messages for session", messages);

    chat.value = markRaw(
      new Chat({
        id: activeSessionId.value,
        messages,
        transport,
        onError(error) {
          toast.add({
            title: "聊天出错",
            description: error.message,
            color: "error",
            icon: "i-lucide-triangle-alert",
          });
        },
      }),
    );
  } catch (error) {
    console.error("Failed to initialize chat:", error);
    toast.add({
      title: "加载会话失败",
      description: error instanceof Error ? error.message : "未知错误",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  }
}

function handleSubmit() {
  if (!inputMessage.value.trim() || !chat.value || !currentUser.value?.id)
    return;

  chat.value.sendMessage({
    text: inputMessage.value,
    metadata: {
      userId: currentUser.value.id,
      createdAt: Date.now(),
    },
  });
  inputMessage.value = "";
}

function handleReload() {
  toast.add({
    title: "暂不支持",
    description: "当前 WebSocket 聊天暂不支持重新生成",
    color: "warning",
    icon: "i-lucide-rotate-ccw",
  });
}

function handleStop() {
  chat.value?.stop();
}

const selectedSession = computed(
  () => props.sessions.find((s) => s.id === activeSessionId.value) ?? null,
);

// Fetch participants when session changes
watch(selectedSession, async (session) => {
  if (session?.participantIds.length) {
    await fetchActors(session.participantIds);
  }
});

// Get actor info by id
function getActorById(actorId: string) {
  return getActor(actorId);
}

// Get current user session
const { user: currentUser } = useUserSession();

// Get message props based on userId
function getMessageUserProps(userId: string) {
  const user = getActorById(userId);
  const isCurrentUser = currentUser.value?.id === userId;
  return {
    side: isCurrentUser ? ("right" as const) : ("left" as const),
    variant: isCurrentUser ? ("soft" as const) : ("naked" as const),
    avatar: {
      src: user?.avatar ?? undefined,
      alt: user?.nickname ?? (isCurrentUser ? "用户" : "助手"),
      size: "sm" as const,
    },
  };
}

function getMessageDisplayProps(message: ClawmeUIMessage) {
  return getMessageUserProps(message.metadata?.userId ?? "");
}

function getReasoningStreaming(message: ClawmeUIMessage, index: number) {
  if (!chat.value) {
    return false;
  }

  return getNuxtReasoningStreaming(message, index, chat.value);
}
</script>
