<template>
  <section class="relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900">
    <!-- Chat Header -->
    <header
      class="flex items-center justify-between h-14 px-4 bg-default/80 backdrop-blur-xl border-b border-default/50 shrink-0 z-10">
      <div class="flex items-center gap-3">
        <span class="font-medium outline-none text-[15px]">{{ selectedRoom?.title || '未命名房间' }}</span>
        <UBadge v-if="selectedRoom && !isDirectRoom" size="xs" color="warning" variant="subtle">群组</UBadge>
      </div>

      <div class="flex items-center gap-1">
        <LazyChatCreate :member-ids="quickCreateMemberIds" @created="handleRoomCreated">
          <UButton variant="ghost" color="neutral" icon="i-lucide-plus" size="sm" class="rounded-full" />
        </LazyChatCreate>
        <UButton
variant="ghost" color="neutral" icon="i-lucide-more-horizontal" size="sm" class="rounded-full"
          @click="isDrawerOpen = true" />
      </div>
    </header>

    <!-- Chat Messages -->
    <div class="flex min-h-0 flex-1 relative bg-gray-50/80 dark:bg-black/20 shadow-[inset_0_4px_16px_rgba(0,0,0,0.04)]">
      <UContainer class="flex min-h-0 flex-1 w-full mx-auto overflow-y-auto px-4 pt-4 pb-10 sm:px-8 lg:px-12">
        <UChatMessages
:messages="displayMessages" :status="chatStatus" should-auto-scroll auto-scroll
          class="w-full space-y-4 p-4" :spacing-offset="100">
          <template #indicator>
            <div class="flex items-center space-x-2 text-muted text-sm px-4 py-2 mt-2">
              <UChatShimmer text="对方正在输入..." />
            </div>
          </template>
          <template v-for="message in displayMessages" :key="message.id">
            <!-- System Message -->
            <div v-if="message.role === 'system'" class="flex justify-center w-full my-2">
              <span class="text-xs text-gray-400 dark:text-gray-500 px-3 py-1">
                <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
                  <span v-if="isTextUIPart(part)">{{ part.text }}</span>
                </template>
              </span>
            </div>
            <!-- User/Assistant Message -->
            <UChatMessage
v-else :id="message.id" :role="message.role" :parts="message.parts"
              v-bind="getMessageDisplayProps(message)">

              <template #content>

                <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
                  <UChatReasoning
v-if="isReasoningUIPart(part)" :text="part.text"
                    :streaming="getReasoningStreaming(message, index)" class="mb-2 text-sm opacity-90">
                    <MDC
:value="part.text" :cache-key="`reasoning-${message.id}-${index}`"
                      class="*:first:mt-0 *:last:mb-0" />
                  </UChatReasoning>
                  <UChatTool
v-else-if="isToolUIPart(part)" :text="getToolName(part)" :streaming="isToolStreaming(part)"
                    class="mb-2 text-sm opacity-90" />
                  <MDCCached
v-else-if="isTextUIPart(part)" :value="part.text" :cache-key="`${message.id}-${index}`"
                    class="*:first:mt-0 *:last:mb-0" />
                </template>

              </template>
            </UChatMessage>
          </template>
        </UChatMessages>
      </UContainer>
    </div>

    <!-- Chat Composer -->
    <ChatComposer
:key="activeRoomId || 'empty'" :ready="isChatReady" :status="chatStatus"
      :placeholder="composerPlaceholder" :mention-items="mentionItems" @submit="handleSubmit" @stop="handleStop"
      @reload="handleReload" />

    <!-- Right Drawer for User List -->
    <USlideover v-model:open="isDrawerOpen" title="房间成员" side="right">
      <template #body>
        <div class="p-4 space-y-4">
          <div v-for="user in roomMembers" :key="user.id" class="flex items-center gap-3">
            <UAvatar :src="user.avatar ?? undefined" :alt="user.nickname" size="md" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ user.nickname }}
                </p>
                <UBadge v-if="isBotUserType(user.type)" size="xs" color="neutral" variant="subtle">BOT</UBadge>
              </div>
              <p class="text-xs text-gray-500 truncate">@{{ user.username }}</p>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
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
  readUIMessageStream,
  type UIMessageChunk,
  type ChatStatus,
} from "ai";
import type {
  UserProfile,
  ChatRoomRecord,
  ChatRoomDetailResponse,
  ClawmeUIMessage,
} from "~~/shared/types/clawme";
import { isBotUserType } from "~~/shared/types/clawme";
import {
  isReasoningStreaming as getNuxtReasoningStreaming,
  isToolStreaming,
} from "@nuxt/ui/utils/ai";
import type { EditorMentionMenuItem } from "@nuxt/ui";

