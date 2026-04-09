<template>
  <div class="flex flex-col items-center">
    <!-- Header -->
    <div class="w-full text-center space-y-2 mb-10">
      <div
        class="size-[64px] mx-auto bg-[#ff385c] rounded-full flex items-center justify-center text-white text-3xl font-black shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] mb-6"
      >
        <UIcon name="i-lucide-rocket" class="size-[28px]" />
      </div>
      <h1 class="text-[28px] font-bold text-[#222222] tracking-[-0.32px]">
        初始化系统
      </h1>
      <p class="text-[16px] text-[#6a6a6a] font-medium px-4">
        {{ statusMessage }}
      </p>
    </div>

    <!-- Stepper & Form -->
    <UForm :state="form" class="w-full" @submit="handleSubmit">
      <UStepper
        ref="stepper"
        v-model="currentStep"
        :items="stepItems"
        class="mb-8"
        :ui="{
          header: 'mb-6',
          title: 'text-[14px] font-semibold text-[#222222]',
          description: 'hidden',
          indicator: 'size-8 text-[14px]',
        }"
      >
        <!-- Step 1: Owner -->
        <template #owner>
          <div class="space-y-5 py-2">
            <UFormField name="ownerNickname">
              <UInput
                v-model="form.ownerNickname"
                class="w-full"
                placeholder="管理员昵称 (如: 林)"
                icon="i-lucide-contact"
                :ui="{ base: 'h-14 px-4 rounded-lg text-[16px] bg-[#ffffff] border border-[#c1c1c1] focus:border-[#222222] focus:ring-1 focus:ring-[#222222] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] placeholder-[#6a6a6a]' }"
                required
              />
            </UFormField>

            <UFormField name="ownerUsername">
              <UInput
                v-model="form.ownerUsername"
                class="w-full"
                placeholder="登录账号 (如: lin)"
                icon="i-lucide-user"
                :ui="{ base: 'h-14 px-4 rounded-lg text-[16px] bg-[#ffffff] border border-[#c1c1c1] focus:border-[#222222] focus:ring-1 focus:ring-[#222222] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] placeholder-[#6a6a6a]' }"
                required
              />
            </UFormField>

            <UFormField name="ownerPassword">
              <UInput
                v-model="form.ownerPassword"
                class="w-full"
                type="password"
                placeholder="至少 6 位密码"
                icon="i-lucide-lock-keyhole"
                :ui="{ base: 'h-14 px-4 rounded-lg text-[16px] bg-[#ffffff] border border-[#c1c1c1] focus:border-[#222222] focus:ring-1 focus:ring-[#222222] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] placeholder-[#6a6a6a]' }"
                required
              />
            </UFormField>
          </div>
        </template>

        <!-- Step 2: Assistant -->
        <template #assistant>
          <div class="space-y-5 py-2">
            <UFormField name="assistantNickname">
              <UInput
                v-model="form.assistantNickname"
                class="w-full"
                placeholder="助理昵称 (如: 虾米)"
                icon="i-lucide-bot"
                :ui="{ base: 'h-14 px-4 rounded-lg text-[16px] bg-[#ffffff] border border-[#c1c1c1] focus:border-[#222222] focus:ring-1 focus:ring-[#222222] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] placeholder-[#6a6a6a]' }"
                required
              />
            </UFormField>

            <UFormField name="assistantRole">
              <UInput
                v-model="form.assistantRole"
                class="w-full"
                placeholder="助理角色定位 (如: 本地助手)"
                icon="i-lucide-graduation-cap"
                :ui="{ base: 'h-14 px-4 rounded-lg text-[16px] bg-[#ffffff] border border-[#c1c1c1] focus:border-[#222222] focus:ring-1 focus:ring-[#222222] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] placeholder-[#6a6a6a]' }"
                required
              />
            </UFormField>

            <UFormField name="assistantIntro">
              <UTextarea
                v-model="form.assistantIntro"
                class="w-full"
                :rows="3"
                :maxrows="5"
                autoresize
                placeholder="我是用来干嘛的 System Prompt..."
                :ui="{ base: 'rounded-lg text-[16px] bg-[#ffffff] border border-[#c1c1c1] focus:border-[#222222] focus:ring-1 focus:ring-[#222222] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] py-3 px-4 placeholder-[#6a6a6a]' }"
                required
              />
            </UFormField>
          </div>
        </template>

        <!-- Step 3: Provider -->
        <template #provider>
          <div class="py-2">
            <ModelConfigFields
              :state="modelConfigForm"
              field-prefix="setup-model-config"
              name-label="模型配置名称"
            />
          </div>
        </template>
      </UStepper>

      <!-- Buttons -->
      <div class="flex items-center justify-between gap-4 pt-8 mt-4">
        <UButton
          type="button"
          icon="i-lucide-arrow-left"
          variant="soft"
          :disabled="stepIndex === 0 || submitting"
          class="rounded-lg h-12 px-5 font-medium text-[#222222] bg-[#f2f2f2] hover:bg-[#e4e4e4] active:scale-[0.98] transition-all"
          @click="prevStep"
        >
          返回
        </UButton>

        <UButton
          v-if="!isLastStep"
          type="button"
          trailing-icon="i-lucide-arrow-right"
          :disabled="submitting"
          class="rounded-lg h-12 px-6 font-semibold bg-[#222222] hover:bg-[#000000] text-white active:scale-[0.98] transition-all ml-auto"
          @click="nextStep"
        >
          下一步
        </UButton>

        <UButton
          v-else
          type="submit"
          icon="i-lucide-sparkles"
          :loading="submitting"
          class="rounded-lg h-12 px-6 font-semibold bg-[#ff385c] hover:bg-[#e00b41] text-white active:scale-[0.98] transition-all ml-auto"
        >
          启动
        </UButton>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import type {
  BootstrapRequest,
  BootstrapResponse,
} from "~~/shared/types/clawme";
import {
  getModelConfigDefaults,
  modelProviderCatalog,
  type ModelConfigDraft,
} from "~~/shared/utils/model-config-catalog";

