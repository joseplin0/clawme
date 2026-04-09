<template>
  <div
class="shrink-0 w-full border-t border-default/50 bg-white py-4 dark:bg-gray-900"
    :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }">
    <div class="flex flex-col">
      <input
ref="fileInputRef" type="file" class="hidden" multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.zip,.rar,.7z"
        @change="handleFileChange">

      <div
v-if="quotedMessage" data-testid="quoted-message-banner"
        class="mb-2 ml-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 self-start rounded-xl border border-default/35 bg-default/14 px-2.5 py-1.5">
        <div class="min-w-0">
          <p class="truncate text-[12px] leading-4 text-default/68">
            <span class="text-default/68">{{ quotedMessage.senderName }}</span>
            <span class="px-0.5 text-muted">:</span>
            <span>{{ quotedPreviewText }}</span>
          </p>
        </div>
        <UButton
icon="i-lucide-x" variant="ghost" color="neutral" size="xs" aria-label="清除引用"
          class="shrink-0 rounded-full opacity-65" @click="emit('clear-quote')" />
      </div>

      <div v-if="attachments.length" class="mb-3 flex flex-wrap gap-2 px-4">
        <div
v-for="(attachment, index) in attachments" :key="`${attachment.filename}-${attachment.size}-${index}`"
          class="flex items-center gap-3 rounded-xl border border-default/60 bg-default/40 px-3 py-2">
          <img
v-if="attachment.type === 'image'" :src="attachment.url" :alt="attachment.filename"
            class="h-12 w-12 rounded-lg object-cover">
          <div v-else class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon name="i-lucide-file" class="h-5 w-5" />
          </div>

          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-default">
              {{ attachment.filename }}
            </p>
            <p class="text-xs text-muted">
              {{ formatFileSize(attachment.size) }}
            </p>
          </div>

          <UButton
icon="i-lucide-x" variant="ghost" color="neutral" size="xs" class="rounded-full"
            @click="removeAttachment(index)" />
        </div>
      </div>

      <!-- Input Area -->
      <div class="flex-1 w-full flex">
        <UEditor
ref="editorRef" v-model="editorContent" :editable="ready" :image="false" :enable-input-rules="false"
          :placeholder="placeholder" :starter-kit="editorStarterKit" :editor-props="editorInputProps" :ui="{

            content: 'min-h-[80px] max-h-[240px] overflow-y-auto py-0 px-4',
            base: 'w-full h-full sm:px-0 text-[15px] leading-relaxed outline-none [&_p]:my-0 [&_.mention]:font-medium text-default bg-transparent',
          }" class="flex w-full flex-col" @update:model-value="syncInputMessage">
          <template #default="{ editor }">
            <UEditorMentionMenu
:editor="editor" :items="mentionItems"
              :filter-fields="['label', 'description', 'searchText']" :limit="6" />
          </template>
        </UEditor>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between px-4 pb-2">
        <div class="flex items-center gap-1">
          <UButton
icon="i-lucide-paperclip" variant="ghost" color="neutral" size="sm"
            class="rounded-md px-2 text-muted" :disabled="!ready || status !== 'ready'" @click="openFilePicker" />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-muted/60 hidden sm:inline-block mr-2">按 Enter 发送，Shift + Enter 换行</span>
          <UChatPromptSubmit
:status="status" type="button" size="md" color="primary" variant="solid"
            class="rounded-md flex items-center justify-center transition-transform active:scale-95 px-4 h-9 font-medium shadow-sm shadow-primary/20"
            :disabled="isPromptActionDisabled" @click="handlePromptAction" @mousedown.prevent @stop="emit('stop')"
            @reload="emit('reload')">
            发送
          </UChatPromptSubmit>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { ChatStatus } from "ai";
import type { EditorMentionMenuItem } from "@nuxt/ui";
import type { FilePart, ImagePart } from "~~/shared/types/clawme";

type EditorHandle = {
  getText: (options?: { blockSeparator?: string }) => string;
  setEditable: (editable: boolean, emitUpdate?: boolean) => void;
  commands: {
    clearContent: (emitUpdate?: boolean) => void;
    focus: () => void;
  };
};

type ComposerAttachment = ImagePart | FilePart;
type ComposerSubmitPayload = {
  text: string;
  attachments: ComposerAttachment[];
  quotedMessageId?: string;
  quotedExcerpt?: string;
};

const props = defineProps<{
  ready: boolean;
  status: ChatStatus;
  mentionItems: EditorMentionMenuItem[];
  placeholder: string;
  quotedMessage?: {
    id: string;
    senderName: string;
    previewText: string;
  } | null;
}>();

const emit = defineEmits<{
  (e: "submit", payload: ComposerSubmitPayload): void;
  (e: "stop" | "reload" | "clear-quote"): void;
}>();

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 5;

