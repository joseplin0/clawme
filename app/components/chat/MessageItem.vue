<template>
  <UChatMessage
    :id="message.id"
    :role="message.role"
    :parts="message.parts"
    v-bind="displayProps"
  >
    <template #content>
      <div
        v-if="message.metadata?.quotedMessage"
        class="mb-2 rounded-xl border border-default/50 bg-default/15 px-2.5 py-1.5"
      >
        <p class="text-[11px] font-medium text-primary/80">
          {{ getQuotedSenderName(message) }}
        </p>
        <p class="mt-0.5 truncate text-[12px] leading-4 text-muted">
          {{ getQuotedPreview(message.metadata.quotedMessage) }}
        </p>
      </div>

      <div class="relative" @mouseup="handleMouseUp">
        <template
          v-for="(part, index) in getLeadingMessageParts(message)"
          :key="`${message.id}-${part.type}-${index}`"
        >
          <UChatReasoning
            v-if="isReasoningUIPart(part)"
            :text="part.text"
            :streaming="getReasoningStreaming(index)"
            class="mb-2 text-sm opacity-90"
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
            class="mb-2 text-sm opacity-90"
          />
          <div
            v-else-if="isImageMessagePart(part)"
            data-testid="message-image"
            class="mb-2 w-full max-w-xs overflow-hidden rounded-2xl border border-default/60 bg-default/20 sm:max-w-sm"
          >
            <img
              :src="part.url"
              :alt="part.filename"
              class="max-h-56 w-full object-cover"
            >
            <div class="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted">
              <span class="truncate">{{ part.filename }}</span>
              <span>{{ formatFileSize(part.size) }}</span>
            </div>
          </div>
          <a
            v-else-if="isFileMessagePart(part)"
            :href="part.url"
            :download="part.filename"
            target="_blank"
            rel="noreferrer"
            class="mb-2 flex items-center gap-3 rounded-2xl border border-default/60 bg-default/20 px-3 py-3 transition-colors hover:bg-default/30"
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-file" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-default">{{ part.filename }}</p>
              <p class="text-xs text-muted">{{ formatFileSize(part.size) }}</p>
            </div>
            <UIcon name="i-lucide-download" class="h-4 w-4 text-muted" />
          </a>
        </template>

        <div
          v-if="getMessageTextContent(message)"
          data-testid="message-text"
          class="mt-3"
        >
          <MDCCached
            :value="getMessageTextContent(message)"
            :cache-key="`${message.id}-text-content`"
            class="*:first:mt-0 *:last:mb-0"
          />
        </div>

        <div
          v-if="isQuoteSelectionActive"
          class="mt-1 flex justify-end"
        >
          <UButton
            icon="i-lucide-reply"
            variant="soft"
            color="neutral"
            size="xs"
            class="rounded-full px-2 py-1 text-[11px]"
            @mousedown.prevent
            @click="emit('apply-quote-selection')"
          >
            引用
          </UButton>
        </div>
      </div>
    </template>
  </UChatMessage>
</template>

<script setup lang="ts">
import {
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
} from "ai";
import { isToolStreaming } from "@nuxt/ui/utils/ai";
import type {
  ClawmeUIMessage,
  MessagePart,
  QuotedMessageSummary,
} from "~~/shared/types/clawme";
import {
  isFileMessagePart,
  isImageMessagePart,
} from "~~/shared/types/clawme";

const props = defineProps<{
  message: ClawmeUIMessage;
  displayProps: {
    side: "left" | "right";
    variant: "naked";
    avatar: {
      src?: string;
      alt: string;
    };
  };
  isQuoteSelectionActive: boolean;
  getReasoningStreaming: (index: number) => boolean;
  resolveUserName: (userId: string) => string | undefined;
}>();

const emit = defineEmits<{
  "select-quote": [excerpt: string];
  "clear-quote-selection": [];
  "apply-quote-selection": [];
}>();

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

function getQuotedSenderName(message: ClawmeUIMessage) {
  const senderId = message.metadata?.quotedMessage?.senderId;
  return senderId ? props.resolveUserName(senderId) ?? "引用消息" : "引用消息";
}

function getLeadingMessageParts(message: ClawmeUIMessage) {
  return message.parts.filter((part) => !isTextUIPart(part));
}

function getMessageTextContent(message: ClawmeUIMessage) {
  return message.parts
    .filter((part): part is Extract<MessagePart, { type: "text" }> => isTextUIPart(part))
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function handleMouseUp(event: MouseEvent) {
  const container = event.currentTarget as HTMLElement | null;
  const selection = globalThis.getSelection?.();
  const text = selection?.toString().trim() ?? "";

  if (!container || !selection || !text) {
    emit("clear-quote-selection");
    return;
  }

  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  if (!range || !container.contains(range.commonAncestorContainer)) {
    emit("clear-quote-selection");
    return;
  }

  emit("select-quote", clampQuotedExcerpt(text));
}

function clampQuotedExcerpt(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 140 ? `${normalized.slice(0, 140)}...` : normalized;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
</script>
