<template>
  <section
    class="relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-surface"
  >
    <UDashboardNavbar
      :title="selectedRoom?.title || '默认房间'"
      class="border-b border-default/70"
    >
      <template #right>
        <LazyCreateRoomTrigger
          :member-ids="quickCreateMemberIds"
          @created="handleRoomCreated"
        >
          <UButton variant="outline" color="neutral" icon="i-lucide-plus">
            新会话
          </UButton>
        </LazyCreateRoomTrigger>
      </template>
    </UDashboardNavbar>
    <div
      v-if="selectedRoom && !isDirectRoom"
      class="border-b border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning"
    >
      当前房间是 group，会话创建已支持，消息发送链路暂仅保留 direct。
    </div>
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
                  <MDCCached
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

    <LazyChatComposer
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
  UserProfile,
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

const emit = defineEmits<{
  created: [room: ChatRoomRecord];
}>();

const activeRoomId = ref<string | null>(props.activeRoomId);
const { user: currentUser } = useUserSession();

// Use global users cache
const { getUser, fetchUsers, setUsers } = useUsers();
const { transport, onIncomingMessage } = useGlobalChatClient();

watch(
  () => props.activeRoomId,
  (value) => {
    activeRoomId.value = value;
  },
  { immediate: true },
);

const roomParticipants = ref<UserProfile[]>([]);

// Initialize Chat instance
const chat = shallowRef<Chat<ClawmeUIMessage> | null>(null);
const chatMessages = computed<ClawmeUIMessage[]>(
  () => chat.value?.messages ?? [],
);
const chatStatus = computed<ChatStatus>(() => chat.value?.status ?? "ready");
const selectedRoom = computed(
  () => props.rooms.find((s) => s.id === activeRoomId.value) ?? null,
);
const isDirectRoom = computed(() => selectedRoom.value?.type === "direct");
const quickCreateMemberIds = computed(() =>
  roomParticipants.value
    .filter((user) => user.id !== currentUser.value?.id)
    .map((user) => user.id),
);
const isChatReady = computed(() =>
  Boolean(activeRoomId.value && chat.value && isDirectRoom.value),
);

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
      await fetchUsers([senderId]);
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
    setUsers(response.participants);

    const messages = response.messages as ClawmeUIMessage[];

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

function handleRoomCreated(room: ChatRoomRecord) {
  emit("created", room);
}

function handleSubmit(text: string) {
  if (
    !text.trim() ||
    !chat.value ||
    !currentUser.value?.id ||
    chatStatus.value !== "ready" ||
    !isDirectRoom.value
  ) {
    if (activeRoomId.value && !isDirectRoom.value) {
      toast.add({
        title: "当前房间暂不支持发送消息",
        description: "group 房间只保留创建和浏览，发送链路后续再接通。",
        color: "warning",
        icon: "i-lucide-circle-alert",
      });
    }
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

const composerPlaceholder = computed(() =>
  !activeRoomId.value
    ? "请先选择房间..."
    : isDirectRoom.value
      ? "告诉虾米接下来该先做什么..."
      : "group 房间暂不支持发送消息",
);

const mentionUsers = computed<UserProfile[]>(() => {
  const currentUserId = currentUser.value?.id;
  return roomParticipants.value.filter((user) => user.id !== currentUserId);
});

const mentionItems = computed<EditorMentionMenuItem[]>(() =>
  mentionUsers.value.map((user) => ({
    id: user.id,
    label: user.username,
    description: `${user.nickname}${user.type === "bot" ? " · BOT" : ""}`,
    avatar: {
      src: user.avatar ?? undefined,
      alt: user.nickname,
    },
  })),
);

// Get user info by id
function getUserById(userId: string) {
  return getUser(userId);
}

// Get message props based on userId
function getMessageUserProps(userId: string) {
  const user = getUserById(userId);
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