const toast = useToast();

const props = defineProps<{
  activeRoomId: string | null;
  rooms: ChatRoomRecord[];
}>();

const emit = defineEmits<{
  created: [room: ChatRoomRecord];
}>();

const isDrawerOpen = ref(false);
const activeRoomId = ref<string | null>(props.activeRoomId);
const { user: currentUser } = useUserSession();

// Use global users cache
const { getUser, fetchUsers, setUsers } = useUsers();
const { transport, onIncomingMessage, onIncomingChunk } = useGlobalChatClient();

watch(
  () => props.activeRoomId,
  (value) => {
    activeRoomId.value = value;
  },
  { immediate: true },
);

const roomMembers = ref<UserProfile[]>([]);
const externalMessages = ref<Record<string, ClawmeUIMessage>>({});
const externalMessageOrder = ref<string[]>([]);
const externalChunkControllers = new Map<
  string,
  ReadableStreamDefaultController<UIMessageChunk>
>();

// Initialize Chat instance
const chat = shallowRef<Chat<ClawmeUIMessage> | null>(null);
const chatMessages = computed<ClawmeUIMessage[]>(
  () => chat.value?.messages ?? [],
);
const displayMessages = computed<ClawmeUIMessage[]>(() =>
  [
    ...chatMessages.value,
    ...externalMessageOrder.value
      .map((requestId) => externalMessages.value[requestId])
      .filter((message): message is ClawmeUIMessage => Boolean(message)),
  ].filter((message) => hasRenderableParts(message)),
);
const chatStatus = computed<ChatStatus>(() => chat.value?.status ?? "ready");
const selectedRoom = computed(
  () => props.rooms.find((s) => s.id === activeRoomId.value) ?? null,
);
const isDirectRoom = computed(() => selectedRoom.value?.type === "direct");
const quickCreateMemberIds = computed(() =>
  roomMembers.value
    .filter((user) => user.id !== currentUser.value?.id)
    .map((user) => user.id),
);
const isChatReady = computed(() =>
  Boolean(activeRoomId.value && chat.value),
);

onMounted(async () => {
  if (activeRoomId.value) {
    await initializeChat();
  }
});

watch(activeRoomId, async (id) => {
  await stopActiveChat();
  isDrawerOpen.value = false;

  if (id) {
    resetExternalStreams();
    await initializeChat();
  } else {
    chat.value = null;
    roomMembers.value = [];
    resetExternalStreams();
  }
});

const unsubscribeIncomingMessage = onIncomingMessage(
  async (chatId, message) => {
    if (!chat.value || chat.value.id !== chatId) {
      return;
    }

    if (
      chat.value.messages.some(
        (existingMessage) => existingMessage.id === message.id,
      )
    ) {
      return;
    }

    chat.value.messages = [...chat.value.messages, message as ClawmeUIMessage];
    removeExternalMessageByMessageId(message.id);
  },
);

const unsubscribeIncomingChunk = onIncomingChunk(
  async (chatId, requestId, chunk) => {
    if (!activeRoomId.value || chatId !== activeRoomId.value) {
      return;
    }

    enqueueExternalChunk(requestId, chunk);
  },
);

onUnmounted(() => {
  void stopActiveChat();
  unsubscribeIncomingMessage();
  unsubscribeIncomingChunk();
  resetExternalStreams();
});

async function stopActiveChat() {
  if (!chat.value) {
    return;
  }

  await chat.value.stop();
}

