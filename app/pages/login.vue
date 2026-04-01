<template>
  <div class="flex flex-col items-center">
    <!-- App Logo / Icon -->
    <div
      class="size-16 bg-primary rounded-[1.25rem] flex items-center justify-center text-white text-3xl font-black shadow-[0_12px_24px_-8px_rgba(255,90,95,0.4)] mb-6 transition-transform hover:scale-105"
    >
      C
    </div>
    <h1 class="text-[22px] font-bold text-default mb-1.5 tracking-tight">
      欢迎回来
    </h1>
    <p class="text-sm text-muted mb-8 font-medium">登录以访问您的工作台</p>

    <!-- Login Form -->
    <UForm class="w-full space-y-5" :state="{ username, password }" @submit="handleSubmit">
      <UFormField name="username">
        <UInput
          v-model="username"
          placeholder="用户名"
          icon="i-lucide-user"
          :ui="{ base: 'h-12 px-4 rounded-full text-[15px] bg-surface/80 border-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/40 focus:shadow-sm' }"
          class="w-full"
        />
      </UFormField>

      <UFormField name="password">
        <UInput
          v-model="password"
          type="password"
          placeholder="密码"
          icon="i-lucide-lock-keyhole"
          :ui="{ base: 'h-12 px-4 rounded-full text-[15px] bg-surface/80 border-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/40 focus:shadow-sm' }"
          class="w-full"
        />
      </UFormField>

      <div class="pt-4">
        <UButton
          type="submit"
          :loading="submitting"
          color="primary"
          variant="solid"
          class="w-full h-12 flex justify-center text-[16px] font-semibold transition-all shadow-[0_8px_16px_-6px_rgba(255,90,95,0.3)] hover:shadow-[0_12px_20px_-8px_rgba(255,90,95,0.4)] active:scale-[0.98] rounded-full"
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
