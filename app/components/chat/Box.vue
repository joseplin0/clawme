<template>
  <section class="relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-default">
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
    <div class="relative flex min-h-0 flex-1 bg-surface">
      <UContainer class="flex min-h-0 flex-1 w-full mx-auto overflow-y-auto px-4 pt-4 pb-10 sm:px-8 lg:px-12">
        <UChatMessages
          v-if="isMessagesReady"
          :messages="displayMessages"
          :status="chatStatus"
          should-auto-scroll
          should-scroll-to-bottom
          class="w-full space-y-4 p-4" :spacing-offset="100">
          <template #indicator>
            <div class="flex items-center space-x-2 text-muted text-sm px-4 py-2 mt-2">
              <UChatShimmer text="对方正在输入..." />
            </div>
          </template>
          <template v-for="message in displayMessages" :key="message.id">
            <!-- System Message -->
            <div v-if="message.role === 'system'" class="flex justify-center w-full my-2">
              <span class="px-3 py-1 text-xs text-muted">
                <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
                  <span v-if="isTextUIPart(part)">{{ part.text }}</span>
                </template>
              </span>
            </div>
            <!-- User/Assistant Message -->
            <ChatMessageItem
              v-else
              :message="message"
              :display-props="getMessageDisplayProps(message)"
              :get-reasoning-streaming="(index) => getReasoningStreaming(message, index)"
              :resolve-user-name="resolveUserName"
              @select-quote="handleSelectQuote(message, $event)"
            />
          </template>
        </UChatMessages>
        <div v-else class="w-full space-y-4 p-4">
          <div
            v-for="(item, index) in messageSkeletons"
            :key="index"
            class="flex items-start gap-3"
            :class="item.side === 'right' ? 'justify-end' : 'justify-start'"
          >
            <USkeleton v-if="item.side === 'left'" class="h-8 w-8 shrink-0 rounded-full" />
            <div
              class="space-y-2"
              :class="item.side === 'right' ? 'items-end' : 'items-start'"
            >
              <USkeleton class="h-4 rounded-full" :class="item.titleWidth" />
              <USkeleton class="h-16 rounded-2xl" :class="item.bodyWidth" />
            </div>
            <USkeleton v-if="item.side === 'right'" class="h-8 w-8 shrink-0 rounded-full" />
          </div>
        </div>
      </UContainer>
    </div>

    <!-- Chat Composer -->
    <ChatComposer
:key="activeRoomId || 'empty'" :ready="isChatReady" :status="chatStatus"
      :placeholder="composerPlaceholder" :mention-items="mentionItems" :quoted-message="quotedComposerMessage"
      @submit="handleSubmit" @stop="handleStop" @reload="handleReload" @clear-quote="clearQuotedMessage" />

    <!-- Right Drawer for User List -->
    <USlideover v-model:open="isDrawerOpen" title="房间成员" side="right">
      <template #body>
        <div class="p-4 space-y-4">
          <div v-for="user in roomMembers" :key="user.id" class="flex items-center gap-3">
            <UserAvatar :user="user" size="md" refresh-on-mount />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-default">
                  {{ user.nickname }}
                </p>
                <UBadge v-if="isBotUserType(user.type)" size="xs" color="neutral" variant="subtle">BOT</UBadge>
              </div>
              <p class="truncate text-xs text-muted">@{{ user.username }}</p>
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
  isReasoningUIPart,
  isTextUIPart,
  readUIMessageStream,
  type UIMessageChunk,
  type ChatStatus,
} from "ai";
import type {
  UserProfile,
  ChatRoomRecord,
  ChatRoomDetailResponse,
  ClawmeUIMessage,
  FilePart,
  ImagePart,
  MessageAttachmentSnapshot,
  MessagePart,
  QuotedMessageSummary,
} from "~~/shared/types/clawme";
import {
  isBotUserType,
  isFileMessagePart,
  isImageMessagePart,
} from "~~/shared/types/clawme";
import { isReasoningStreaming as getNuxtReasoningStreaming } from "@nuxt/ui/utils/ai";
import type { EditorMentionMenuItem } from "@nuxt/ui";

const toast = useToast();

const isDrawerOpen = ref(false);
const isMessagesReady = ref(false);
const { rooms, activeRoomId, upsertRoom } = useChatRooms();
const { user: currentUser } = useUserSession();

// Use global users cache
const { getUser, fetchUsers, setUsers } = useUsers();
const { transport, onIncomingMessage, onIncomingChunk } = useGlobalChatClient();

