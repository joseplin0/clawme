<template>
  <div class="min-h-screen px-4 py-6 md:px-6 md:py-10">
    <div class="mx-auto max-w-3xl">
      <UCard>
        <template #header>
          <div class="space-y-1">
            <h1>首次设置</h1>
            <p>按步骤填写必要信息后即可启动 Clawme。</p>
          </div>
        </template>

        <UForm :state="form" class="space-y-6" @submit="handleSubmit">
          <UStepper
            ref="stepper"
            v-model="currentStep"
            :items="stepItems"
            class="gap-6"
          >
            <template #owner>
              <div class="space-y-4">
                <UFormField
                  name="ownerNickname"
                  label="主理人昵称"
                  required
                >
                  <UInput
                    v-model="form.ownerNickname"
                    class="w-full"
                    placeholder="例如：林"
                    required
                  />
                </UFormField>

                <UFormField
                  name="ownerUsername"
                  label="主理人用户名"
                  required
                >
                  <UInput
                    v-model="form.ownerUsername"
                    class="w-full"
                    placeholder="例如：linqiang"
                    required
                  />
                </UFormField>
              </div>
            </template>

            <template #assistant>
              <div class="space-y-4">
                <UFormField
                  name="assistantNickname"
                  label="默认助理昵称"
                  required
                >
                  <UInput
                    v-model="form.assistantNickname"
                    class="w-full"
                    placeholder="例如：虾米"
                    required
                  />
                </UFormField>

                <UFormField
                  name="assistantRole"
                  label="默认助理角色"
                  required
                >
                  <UInput
                    v-model="form.assistantRole"
                    class="w-full"
                    placeholder="例如：本地助理"
                    required
                  />
                </UFormField>

                <UFormField
                  name="assistantBio"
                  label="助理 System Prompt"
                  required
                >
                  <UTextarea
                    v-model="form.assistantBio"
                    class="w-full"
                    :rows="5"
                    :maxrows="8"
                    autoresize
                    required
                  />
                </UFormField>
              </div>
            </template>

            <template #provider>
              <div class="space-y-4">
                <UFormField
                  name="providerName"
                  label="Provider"
                  required
                >
                  <UInput
                    v-model="form.providerName"
                    class="w-full"
                    placeholder="例如：oMLX"
                    required
                  />
                </UFormField>

                <UFormField
                  name="providerBaseUrl"
                  label="Base URL"
                  required
                >
                  <UInput
                    v-model="form.providerBaseUrl"
                    class="w-full"
                    placeholder="http://localhost:8000/v1"
                    required
                  />
                </UFormField>

                <UFormField
                  name="modelId"
                  label="Model ID"
                  required
                >
                  <UInput
                    v-model="form.modelId"
                    class="w-full"
                    placeholder="例如：qwen3.5-8b-instruct"
                    required
                  />
                </UFormField>
              </div>
            </template>
          </UStepper>

          <USeparator />

          <div class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <p>{{ statusMessage }}</p>
              <p class="shrink-0">步骤 {{ stepIndex + 1 }} / {{ stepItems.length }}</p>
            </div>

            <div class="flex justify-center gap-3">
              <UButton
                type="button"
                icon="i-lucide-arrow-left"
                :disabled="stepIndex === 0 || submitting"
                @click="prevStep"
              >
                上一步
              </UButton>

              <UButton
                v-if="!isLastStep"
                type="button"
                trailing-icon="i-lucide-arrow-right"
                :disabled="submitting"
                @click="nextStep"
              >
                下一步
              </UButton>

              <UButton
                v-else
                type="submit"
                icon="i-lucide-rocket"
                :loading="submitting"
              >
                启动 Clawme
              </UButton>
            </div>
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BootstrapRequest, PublicStateResponse } from "~~/shared/types/clawme";

definePageMeta({
  layout: false,
});

type StepValue = "owner" | "assistant" | "provider";

const bootstrap = useState<PublicStateResponse | null>("bootstrap-state");
const toast = useToast();
const stepper = useTemplateRef("stepper");
const submitting = ref(false);
const currentStep = ref<StepValue>("owner");
const statusMessage = ref("按顺序填写 3 个步骤，最后提交即可。");

const stepItems = [
  {
    value: "owner",
    title: "主理人",
    description: "设置 owner 身份。",
    icon: "i-lucide-user-round-cog",
    slot: "owner",
  },
  {
    value: "assistant",
    title: "默认助理",
    description: "设置名称、角色和提示词。",
    icon: "i-lucide-bot",
    slot: "assistant",
  },
  {
    value: "provider",
    title: "模型网关",
    description: "填写 provider、地址和模型。",
    icon: "i-lucide-server",
    slot: "provider",
  },
];

const stepIndex = computed(() =>
  stepItems.findIndex((item) => item.value === currentStep.value),
);
const isLastStep = computed(() => stepIndex.value === stepItems.length - 1);

const form = reactive<BootstrapRequest>({
  ownerNickname: "林",
  ownerUsername: "lin",
  assistantNickname: "虾米",
  assistantRole: "本地助理",
  assistantBio:
    "你是 Clawme 的默认本地助理，擅长把复杂想法拆成可执行任务，并优先稳住系统底座与协作流。",
  providerName: "oMLX",
  providerBaseUrl: "http://localhost:8000/v1",
  modelId: "qwen3-4b-instruct",
});

function nextStep() {
  stepper.value?.next();
}

function prevStep() {
  stepper.value?.prev();
}

async function handleSubmit() {
  if (!isLastStep.value) {
    nextStep();
    return;
  }

  submitting.value = true;
  statusMessage.value = "正在写入系统状态、默认会话与初始动态...";

  try {
    const response = await $fetch<PublicStateResponse>("/api/system/bootstrap", {
      method: "POST",
      body: form,
    });

    bootstrap.value = response;
    statusMessage.value = "初始化完成，正在跳转到 Feed。";
    toast.add({
      title: "Clawme 已点亮",
      description: "默认主理人、助理和模型网关已经初始化。",
      color: "success",
      icon: "i-lucide-check",
    });

    await navigateTo("/feed");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "初始化失败，请检查表单或服务端日志。";

    statusMessage.value = message;
    toast.add({
      title: "初始化失败",
      description: message,
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    submitting.value = false;
  }
}
</script>
