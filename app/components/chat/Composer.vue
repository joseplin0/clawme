<template>
  <div
    class="shrink-0 border-t border-default/50 bg-white dark:bg-gray-900 px-4 py-4 w-full"
    :style="{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }"
  >
    <div class="flex flex-col">
      
      <!-- Input Area -->
      <div class="flex-1 w-full flex">
        <UEditor
          ref="editorRef"
          v-model="editorContent"
          :editable="ready"
          :image="false"
          :enable-input-rules="false"
          :placeholder="placeholder"
          :starter-kit="editorStarterKit"
          :editor-props="editorInputProps"
          :ui="{
            content: 'min-h-[80px] max-h-[240px] overflow-y-auto py-3 px-4',
            base: 'w-full text-[15px] leading-relaxed outline-none [&_p]:my-0 [&_.mention]:font-medium text-default bg-transparent',
          }"
          class="flex w-full flex-col"
          @update:model-value="syncInputMessage"
        >
          <template #default="{ editor }">
            <UEditorMentionMenu
              :editor="editor"
              :items="mentionItems"
              :filter-fields="['label', 'description', 'searchText']"
              :limit="6"
            />
          </template>
        </UEditor>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-between px-2 pb-2">
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-paperclip"
            variant="ghost"
            color="neutral"
            size="sm"
            class="rounded-md px-2 text-muted"
          />
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted/60 hidden sm:inline-block mr-2">按 Enter 发送，Shift + Enter 换行</span>
          <UChatPromptSubmit
            :status="status"
            type="button"
            size="md"
            color="primary"
            variant="solid"
            class="rounded-md flex items-center justify-center transition-transform active:scale-95 px-4 h-9 font-medium shadow-sm shadow-primary/20"
            :disabled="isPromptActionDisabled"
            @click="handlePromptAction"
            @mousedown.prevent
            @stop="emit('stop')"
            @reload="emit('reload')"
          >
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

type EditorHandle = {
  getText: (options?: { blockSeparator?: string }) => string;
  setEditable: (editable: boolean, emitUpdate?: boolean) => void;
  commands: {
    clearContent: (emitUpdate?: boolean) => void;
    focus: () => void;
  };
};

const props = defineProps<{
  ready: boolean;
  status: ChatStatus;
  mentionItems: EditorMentionMenuItem[];
  placeholder: string;
}>();

const emit = defineEmits<{
  submit: [text: string];
  stop: [];
  reload: [];
}>();

const editorContent = ref("");
const inputMessage = ref("");
const editorRef = ref<{
  editor?: EditorHandle;
} | null>(null);

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

const isPromptActionDisabled = computed(() => {
  if (!props.ready) {
    return true;
  }

  return props.status === "ready" ? !inputMessage.value.trim() : false;
});

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

function submit() {
  if (!props.ready || props.status !== "ready") {
    return;
  }

  const text = inputMessage.value.trim();

  if (!text) {
    return;
  }

  emit("submit", text);
  void clearComposer();
}

async function clearComposer() {
  const editor = editorRef.value?.editor;

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
</script>
