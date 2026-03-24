<template>
  <section
    :class="[
      'absolute inset-0 z-20 flex h-full flex-1 flex-col transition-transform duration-300 md:relative',
      activeSessionId ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
    ]"
  >
    <div
      v-if="!activeSessionId"
      class="hidden h-full items-center justify-center text-center md:flex"
    >
      <div class="space-y-4">
        <div
          class="mx-auto flex size-20 items-center justify-center rounded-full bg-elevated/50"
        >
          <UIcon name="i-lucide-message-circle" class="size-10 text-muted" />
        </div>
        <div class="space-y-2">
          <p class="text-lg font-medium text-highlighted">
            选择或创建会话开始协作
          </p>
          <p class="text-sm text-muted">
            从左侧列表选择会话，或点击 + 按钮创建新会话
          </p>
        </div>
      </div>
    </div>

    <template v-else>
      <header class="flex h-16 items-center justify-between gap-4 px-4">
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

      <div v-if="chat" class="flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <div class="mx-auto max-w-3xl space-y-4">
          <UChatMessages
            :status="chat.status"
            should-auto-scroll
            :spacing-offset="80"
            class="space-y-4"
          >
            <UChatMessage
              v-for="message in chat.messages"
              :key="message.id"
              :id="message.id"
              :role="message.role"
              :parts="message.parts"
            >
              <template #avatar>
                <UAvatar
                  v-bind="
                    getMessageUserProps(message.metadata?.userId ?? '').avatar
                  "
                  size="sm"
                />
              </template>
              <div class="space-y-2">
                <template
                  v-for="(part, index) in message.parts"
                  :key="`${message.id}-${part.type}-${index}`"
                >
                  <UChatReasoning
                    v-if="part.type === 'reasoning'"
                    :text="part.text"
                    :streaming="
                      chat.status === 'streaming' &&
                      message.id === chat.messages[chat.messages.length - 1]?.id
                    "
                  >
                    <MDC
                      v-if="part.type === 'reasoning'"
                      :value="part.text"
                      :cache-key="`reasoning-${message.id}-${index}`"
                      class="*:first:mt-0 *:last:mb-0 whitespace-pre-wrap text-sm"
                    />
                  </UChatReasoning>

                  <template v-else-if="part.type === 'text'">
                    <MDC
                      v-if="part.text"
                      :value="part.text"
                      :cache-key="message.id"
                      class="*:first:mt-0 *:last:mb-0 whitespace-pre-wrap text-sm leading-7"
                    />
                    <UChatShimmer
                      v-if="
                        chat.status === 'streaming' &&
                        message.id ===
                          chat.messages[chat.messages.length - 1]?.id &&
                        !part.text
                      "
                      text=""
                    />
                  </template>
                </template>
              </div>
            </UChatMessage>
          </UChatMessages>
        </div>
      </div>

      <div class="px-4 py-4">
        <div class="mx-auto max-w-3xl">
          <UChatPrompt
            v-model="inputMessage"
            :rows="1"
            :maxrows="6"
            autoresize
            variant="subtle"
            :disabled="!activeSessionId || !chat"
            :placeholder="
              activeSessionId
                ? '告诉虾米接下来该先做什么...'
                : '请先选择会话...'
            "
            :ui="{
              body: 'text-sm leading-7',
              footer: ' px-3 py-2',
            }"
            @submit="handleSubmit"
          >
            <template #footer>
              <p class="text-xs text-muted">使用 AI SDK 流式接口，</p>
              <UChatPromptSubmit
                v-if="chat"
                :status="chat.status"
                size="lg"
                class="shrink-0"
                :disabled="!inputMessage.trim()"
                @stop="chat.stop()"
                @reload="chat.regenerate()"
              />
            </template>
          </UChatPrompt>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { Chat } from "@ai-sdk/vue";
import { DefaultChatTransport } from "ai";
import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import type {
  ChatSessionRecord,
  ChatSessionDetailResponse,
  ClawmeUIMessage,
} from "~~/shared/types/clawme";

// Typed UIMessage with custom metadata

const toast = useToast();

const props = defineProps<{
  activeSessionId: string | null;
  sessions: ChatSessionRecord[];
}>();

const activeSessionId = ref<string | null>(props.activeSessionId);

// Use global actors cache
const { getActor, fetchActors } = useActors();

watch(
  () => props.activeSessionId,
  (value) => {
    activeSessionId.value = value;
  },
  { immediate: true },
);

const inputMessage = ref("");

// Initialize Chat instance
const chat = ref<Chat<ClawmeUIMessage> | null>(null);

onMounted(async () => {
  if (activeSessionId.value) {
    await initializeChat();
  }
});

watch(activeSessionId, async (id) => {
  if (id) {
    await initializeChat();
  } else {
    chat.value = null;
  }
});

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
    await fetchActors(userIds);

    // Get receiverId from participants (not current user)
    const receiverId = response.participants.find(
      (p) => p.id !== currentUser.value?.id,
    )?.id;

    if (!receiverId) {
      throw new Error("Receiver not found in participants");
    }

    // Cast parts to UIMessagePart array for AI SDK compatibility
    const messages = response.messages as ClawmeUIMessage[];

    chat.value = new Chat({
      id: activeSessionId.value,
      messages,
      transport: new DefaultChatTransport({
        api: `/api/chat/session/${activeSessionId.value}`,
        body: { receiverId },
      }),
      onError(error) {
        toast.add({
          title: "聊天出错",
          description: error.message,
          color: "error",
          icon: "i-lucide-triangle-alert",
        });
      },
    });
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
  if (!inputMessage.value.trim() || !chat.value) return;

  chat.value?.sendMessage({ text: inputMessage.value });
  inputMessage.value = "";
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
    side: isCurrentUser ? "right" : "left",
    variant: isCurrentUser ? "soft" : "naked",
    avatar: {
      src: user?.avatar ?? undefined,
      alt: user?.nickname ?? (isCurrentUser ? "用户" : "助手"),
    },
  };
}
</script>
