<template>
  <aside
    :class="[
      'absolute z-10 flex h-full w-full shrink-0 flex-col border-r border-default bg-elevated/30 backdrop-blur transition-transform duration-300 md:relative md:w-80',
      modelValue ? '-translate-x-full md:translate-x-0' : 'translate-x-0',
    ]"
  >
    <div
      class="flex h-16 items-center border-b border-default bg-elevated/50 px-3"
    >
      <div class="flex w-full items-center gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="搜索会话..."
          variant="none"
          class="flex-1"
        />
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          variant="link"
          @click="handleCreateSession"
        />
      </div>
    </div>

    <div class="flex-1 space-y-1 overflow-y-auto">
      <button
        v-for="session in filteredSessions"
        :key="session.id"
        type="button"
        :class="[
          'w-full p-3 text-left transition-all duration-300 hover:bg-elevated/50',
          modelValue === session.id ? 'bg-elevated' : '',
        ]"
        @click="$emit('update:modelValue', session.id)"
      >
        <div class="flex items-center gap-3">
          <UAvatar size="md" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-3">
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ session.title }}
              </p>
              <span class="text-xs text-muted">
                {{ formatRelativeTime(getLastMessage(session.id)?.createdAt) }}
              </span>
            </div>
            <p class="mt-1 truncate text-sm text-muted">
              {{
                getMessageText(getLastMessage(session.id)) ||
                "这条会话刚刚初始化。"
              }}
            </p>
          </div>
        </div>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type {
  ChatSessionRecord,
  ChatMessageRecord,
} from "~~/shared/types/clawme";

const props = defineProps<{
  modelValue: string | null;
  sessions: ChatSessionRecord[];
  messages: ChatMessageRecord[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  create: [];
}>();

const searchQuery = ref("");

const filteredSessions = computed(() => {
  if (!searchQuery.value) return props.sessions;
  const query = searchQuery.value.toLowerCase();
  return props.sessions.filter((s) => s.title.toLowerCase().includes(query));
});

function handleCreateSession() {
  emit("create");
}

function getLastMessage(sessionId: string) {
  return [...props.messages]
    .filter((message) => message.sessionId === sessionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function getMessageText(message: ChatMessageRecord | undefined) {
  if (!message?.parts) return "";
  const textPart = message.parts.find((p) => p.type === "text");
  return textPart?.text || "";
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
</script>
