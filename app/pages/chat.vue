<template>
  <div class="relative flex h-full w-full overflow-hidden bg-white/75">
    <aside
      :class="[
        'absolute z-10 flex h-full w-full shrink-0 flex-col border-r border-muted/70 bg-white/92 backdrop-blur transition-transform duration-300 md:relative md:w-80',
        activeSessionId ? '-translate-x-full md:translate-x-0' : 'translate-x-0',
      ]"
    >
      <div class="border-b border-muted/70 px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-muted">Chat Sessions</p>
            <h1 class="text-xl font-semibold text-highlighted">协作会话</h1>
          </div>
          <UBadge color="primary" variant="subtle">SSE</UBadge>
        </div>
      </div>

      <div class="flex-1 space-y-2 overflow-y-auto p-3">
        <button
          v-for="session in sessions"
          :key="session.id"
          type="button"
          class="w-full rounded-2xl border p-3 text-left transition-all duration-300"
          :class="
            activeSessionId === session.id
              ? 'border-primary/30 bg-primary/8 shadow-[0_18px_48px_-36px_rgba(201,70,45,0.7)]'
              : 'border-transparent bg-muted/30 hover:border-muted hover:bg-white'
          "
          @click="activeSessionId = session.id"
        >
          <div class="flex items-center gap-3">
            <UAvatar
              size="md"
              :ui="{ wrapper: 'bg-gradient-to-br from-clawme-500 to-amber-300' }"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-3">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ session.title }}
                </p>
                <span class="text-xs text-muted">
                  {{ formatRelativeTime(getLastMessage(session.id)?.updatedAt) }}
                </span>
              </div>
              <p class="mt-1 truncate text-sm text-muted">
                {{ getLastMessage(session.id)?.content || "这条会话刚刚初始化。" }}
              </p>
            </div>
          </div>
        </button>
      </div>
    </aside>

    <section
      :class="[
        'absolute inset-0 z-20 flex h-full flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(224,93,68,0.08),transparent_28%),linear-gradient(180deg,#fffaf7_0%,#ffffff_44%)] transition-transform duration-300 md:relative',
        activeSessionId ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
      ]"
    >
      <div
        v-if="!activeSessionId"
        class="hidden h-full items-center justify-center text-center md:flex"
      >
        <div class="space-y-3">
          <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-muted/45">
            <UIcon name="i-lucide-message-circle" class="size-8 text-muted" />
          </div>
          <p class="text-base font-medium text-highlighted">选择一条会话开始协作</p>
          <p class="text-sm text-muted">SSE 占位链路已经接好，下一条消息会走真实流式界面。</p>
        </div>
      </div>

      <template v-else>
        <header class="flex h-[76px] items-center justify-between border-b border-muted/70 bg-white/85 px-4 backdrop-blur">
          <div class="flex items-center gap-3">
            <UButton
              icon="i-lucide-arrow-left"
              variant="ghost"
              size="sm"
              class="md:hidden"
              @click="activeSessionId = null"
            />
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-muted">Direct Session</p>
              <h2 class="text-lg font-semibold text-highlighted">
                {{ selectedSession?.title || "默认会话" }}
              </h2>
            </div>
          </div>
          <UButton variant="outline" color="neutral" icon="i-lucide-shell">
            Feed Draft
          </UButton>
        </header>

        <div class="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
          <div class="mx-auto max-w-3xl space-y-4">
            <div class="flex justify-center">
              <UBadge color="neutral" variant="subtle">
                {{ ownerName }} 与 {{ assistantName }} 的默认工作会话
              </UBadge>
            </div>

            <div
              v-for="message in displayedMessages"
              :key="message.id"
              :class="isOwnerMessage(message) ? 'flex justify-end' : 'flex justify-start'"
            >
              <div
                :class="
                  isOwnerMessage(message)
                    ? 'max-w-xl rounded-[1.6rem] rounded-tr-sm bg-primary px-4 py-3 text-sm leading-7 text-inverted shadow-[0_20px_40px_-28px_rgba(201,70,45,0.9)]'
                    : 'max-w-2xl rounded-[1.6rem] rounded-bl-sm border border-muted/70 bg-white px-4 py-3 text-sm leading-7 text-default shadow-[0_18px_40px_-34px_rgba(40,32,28,0.45)]'
                "
              >
                <div class="mb-1 flex items-center gap-2 text-xs">
                  <span :class="isOwnerMessage(message) ? 'text-white/80' : 'text-muted'">
                    {{ isOwnerMessage(message) ? ownerName : assistantName }}
                  </span>
                  <span
                    v-if="message.status === 'GENERATING'"
                    :class="isOwnerMessage(message) ? 'text-white/70' : 'text-primary'"
                  >
                    正在生成...
                  </span>
                </div>

                <p class="whitespace-pre-wrap">
                  {{ message.content || (message.status === 'GENERATING' ? '正在整理回复...' : '') }}
                </p>

                <details
                  v-if="message.thinkingContent && !isOwnerMessage(message)"
                  class="mt-3 rounded-2xl bg-muted/45 p-3 text-xs text-toned"
                >
                  <summary class="cursor-pointer font-medium text-highlighted">思考面板</summary>
                  <p class="mt-2 whitespace-pre-wrap leading-6">
                    {{ message.thinkingContent }}
                  </p>
                </details>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-muted/70 bg-white/88 px-4 py-4 backdrop-blur">
          <div class="mx-auto max-w-3xl">
            <div class="rounded-[1.75rem] border border-muted/70 bg-white p-2 shadow-[0_24px_56px_-40px_rgba(40,32,28,0.5)]">
              <div class="flex items-end gap-2">
                <UTextarea
                  v-model="inputMessage"
                  autoresize
                  :rows="1"
                  :maxrows="6"
                  class="flex-1"
                  :ui="{
                    base: 'min-h-[48px] resize-none border-none bg-transparent px-3 py-2 text-sm leading-7 text-default shadow-none focus:ring-0',
                    wrapper: 'flex-1',
                  }"
                  placeholder="告诉虾米接下来该先做什么..."
                  @keydown.enter.exact.prevent="sendMessage"
                />
                <UButton
                  icon="i-lucide-send-horizontal"
                  size="lg"
                  class="shrink-0"
                  :loading="isStreaming"
                  :disabled="!trimmedInput"
                  @click="sendMessage"
                />
              </div>
            </div>
            <p class="mt-3 text-xs text-muted">
              这条输入会走 Phase 1 的 SSE 占位链路：先预创建消息，再流式返回内容，最后收尾落盘。
            </p>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import type {
  ChatMessageRecord,
  ChatSessionResponse,
  PublicStateResponse,
} from "~/shared/types/clawme";

