<template>
  <section
    class="relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-surface"
  >
    <UDashboardNavbar
      :title="selectedRoom?.title || '默认房间'"
      icon="i-lucide-message-square-text"
      class="border-b border-default/70"
    >
      <template #right>
        <UButton variant="outline" color="neutral" icon="i-lucide-shell">
          Moment Draft
        </UButton>
      </template>
    </UDashboardNavbar>
    <div class="flex min-h-0 flex-1 relative">
      <UContainer class="flex min-h-0 flex-1 overflow-y-auto">
        <UChatMessages
          :messages="chatMessages"
          :status="chatStatus"
          should-auto-scroll
        >
          <template #indicator>
            <UChatShimmer text="思考中..." />
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

    <ChatComposer
      :key="activeRoomId || 'empty'"
      :ready="isChatReady"
      :status="chatStatus"
      :placeholder="composerPlaceholder"
      :mention-items="mentionItems"
      @submit="handleSubmit"
      @stop="handleStop"
      @reload="handleReload"
    />
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
  ActorProfile,
  ChatRoomRecord,
  ChatRoomDetailResponse,
  ClawmeUIMessage,
} from "~~/shared/types/clawme";

import {
  isReasoningStreaming as getNuxtReasoningStreaming,
  isToolStreaming,
} from "@nuxt/ui/utils/ai";
import type { EditorMentionMenuItem } from "@nuxt/ui";

// Typed UIMessage with custom metadata

const toast = useToast();

const props = defineProps<{
  activeRoomId: string | null;
  rooms: ChatRoomRecord[];
}>();

const activeRoomId = ref<string | null>(props.activeRoomId);

// Use global actors cache
const { getActor, fetchActors, setActors } = useActors();
const { transport, onIncomingMessage } = useGlobalChatClient();

watch(
  () => props.activeRoomId,
  (value) => {
    activeRoomId.value = value;
  },
  { immediate: true },
);

const roomParticipants = ref<ActorProfile[]>([]);

// Initialize Chat instance
const chat = shallowRef<Chat<ClawmeUIMessage> | null>(null);
const chatMessages = computed<ClawmeUIMessage[]>(
  () => chat.value?.messages ?? [],
);
const chatStatus = computed<ChatStatus>(() => chat.value?.status ?? "ready");
const isChatReady = computed(() => Boolean(activeRoomId.value && chat.value));

onMounted(async () => {
  if (activeRoomId.value) {
    await initializeChat();
  }
});

watch(activeRoomId, async (id) => {
  await stopActiveChat();

  if (id) {
    await initializeChat();
  } else {
    chat.value = null;
    roomParticipants.value = [];
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
  if (!activeRoomId.value) return;

  roomParticipants.value = [];

  try {
    const response = await $fetch<ChatRoomDetailResponse>(
      `/api/chat/room/${activeRoomId.value}`,
    );

    roomParticipants.value = response.participants;
    setActors(response.participants);

    const messages = response.messages as ClawmeUIMessage[];
    console.log("Fetched messages for room", messages);

    chat.value = markRaw(
      new Chat({
        id: activeRoomId.value,
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
      title: "加载房间失败",
      description: error instanceof Error ? error.message : "未知错误",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  }
}

function handleSubmit(text: string) {
  if (
    !text.trim() ||
    !chat.value ||
    !currentUser.value?.id ||
    chatStatus.value !== "ready"
  ) {
    return;
  }

  chat.value.sendMessage({
    text,
    metadata: {
      userId: currentUser.value.id,
      createdAt: Date.now(),
    },
  });
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

// Get current user session
const { user: currentUser } = useUserSession();
const selectedRoom = computed(
  () => props.rooms.find((s) => s.id === activeRoomId.value) ?? null,
);
const composerPlaceholder = computed(() =>
  activeRoomId.value ? "告诉虾米接下来该先做什么..." : "请先选择房间...",
);

const mentionActors = computed<ActorProfile[]>(() => {
  const currentUserId = currentUser.value?.id;
  return roomParticipants.value.filter((actor) => actor.id !== currentUserId);
});

const mentionItems = computed<EditorMentionMenuItem[]>(() =>
  mentionActors.value.map((actor) => ({
    id: actor.id,
    label: actor.username,
    description: `${actor.nickname}${actor.type === "bot" ? " · BOT" : ""}`,
    avatar: {
      src: actor.avatar ?? undefined,
      alt: actor.nickname,
    },
  })),
);

// Get actor info by id
function getActorById(actorId: string) {
  return getActor(actorId);
}

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
