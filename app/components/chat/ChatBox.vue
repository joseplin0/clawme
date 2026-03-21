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
            :messages="chat.messages"
            :status="chat.status"
            should-auto-scroll
            :spacing-offset="80"
            :assistant="assistantMessageProps"
            :user="userMessageProps"
            class="space-y-4"
          >
            <template #content="{ message }">
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
            </template>
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
import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from "ai";
import ChatList from "~/components/chat/ChatList.vue";
import type {
  ChatSessionRecord,
  ChatMessageRecord,
} from "~~/shared/types/clawme";

const bootstrap = useState<PublicStateResponse | null>("bootstrap-state");
const toast = useToast();

const props = defineProps<{
  activeSessionId: string | null;
}>();

const emit = defineEmits<{
  "update:activeSessionId": [value: string | null];
}>();

const { data: sessionData, refresh: refreshSessionData } =
  await useFetch<ChatSessionResponse>("/api/chat/session");

const activeSessionId = ref<string | null>(props.activeSessionId);

watch(
  () => props.activeSessionId,
  (value) => {
    activeSessionId.value = value;
  },
  { immediate: true },
);

// Load messages when session changes
watch(
  activeSessionId,
  async (id) => {
    if (id) {
      await loadSessionMessages();
    }
  },
  { immediate: true },
);

const state = computed(() => sessionData.value?.state);
const sessions = computed(() => state.value?.sessions ?? []);
const owner = computed(() => state.value?.owner);
const assistant = computed(() => state.value?.bot);

const inputMessage = ref("");

// Initialize Chat instance
const chat = ref<Chat<UIMessage> | null>(null);

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
    const response = await $fetch<{
      id: string;
      title: string;
      messages: {
        id: string;
        role: string;
        parts: unknown[];
        createdAt: string;
      }[];
    }>(`/api/chat/session/${activeSessionId.value}`);

    const messages: UIMessage[] = response.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: m.parts as UIMessagePart<UIDataTypes, UITools>[],
    }));

    chat.value = new Chat({
      id: activeSessionId.value,
      messages,
      transport: new DefaultChatTransport({
        api: `/api/chat/session/${activeSessionId.value}`,
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

async function loadSessionMessages() {
  if (!activeSessionId.value) return;

  try {
    const response = await $fetch<{
      id: string;
      title: string;
      messages: {
        id: string;
        role: string;
        parts: unknown[];
        createdAt: string;
      }[];
    }>(`/api/chat/session/${activeSessionId.value}`);

    const messages: UIMessage[] = response.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: m.parts as UIMessagePart<UIDataTypes, UITools>[],
    }));

    if (chat.value) {
      chat.value.messages = messages;
    }
  } catch (error) {
    console.error("Failed to load messages:", error);
  }
}

function handleSubmit() {
  if (!inputMessage.value.trim() || !chat.value) return;

  chat.value?.sendMessage({ text: inputMessage.value });
  inputMessage.value = "";
}

const selectedSession = computed(
  () => sessions.value.find((s) => s.id === activeSessionId.value) ?? null,
);

const ownerName = computed(() => owner.value?.nickname ?? "用户");
const assistantName = computed(() => assistant.value?.nickname ?? "虾米");

const userMessageProps = computed(() => ({
  side: "right" as const,
  variant: "soft" as const,
  avatar: {
    src: owner.value?.avatar ?? undefined,
    alt: ownerName.value,
    icon: owner.value?.avatar ? undefined : "i-lucide-user-round",
  },
}));

const assistantMessageProps = computed(() => ({
  side: "left" as const,
  variant: "naked" as const,
  avatar: {
    src: assistant.value?.avatar ?? undefined,
    alt: assistantName.value,
    icon: assistant.value?.avatar ? undefined : "i-lucide-shell",
  },
}));
</script>