async function initializeChat() {
  if (!activeRoomId.value) return;

  roomMembers.value = [];

  try {
    const response = await $fetch<ChatRoomDetailResponse>(
      `/api/chat/room/${activeRoomId.value}`,
    );

    roomMembers.value = response.members;
    setUsers(response.members);

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

const composerPlaceholder = computed(() =>
  !activeRoomId.value ? "请先选择房间..." : "发送消息...",
);

const mentionUsers = computed<UserProfile[]>(() => {
  const currentUserId = currentUser.value?.id;
  return roomMembers.value.filter((user) => user.id !== currentUserId);
});

const mentionItems = computed<EditorMentionMenuItem[]>(() =>
  mentionUsers.value.map((user) => ({
    id: user.id,
    label: user.username,
    description: `${user.nickname}${isBotUserType(user.type) ? " · BOT" : ""}`,
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
    variant: "naked" as const, // We use custom background in slot instead
    avatar: {
      src: user?.avatar ?? undefined,
      alt: user?.nickname ?? (isCurrentUser ? "用户" : "助手"),
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

function getExternalAuthorId() {
  const currentUserId = currentUser.value?.id;
  return roomMembers.value.find(
    (user) => user.id !== currentUserId && isBotUserType(user.type),
  )?.id ?? "";
}

function createExternalMessage(requestId: string): ClawmeUIMessage {
  return {
    id: `external-${requestId}`,
    role: "assistant",
    parts: [],
    metadata: {
      createdAt: Date.now(),
      userId: getExternalAuthorId(),
    },
  };
}

function ensureExternalChunkStream(requestId: string) {
  if (externalChunkControllers.has(requestId)) {
    return;
  }

  externalMessageOrder.value = [...externalMessageOrder.value, requestId];

  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      externalChunkControllers.set(requestId, controller);
    },
    cancel() {
      externalChunkControllers.delete(requestId);
    },
  });

  const initialMessage = createExternalMessage(requestId);

  void (async () => {
    try {
      for await (const message of readUIMessageStream<ClawmeUIMessage>({
        message: initialMessage,
        stream,
      })) {
        externalMessages.value = {
          ...externalMessages.value,
          [requestId]: {
            ...message,
            metadata: {
              createdAt:
                message.metadata?.createdAt ?? initialMessage.metadata.createdAt,
              userId: message.metadata?.userId ?? initialMessage.metadata.userId,
            },
          },
        };
      }
    } finally {
      externalChunkControllers.delete(requestId);
    }
  })();
}

function enqueueExternalChunk(requestId: string, chunk: UIMessageChunk) {
  ensureExternalChunkStream(requestId);
  const controller = externalChunkControllers.get(requestId);

  if (!controller) {
    return;
  }

  controller.enqueue(chunk);

  if (chunk.type === "finish" || chunk.type === "error" || chunk.type === "abort") {
    controller.close();
  }
}

function removeExternalMessageByMessageId(messageId: string) {
  const requestId = externalMessageOrder.value.find(
    (candidate) => externalMessages.value[candidate]?.id === messageId,
  );

  if (!requestId) {
    return;
  }

  externalMessages.value = Object.fromEntries(
    Object.entries(externalMessages.value).filter(
      ([candidate]) => candidate !== requestId,
    ),
  );
  externalMessageOrder.value = externalMessageOrder.value.filter(
    (candidate) => candidate !== requestId,
  );
  externalChunkControllers.delete(requestId);
}

function resetExternalStreams() {
  for (const controller of externalChunkControllers.values()) {
    try {
      controller.close();
    } catch {
      // stream may already be closed
    }
  }

  externalChunkControllers.clear();
  externalMessages.value = {};
  externalMessageOrder.value = [];
}

function hasRenderableParts(message: ClawmeUIMessage) {
  if (message.role === "system") {
    return message.parts.some((part) => isTextUIPart(part) && part.text.trim());
  }

  return message.parts.some((part) => {
    if (isTextUIPart(part) || isReasoningUIPart(part)) {
      return part.text.trim().length > 0;
    }

    return isToolUIPart(part);
  });
}
</script>
