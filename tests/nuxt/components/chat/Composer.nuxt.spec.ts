import { mountSuspended, mockComponent } from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { defineComponent, h, ref, watch } from "vue";
import { describe, expect, it } from "vitest";
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

    expect(wrapper.emitted("submit")).toEqual([["你好，虾米"]]);
    expect(
      (wrapper.get('[data-testid="editor"]').element as HTMLTextAreaElement)
        .value,
    ).toBe("");
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
});
