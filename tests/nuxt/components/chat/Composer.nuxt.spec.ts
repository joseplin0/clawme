import { mountSuspended, mockComponent } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { defineComponent, h, ref, watch } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Composer from "~~/app/components/chat/Composer.vue";

mockComponent("UEditor", defineComponent({
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    editable: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["update:modelValue", "update:model-value"],
  setup(props, { emit, expose, slots }) {
    const content = ref(props.modelValue);
    const editableState = ref(props.editable);

    watch(
      () => props.modelValue,
      (value) => {
        content.value = value;
      },
      { immediate: true },
    );

    watch(
      () => props.editable,
      (value) => {
        editableState.value = value;
      },
      { immediate: true },
    );

    const editor = {
      getText: () => content.value,
      setEditable: (editable: boolean) => {
        editableState.value = editable;
      },
      commands: {
        clearContent: () => {
          content.value = "";
          emit("update:modelValue", "");
          emit("update:model-value", "");
        },
        focus: () => undefined,
      },
    };

    expose({ editor });

    return () =>
      h("div", { "data-testid": "editor-wrapper" }, [
        h("textarea", {
          "data-testid": "editor",
          value: content.value,
          disabled: !editableState.value,
          onInput: (event: Event) => {
            const value = (event.target as HTMLTextAreaElement).value;
            content.value = value;
            emit("update:modelValue", value);
            emit("update:model-value", value);
          },
        }),
        slots.default?.({ editor }),
      ]);
  },
}));

mockComponent("UEditorMentionMenu", {
  template: "<div data-testid=\"mention-menu\" />",
});

mockComponent("UButton", {
  emits: ["click"],
  template: "<button data-testid=\"button\" @click=\"$emit('click')\"><slot /></button>",
});

mockComponent("UIcon", {
  template: "<span data-testid=\"icon\" />",
});

mockComponent("UChatPromptSubmit", {
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "ready",
    },
  },
  emits: ["click", "stop", "reload"],
  template: `
    <button
      data-testid="prompt"
      :disabled="disabled"
      :data-status="status"
      @click="$emit('click')"
    >
      发送
    </button>
  `,
});

describe("ChatComposer", () => {
  beforeEach(() => {
    vi.stubGlobal("$fetch", vi.fn(async () => ({
      success: true,
      assetId: "asset-1",
      url: "/api/files/uploaded-demo.txt",
      mimeType: "text/plain",
      originalName: "demo.txt",
      size: 5,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("在可发送时提交修剪后的文本并清空输入框", async () => {
    const wrapper = await mountSuspended(Composer, {
      props: {
        ready: true,
        status: "ready",
        placeholder: "告诉虾米接下来该先做什么...",
        mentionItems: [],
      },
    });

    await wrapper.get('[data-testid="editor"]').setValue("  你好，虾米  ");

    expect(wrapper.get('[data-testid="prompt"]').attributes("disabled")).toBe(
      undefined,
    );

    await wrapper.get('[data-testid="prompt"]').trigger("click");
    await flushPromises();

    expect(wrapper.emitted("submit")).toEqual([[
      {
        text: "你好，虾米",
        attachments: [],
        quotedMessageId: undefined,
        quotedExcerpt: undefined,
      },
    ]]);
    expect(
      (wrapper.get('[data-testid="editor"]').element as HTMLTextAreaElement)
        .value,
    ).toBe("");
  });

  it("支持仅发送附件消息", async () => {
    const wrapper = await mountSuspended(Composer, {
      props: {
        ready: true,
        status: "ready",
        placeholder: "发送消息...",
        mentionItems: [],
      },
    });

    const fileInput = wrapper.get('input[type="file"]');
    const file = new File(["hello"], "demo.txt", { type: "text/plain" });

    Object.defineProperty(fileInput.element, "files", {
      configurable: true,
      value: [file],
    });

    await fileInput.trigger("change");
    await flushPromises();

    await wrapper.get('[data-testid="prompt"]').trigger("click");
    await flushPromises();

    const submitEvent = wrapper.emitted("submit")?.[0]?.[0] as {
      text: string;
      quotedMessageId?: string;
      quotedExcerpt?: string;
      attachments: Array<{ type: string; assetId?: string; filename: string; url: string }>;
    };

    expect(submitEvent.text).toBe("");
    expect(submitEvent.attachments).toHaveLength(1);
    expect(submitEvent.attachments[0]).toMatchObject({
      type: "file",
      assetId: "asset-1",
      filename: "demo.txt",
      url: "/api/files/uploaded-demo.txt",
    });
    expect(submitEvent.quotedMessageId).toBeUndefined();
    expect(submitEvent.quotedExcerpt).toBeUndefined();
  });

  it("在未就绪时禁用输入与发送按钮", async () => {
    const wrapper = await mountSuspended(Composer, {
      props: {
        ready: false,
        status: "ready",
        placeholder: "请先选择房间...",
        mentionItems: [],
      },
    });

    expect(
      (wrapper.get('[data-testid="editor"]').element as HTMLTextAreaElement)
        .disabled,
    ).toBe(true);
    expect(wrapper.get('[data-testid="prompt"]').attributes("disabled")).toBe(
      "",
    );
  });

  it("以弱提示条展示引用消息并支持清除", async () => {
    const wrapper = await mountSuspended(Composer, {
      props: {
        ready: true,
        status: "ready",
        placeholder: "发送消息...",
        mentionItems: [],
        quotedMessage: {
          id: "message-1",
          senderName: "小林",
          previewText: "这是被引用的一小段内容",
        },
      },
    });

    const banner = wrapper.get('[data-testid="quoted-message-banner"]');
    expect(banner.text()).toContain("小林");
    expect(banner.text()).toContain("这是被引用的一小段内容");

    await wrapper.get('button[aria-label="清除引用"]').trigger("click");

    expect(wrapper.emitted("clear-quote")).toEqual([[]]);
  });
});