const roomMembers = ref<UserProfile[]>([]);
const quotedMessage = ref<QuotedMessageSummary | null>(null);
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
  () => rooms.value.find((s) => s.id === activeRoomId.value) ?? null,
);
const isDirectRoom = computed(() => selectedRoom.value?.type === "direct");
const messageSkeletons = [
  { side: "left", titleWidth: "w-20", bodyWidth: "w-56 sm:w-72" },
  { side: "right", titleWidth: "w-16 ml-auto", bodyWidth: "w-48 sm:w-64" },
  { side: "left", titleWidth: "w-24", bodyWidth: "w-64 sm:w-80" },
] as const;
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
    quotedMessage.value = null;
    isMessagesReady.value = false;
    await initializeChat();
  } else {
    chat.value = null;
    roomMembers.value = [];
    quotedMessage.value = null;
    isMessagesReady.value = false;
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
  globalThis.getSelection?.()?.removeAllRanges?.();
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
  isMessagesReady.value = false;

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
    isMessagesReady.value = true;
  } catch (error) {
    console.error("Failed to initialize chat:", error);
    toast.add({
      title: "加载房间失败",
      description: error instanceof Error ? error.message : "未知错误",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
    isMessagesReady.value = false;
  }
}

function handleRoomCreated(room: ChatRoomRecord) {
  upsertRoom(room);
}

function handleSubmit(payload: {
  text: string;
  attachments: Array<ImagePart | FilePart>;
  quotedMessageId?: string;
  quotedExcerpt?: string;
}) {
  if (
    !chat.value ||
    !currentUser.value?.id ||
    chatStatus.value !== "ready"
  ) {
    return;
  }

  const parts: MessagePart[] = [];
  const text = payload.text.trim();

  if (text) {
    parts.push({
      type: "text",
      text,
    });
  }

  parts.push(...payload.attachments);

  if (!parts.length) {
    return;
  }

  chat.value.sendMessage({
    parts: parts as ClawmeUIMessage["parts"],
    metadata: {
      userId: currentUser.value.id,
      createdAt: Date.now(),
      quotedMessageId: payload.quotedMessageId,
      quotedExcerpt: payload.quotedExcerpt,
      quotedMessage: payload.quotedMessageId
        ? quotedMessage.value ?? undefined
        : undefined,
    },
  });
  clearQuotedMessage();
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
const quotedComposerMessage = computed(() => {
  if (!quotedMessage.value) {
    return null;
  }

  return {
    id: quotedMessage.value.id,
    senderName: getUserById(quotedMessage.value.senderId)?.nickname ?? "消息",
    previewText: getQuotedPreview(quotedMessage.value),
  };
});

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

function resolveUserName(userId: string) {
  return getUserById(userId)?.nickname;
}

function clearQuotedMessage() {
  quotedMessage.value = null;
  globalThis.getSelection?.()?.removeAllRanges?.();
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
  const initialMetadata = initialMessage.metadata ?? {
    createdAt: Date.now(),
    userId: getExternalAuthorId(),
  };

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
                message.metadata?.createdAt ?? initialMetadata.createdAt,
              userId: message.metadata?.userId ?? initialMetadata.userId,
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

function toQuotedMessageSummary(message: ClawmeUIMessage): QuotedMessageSummary {
  const textPart = message.parts.find(
    (part): part is Extract<MessagePart, { type: "text" }> =>
      isTextUIPart(part) && part.text.trim().length > 0,
  );

  return {
    id: message.id,
    role: message.role,
    senderId: message.metadata?.userId ?? "",
    text: textPart?.text.trim(),
    attachments: message.parts.flatMap(toAttachmentSnapshot),
    excerpt: message.metadata?.quotedExcerpt ?? message.metadata?.quotedMessage?.excerpt,
  };
}

function toAttachmentSnapshot(part: unknown): MessageAttachmentSnapshot[] {
  if (isImageMessagePart(part)) {
    return [{
      assetId: part.assetId,
      type: part.type,
      url: part.url,
      filename: part.filename,
      mediaType: part.mediaType,
      size: part.size,
      width: part.width,
      height: part.height,
    }];
  }

  if (isFileMessagePart(part)) {
    return [{
      assetId: part.assetId,
      type: part.type,
      url: part.url,
      filename: part.filename,
      mediaType: part.mediaType,
      size: part.size,
    }];
  }

  return [];
}

function getQuotedPreview(quoted: QuotedMessageSummary) {
  if (quoted.excerpt?.trim()) {
    return quoted.excerpt.trim();
  }

  if (quoted.text?.trim()) {
    return quoted.text.trim();
  }

  const attachment = quoted.attachments[0];
  if (attachment) {
    return attachment.type === "image"
      ? `[图片] ${attachment.filename}`
      : `[附件] ${attachment.filename}`;
  }

  return "引用了一条消息";
}

function handleSelectQuote(message: ClawmeUIMessage, excerpt: string) {
  quotedMessage.value = {
    ...toQuotedMessageSummary(message),
    excerpt,
  };
  globalThis.getSelection?.()?.removeAllRanges?.();
}

function hasRenderableParts(message: ClawmeUIMessage) {
  if (message.role === "system") {
    return message.parts.some((part) => isTextUIPart(part) && part.text.trim());
  }

  return message.parts.some((part) => {
    if (isTextUIPart(part) || isReasoningUIPart(part)) {
      return part.text.trim().length > 0;
    }

    return part.type === "tool-call" || part.type === "tool-result" || isImageMessagePart(part) || isFileMessagePart(part);
  });
}
</script>