const toast = useToast();
const editorContent = ref("");
const inputMessage = ref("");
const attachments = ref<ComposerAttachment[]>([]);
const editorRef = ref<{
  editor?: EditorHandle;
} | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const editorStarterKit = {
  blockquote: false as const,
  bold: false as const,
  bulletList: false as const,
  code: false as const,
  codeBlock: false as const,
  heading: false as const,
  horizontalRule: false as const,
  italic: false as const,
  orderedList: false as const,
  strike: false as const,
};

const editorInputProps = {
  handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing
    ) {
      return false;
    }

    submit();
    return true;
  },
};

function isComposerAttachment(
  attachment: ComposerAttachment | null,
): attachment is ComposerAttachment {
  return attachment !== null;
}

const isPromptActionDisabled = computed(() => {
  if (!props.ready) {
    return true;
  }

  return props.status === "ready"
    ? !inputMessage.value.trim() && attachments.value.length === 0
    : false;
});
const quotedPreviewText = computed(() => props.quotedMessage?.previewText || "");

watch(
  [() => props.ready, () => editorRef.value?.editor],
  async ([ready, editor]) => {
    await nextTick();
    editor?.setEditable(ready, false);
  },
  { immediate: true },
);

function syncInputMessage() {
  const editor = editorRef.value?.editor;
  inputMessage.value = editor?.getText({ blockSeparator: "\n" }) ?? "";
}

function handlePromptAction() {
  if (props.status === "ready") {
    submit();
  }
}

function openFilePicker() {
  if (!props.ready || props.status !== "ready") {
    return;
  }

  fileInputRef.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const files = Array.from(input?.files ?? []);

  if (!files.length) {
    return;
  }

  const availableSlots = MAX_ATTACHMENT_COUNT - attachments.value.length;
  if (availableSlots <= 0) {
    toast.add({
      title: "附件数量已达上限",
      description: `单次最多发送 ${MAX_ATTACHMENT_COUNT} 个附件`,
      color: "warning",
      icon: "i-lucide-paperclip",
    });
    resetFileInput();
    return;
  }

  const nextFiles = files.slice(0, availableSlots);

  if (files.length > nextFiles.length) {
    toast.add({
      title: "部分附件未加入",
      description: `单次最多发送 ${MAX_ATTACHMENT_COUNT} 个附件`,
      color: "warning",
      icon: "i-lucide-paperclip",
    });
  }

  const converted = await Promise.all(
    nextFiles.map(async (file) => {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.add({
          title: "附件过大",
          description: `${file.name} 超过 ${formatFileSize(MAX_ATTACHMENT_SIZE)}，暂不支持发送`,
          color: "error",
          icon: "i-lucide-file-warning",
        });
        return null;
      }

      try {
        return await uploadFile(file);
      } catch (error) {
        toast.add({
          title: "附件上传失败",
          description: error instanceof Error ? error.message : `${file.name} 上传失败`,
          color: "error",
          icon: "i-lucide-cloud-off",
        });
        return null;
      }
    }),
  );

  attachments.value = [
    ...attachments.value,
    ...converted.filter(isComposerAttachment),
  ];
  resetFileInput();
}

function resetFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
  }
}

function removeAttachment(index: number) {
  attachments.value = attachments.value.filter((_, current) => current !== index);
}

function submit() {
  if (!props.ready || props.status !== "ready") {
    return;
  }

  const text = inputMessage.value.trim();
  const currentAttachments = [...attachments.value];

  if (!text && currentAttachments.length === 0) {
    return;
  }

  emit("submit", {
    text,
    attachments: currentAttachments,
    quotedMessageId: props.quotedMessage?.id,
    quotedExcerpt: props.quotedMessage?.previewText,
  });
  void clearComposer();
}

async function clearComposer() {
  const editor = editorRef.value?.editor;
  attachments.value = [];
  resetFileInput();

  if (!editor) {
    editorContent.value = "";
    inputMessage.value = "";
    return;
  }

  editor.commands.clearContent(true);
  await nextTick();
  syncInputMessage();

  if (props.ready) {
    editor.commands.focus();
  }
}

async function uploadFile(file: File): Promise<ComposerAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await $fetch<{
    success: boolean;
    assetId: string;
    url: string;
    mimeType: string;
    originalName: string;
    size: number;
  }>("/api/upload", {
    method: "POST",
    body: formData,
  });

  const mediaType = response.mimeType || file.type || "application/octet-stream";

  if (file.type.startsWith("image/")) {
    return {
      type: "image",
      assetId: response.assetId,
      url: response.url,
      mediaType,
      filename: response.originalName,
      size: response.size,
    };
  }

  return {
    type: "file",
    assetId: response.assetId,
    url: response.url,
    mediaType,
    filename: response.originalName,
    size: response.size,
  };
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
</script>
