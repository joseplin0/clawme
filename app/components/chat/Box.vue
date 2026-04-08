<template>
  <section class="relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-gray-900">
    <!-- Chat Header -->
    <header class="flex items-center justify-between h-14 px-4 bg-default/80 backdrop-blur-xl border-b border-default/50 shrink-0 z-10">
      <div class="flex items-center gap-3">
        <span class="font-medium outline-none text-[15px]">{{ selectedRoom?.title || '未命名房间' }}</span>
        <UBadge v-if="selectedRoom && !isDirectRoom" size="xs" color="warning" variant="subtle">群组</UBadge>
      </div>

      <div class="flex items-center gap-1">
        <LazyChatCreate :member-ids="quickCreateMemberIds" @created="handleRoomCreated">
          <UButton variant="ghost" color="neutral" icon="i-lucide-plus" size="sm" class="rounded-full" />
        </LazyChatCreate>
        <UButton variant="ghost" color="neutral" icon="i-lucide-more-horizontal" size="sm" class="rounded-full" @click="isDrawerOpen = true" />
      </div>
    </header>

    <!-- Chat Messages -->
    <div class="flex min-h-0 flex-1 relative bg-gray-50/80 dark:bg-black/20 shadow-[inset_0_4px_16px_rgba(0,0,0,0.04)]">
      <UContainer class="flex min-h-0 flex-1 w-full mx-auto px-4 sm:px-8 lg:px-12 py-4 overflow-y-auto">
        <UChatMessages :messages="chatMessages" :status="chatStatus" should-auto-scroll class="w-full space-y-4 p-4" :spacing-offset="100">
          <template #indicator>
            <div class="flex items-center space-x-2 text-muted text-sm px-4 py-2 mt-2">
              <UChatShimmer text="对方正在输入..." />
            </div>
          </template>
          <template v-for="message in chatMessages" :key="message.id">
            <!-- System Message -->
            <div
              v-if="message.role === 'system'"
              class="flex justify-center w-full my-2"
            >
              <span class="text-xs text-gray-400 dark:text-gray-500 px-3 py-1">
                <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
                  <span v-if="isTextUIPart(part)">{{ part.text }}</span>
                </template>
              </span>
            </div>
            <!-- User/Assistant Message -->
            <UChatMessage
              v-else
              :id="message.id"
              :role="message.role"
              :parts="message.parts"
              v-bind="getMessageDisplayProps(message)"
              :ui="{
                root: 'flex w-full ',
                container: 'flex-1 min-w-0 mx-2',
              }"
            >
              <!-- Hide the default role/time header to look more like WeChat -->
              <template #header>
                <div style="display: none" />
              </template>
              <template #content>
                <div
                  class="px-3 py-[9px] text-[15px] leading-relaxed break-words rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  :class="message.metadata?.userId === currentUser?.id ? 'rounded-tr-sm bg-primary text-white' : 'rounded-tl-sm bg-white dark:bg-gray-800 text-default'">
                  <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
                    <UChatReasoning v-if="isReasoningUIPart(part)" :text="part.text" :streaming="getReasoningStreaming(message, index)" class="mb-2 text-sm opacity-90">
                      <MDCCached :value="part.text" :cache-key="`reasoning-${message.id}-${index}`" class="*:first:mt-0 *:last:mb-0" />
                    </UChatReasoning>
                    <UChatTool v-else-if="isToolUIPart(part)" :text="getToolName(part)" :streaming="isToolStreaming(part)" class="mb-2 text-sm opacity-90" />
                    <MDCCached v-else-if="isTextUIPart(part)" :value="part.text" :cache-key="`${message.id}-${index}`" class="*:first:mt-0 *:last:mb-0" />
                  </template>
                </div>
              </template>
            </UChatMessage>
          </template>
        </UChatMessages>
      </UContainer>
    </div>

    <!-- Chat Composer -->
    <ChatComposer
:key="activeRoomId || 'empty'" :ready="isChatReady" :status="chatStatus" :placeholder="composerPlaceholder" :mention-items="mentionItems" @submit="handleSubmit" @stop="handleStop"
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
const { transport, onIncomingMessage } = useGlobalChatClient();

watch(
  () => props.activeRoomId,
  (value) => {
    activeRoomId.value = value;
  },
  { immediate: true },
);

const roomMembers = ref<UserProfile[]>([]);

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
    await initializeChat();
  } else {
    chat.value = null;
    roomMembers.value = [];
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
