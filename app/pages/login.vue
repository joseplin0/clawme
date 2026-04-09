<template>
  <div class="flex flex-col items-center">
    <!-- App Logo / Icon -->
    <div
      class="size-16 bg-[#ff385c] rounded-full flex items-center justify-center text-white text-[24px] font-bold shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] mb-8 transition-transform hover:scale-105"
    >
      C
    </div>
    <h1 class="text-[28px] font-bold text-[#222222] mb-2 tracking-[-0.32px]">
      欢迎回来
    </h1>
    <p class="text-[16px] text-[#6a6a6a] mb-8 font-medium">登录以访问您的工作台</p>

    <!-- Login Form -->
    <UForm class="w-full space-y-6" :state="{ username, password }" @submit="handleSubmit">
      <UFormField name="username">
        <UInput
          v-model="username"
          placeholder="用户名"
          icon="i-lucide-user"
          :ui="{ base: 'h-14 px-4 rounded-lg text-[16px] bg-[#ffffff] border border-[#c1c1c1] transition-all focus:border-[#222222] focus:ring-1 focus:ring-[#222222] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] placeholder-[#6a6a6a]' }"
          class="w-full"
        />
      </UFormField>

      <UFormField name="password">
        <UInput
          v-model="password"
          type="password"
          placeholder="密码"
          icon="i-lucide-lock-keyhole"
          :ui="{ base: 'h-14 px-4 rounded-lg text-[16px] bg-[#ffffff] border border-[#c1c1c1] transition-all focus:border-[#222222] focus:ring-1 focus:ring-[#222222] shadow-[rgba(0,0,0,0.02)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_6px,rgba(0,0,0,0.1)_0px_4px_8px] placeholder-[#6a6a6a]' }"
          class="w-full"
        />
      </UFormField>

      <div class="pt-4">
        <UButton
          type="submit"
          :loading="submitting"
          class="w-full h-12 flex justify-center text-[16px] font-semibold bg-[#ff385c] hover:bg-[#e00b41] text-white transition-all shadow-none rounded-lg active:scale-[0.98]"
        >
          安全登录
        </UButton>
      </div>
    </UForm>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

definePageMeta({
  layout: "auth",
});

const toast = useToast();
const submitting = ref(false);
const { fetch: refreshSession } = useUserSession();

const username = ref("");
const password = ref("");

function resolveErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "data" in error) {
    const payload = (error as { data?: { statusMessage?: string } }).data;
    if (payload?.statusMessage) {
      return payload.statusMessage;
    }
  }

  return error instanceof Error ? error.message : "登录失败，请稍后重试。";
}

async function handleSubmit() {
  const user = username.value.trim().toLowerCase();
  const pass = password.value.trim();

  if (!user || !pass) {
    toast.add({
      title: "信息不完整",
      description: "请填写用户名和密码噢！",
      color: "warning",
      icon: "i-lucide-circle-alert",
    });
    return;
  }

  submitting.value = true;

  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: {
        username: user,
        password: pass,
      },
    });

    await refreshSession();

    toast.add({
      title: "欢迎回来",
      description: "正在为您加载工作台...",
      color: "success",
      icon: "i-lucide-check-circle-2",
    });

    await navigateTo("/");
  } catch (error) {
    toast.add({
      title: "遇到了小问题",
      description: resolveErrorMessage(error),
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    submitting.value = false;
  }
}
</script>