definePageMeta({
  layout: "auth",
});

type StepValue = "owner" | "assistant" | "provider";

// Use nuxt-auth-utils session
const { fetch: refreshSession } = useUserSession();
const toast = useToast();
const stepper = useTemplateRef("stepper");
const submitting = ref(false);
const currentStep = ref<StepValue>("owner");
const statusMessage = ref("按顺序填写 3 个步骤，最后提交即可。");

const stepItems = [
  {
    value: "owner",
    title: "管理员",
    description: "设置管理员身份",
    icon: "i-lucide-user-round-cog",
    slot: "owner",
  },
  {
    value: "assistant",
    title: "助理",
    description: "设置名称角色",
    icon: "i-lucide-bot",
    slot: "assistant",
  },
  {
    value: "provider",
    title: "模型",
    description: "设置网关和模型",
    icon: "i-lucide-server",
    slot: "provider",
  },
];

const stepIndex = computed(() =>
  stepItems.findIndex((item) => item.value === currentStep.value),
);
const isLastStep = computed(() => stepIndex.value === stepItems.length - 1);

const initialProvider = modelProviderCatalog[0]?.value ?? "openai";

const form = reactive({
  ownerNickname: "",
  ownerUsername: "",
  ownerPassword: "",
  assistantNickname: "",
  assistantRole: "",
  assistantIntro: "",
});

const modelConfigForm = reactive<ModelConfigDraft>(
  getModelConfigDefaults(initialProvider),
);

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
  statusMessage.value = "正在写入系统状态，默认会话会在后台继续生成...";

  try {
    const payload: BootstrapRequest = {
      ownerNickname: form.ownerNickname,
      ownerUsername: form.ownerUsername,
      ownerPassword: form.ownerPassword,
      assistantNickname: form.assistantNickname,
      assistantRole: form.assistantRole,
      assistantIntro: form.assistantIntro,
      modelConfigName: modelConfigForm.name,
      provider: modelConfigForm.provider,
      baseUrl: modelConfigForm.baseUrl,
      apiKey: modelConfigForm.apiKey,
      modelId: modelConfigForm.modelId,
    };

    await $fetch<BootstrapResponse>("/api/system/bootstrap", {
      method: "POST",
      body: payload,
    });

    await refreshSession();
    toast.add({
      title: "Clawme 已点亮",
      description: "默认管理员、助理和模型网关已经初始化。",
      color: "success",
      icon: "i-lucide-check-circle-2",
    });

    await navigateTo("/");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "初始化失败，请检查表单或服务端日志。";

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
