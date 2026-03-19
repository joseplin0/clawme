<template>
  <div class="flex min-h-[70vh] items-center justify-center">
    <UCard class="w-full max-w-md">
      <UAuthForm
        icon="i-lucide-log-in"
        title="登录"
        description="请输入用户名和密码。"
        :fields="fields"
        :submit="{ label: '登录', icon: 'i-lucide-arrow-right' }"
        :loading="submitting"
        @submit="handleSubmit"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const toast = useToast();
const submitting = ref(false);

// Use nuxt-auth-utils session
const { fetch: refreshSession } = useUserSession();

const fields = [
  {
    name: "username",
    type: "text",
    label: "用户名",
    placeholder: "例如：linqiang",
    required: true,
    defaultValue: "",
  },
  {
    name: "password",
    type: "password",
    label: "密码",
    placeholder: "请输入密码",
    required: true,
    defaultValue: "",
  },
];

function resolveErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "data" in error) {
    const payload = (error as { data?: { statusMessage?: string } }).data;
    if (payload?.statusMessage) {
      return payload.statusMessage;
    }
  }

  return error instanceof Error ? error.message : "登录失败，请稍后重试。";
}

async function handleSubmit(event: {
  data: { username?: string; password?: string };
}) {
  const username = event.data.username?.trim().toLowerCase();
  const password = event.data.password?.trim();

  if (!username || !password) {
    toast.add({
      title: "请完整填写登录信息",
      description: "用户名和密码不能为空。",
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
        username,
        password,
      },
    });

    // Refresh session state from server
    await refreshSession();

    toast.add({
      title: "登录成功",
      description: "欢迎回来，正在进入工作台。",
      color: "success",
      icon: "i-lucide-check",
    });

    await navigateTo("/feed");
  } catch (error) {
    toast.add({
      title: "登录失败",
      description: resolveErrorMessage(error),
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    submitting.value = false;
  }
}
</script>