type StreamEvent = {
  event: string;
  data: string;
};

const bootstrap = useState<PublicStateResponse | null>("bootstrap-state");
const toast = useToast();
const inputMessage = ref("");
const isStreaming = ref(false);
const streamDraft = ref<ChatMessageRecord | null>(null);
const optimisticMessages = ref<ChatMessageRecord[]>([]);

const { data: sessionData, refresh } = await useFetch<ChatSessionResponse>("/api/chat/session");

const activeSessionId = ref<string | null>(sessionData.value?.activeSessionId ?? null);

watch(
  () => sessionData.value?.activeSessionId,
  (value) => {
    if (!activeSessionId.value && value) {
      activeSessionId.value = value;
    }
  },
  { immediate: true },
);

const state = computed(() => sessionData.value?.state);
const sessions = computed(() => state.value?.sessions ?? []);
const selectedSession = computed(() =>
  sessions.value.find((session) => session.id === activeSessionId.value) ?? null,
);
const owner = computed(() => state.value?.owner ?? bootstrap.value?.state.owner ?? null);
const bot = computed(() => state.value?.bot ?? bootstrap.value?.state.bot ?? null);
const ownerName = computed(() => owner.value?.nickname ?? "林");
const assistantName = computed(() => bot.value?.nickname ?? "虾米");
const trimmedInput = computed(() => inputMessage.value.trim());

const persistedMessages = computed(() =>
  (state.value?.messages ?? [])
    .filter((message) => message.sessionId === activeSessionId.value)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
);

const displayedMessages = computed(() => {
  const items = [...persistedMessages.value, ...optimisticMessages.value];

  if (streamDraft.value?.sessionId === activeSessionId.value) {
    const existingIndex = items.findIndex((message) => message.id === streamDraft.value?.id);

    if (existingIndex >= 0) {
      items.splice(existingIndex, 1, streamDraft.value);
    } else {
      items.push(streamDraft.value);
    }
  }

  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
});

function isOwnerMessage(message: ChatMessageRecord) {
  return message.senderId === owner.value?.id;
}

function getLastMessage(sessionId: string) {
  return [...(state.value?.messages ?? [])]
    .filter((message) => message.sessionId === sessionId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function formatRelativeTime(value?: string) {
  if (!value) {
    return "刚刚";
  }

  const deltaMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );

  if (deltaMinutes < 1) {
    return "刚刚";
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes} 分钟前`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  return `${deltaHours} 小时前`;
}

function parseSseBlocks(buffer: string) {
  const parts = buffer.split("\n\n");
  return {
    complete: parts.slice(0, -1),
    remainder: parts.at(-1) ?? "",
  };
}

function parseStreamEvent(block: string): StreamEvent | null {
  const lines = block.split("\n").filter(Boolean);
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }

    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }

  if (!data) {
    return null;
  }

  return { event, data };
}

function buildOptimisticUserMessage(prompt: string): ChatMessageRecord {
  const now = new Date().toISOString();

  return {
    id: `temp-user-${Date.now()}`,
    sessionId: activeSessionId.value as string,
    senderId: owner.value?.id ?? "owner",
    content: prompt,
    status: "DONE",
    thinkingContent: null,
    replyToId: null,
    isImported: false,
    externalSource: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function sendMessage() {
  if (!trimmedInput.value || !activeSessionId.value || isStreaming.value) {
    return;
  }

  const prompt = trimmedInput.value;
  optimisticMessages.value.push(buildOptimisticUserMessage(prompt));
  inputMessage.value = "";
  isStreaming.value = true;

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        sessionId: activeSessionId.value,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Chat stream failed with status ${response.status}.`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const { complete, remainder } = parseSseBlocks(buffer);
      buffer = remainder;

      for (const block of complete) {
        const parsed = parseStreamEvent(block);

        if (!parsed) {
          continue;
        }

        const payload = JSON.parse(parsed.data);

        if (parsed.event === "placeholder") {
          streamDraft.value = payload.message;
        }

        if (parsed.event === "delta" && streamDraft.value) {
          streamDraft.value = {
            ...streamDraft.value,
            content: `${streamDraft.value.content}${payload.chunk}`,
          };
        }

        if (parsed.event === "done") {
          streamDraft.value = payload.message;
        }

        if (parsed.event === "error") {
          throw new Error("Stream generation failed on the server.");
        }
      }
    }

    await refresh();
    optimisticMessages.value = [];
    streamDraft.value = null;
  } catch (error) {
    toast.add({
      title: "消息发送失败",
      description: error instanceof Error ? error.message : "未知错误",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    isStreaming.value = false;
  }
}
</script>
