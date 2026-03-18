<template>
  <div class="min-h-screen bg-transparent px-4 py-6 md:px-8 md:py-10">
    <div class="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section class="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-white/85 p-8 shadow-[0_48px_120px_-72px_rgba(137,48,33,0.65)] backdrop-blur">
        <div class="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(224,93,68,0.22),transparent_62%)]" />
        <div class="relative space-y-6">
          <div class="space-y-3">
            <UBadge color="primary" variant="subtle" size="sm">First Run Setup</UBadge>
            <h1 class="max-w-xl text-4xl font-semibold tracking-tight text-highlighted">
              把 Clawme 点亮成你的本地协作场域
            </h1>
            <p class="max-w-2xl text-sm leading-7 text-toned">
              这一步会创建主理人、默认助理“虾米”、本地模型入口和第一条直连会话。后面的 Feed、Chat、Importer
              和生态引擎都会沿着这套统一身份骨架继续长出来。
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="rounded-2xl border border-muted/70 bg-muted/35 p-4">
              <UIcon name="i-lucide-user-round-cog" class="size-5 text-primary" />
              <p class="mt-3 text-sm font-semibold text-highlighted">主理人初始化</p>
              <p class="mt-1 text-sm leading-6 text-muted">创建 OWNER 身份与工作台入口。</p>
            </div>
            <div class="rounded-2xl border border-muted/70 bg-muted/35 p-4">
              <UIcon name="i-lucide-bot" class="size-5 text-primary" />
              <p class="mt-3 text-sm font-semibold text-highlighted">默认助理落盘</p>
              <p class="mt-1 text-sm leading-6 text-muted">生成默认 BOT 与初始直连会话。</p>
            </div>
            <div class="rounded-2xl border border-muted/70 bg-muted/35 p-4">
              <UIcon name="i-lucide-server" class="size-5 text-primary" />
              <p class="mt-3 text-sm font-semibold text-highlighted">模型网关挂载</p>
              <p class="mt-1 text-sm leading-6 text-muted">为后续 SSE 与工作流预留 provider 边界。</p>
            </div>
          </div>

          <div class="rounded-3xl border border-primary/15 bg-primary/5 p-5">
            <p class="text-sm font-medium text-highlighted">当前推荐默认值</p>
            <p class="mt-2 text-sm leading-7 text-toned">
              本轮先按 `oMLX + OpenAI Compatible API` 落地，后续可以无痛替换为 Ollama、LM
              Studio 或其他本地网关。
            </p>
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] border border-muted/70 bg-white/90 p-6 shadow-[0_48px_120px_-72px_rgba(40,32,28,0.55)] backdrop-blur md:p-8">
        <form class="space-y-5" @submit.prevent="submit">
          <div class="space-y-1">
            <h2 class="text-2xl font-semibold text-highlighted">首次引导</h2>
            <p class="text-sm text-muted">这一页会把 Phase 1 最小可运行环境直接写入本地状态仓储。</p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-sm font-medium text-toned" for="ownerNickname">主理人昵称</label>
              <UInput id="ownerNickname" v-model="form.ownerNickname" size="xl" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-toned" for="ownerUsername">主理人用户名</label>
              <UInput id="ownerUsername" v-model="form.ownerUsername" size="xl" />
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-sm font-medium text-toned" for="assistantNickname">默认助理昵称</label>
              <UInput id="assistantNickname" v-model="form.assistantNickname" size="xl" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium text-toned" for="assistantRole">默认助理角色</label>
              <UInput id="assistantRole" v-model="form.assistantRole" size="xl" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-toned" for="assistantBio">助理 System Prompt 基线</label>
            <UTextarea
              id="assistantBio"
              v-model="form.assistantBio"
              :rows="4"
              :maxrows="8"
              autoresize
            />
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <div class="space-y-2">
              <label class="text-sm font-medium text-toned" for="providerName">Provider</label>
              <UInput id="providerName" v-model="form.providerName" size="xl" />
            </div>
            <div class="space-y-2 md:col-span-2">
              <label class="text-sm font-medium text-toned" for="providerBaseUrl">Base URL</label>
              <UInput id="providerBaseUrl" v-model="form.providerBaseUrl" size="xl" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-toned" for="modelId">Model ID</label>
            <UInput id="modelId" v-model="form.modelId" size="xl" />
          </div>

          <div class="rounded-2xl border border-muted/70 bg-muted/35 p-4 text-sm text-toned">
            初始化完成后会自动写入 owner session cookie，并生成一条默认欢迎消息，方便后面继续打通聊天链路。
          </div>

          <div class="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <UButton
              type="submit"
              size="xl"
              class="justify-center"
              :loading="submitting"
              icon="i-lucide-rocket"
            >
              启动 Clawme
            </UButton>
            <p class="text-sm text-muted">
              {{ statusMessage }}
            </p>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BootstrapRequest, PublicStateResponse } from "~/shared/types/clawme";

definePageMeta({
  layout: false,
});

const bootstrap = useState<PublicStateResponse | null>("bootstrap-state");
const toast = useToast();
const submitting = ref(false);
const statusMessage = ref("建议先保持默认值，后续可以在设置页继续扩展。");

const form = reactive<BootstrapRequest>({
  ownerNickname: "林",
  ownerUsername: "linqiang",
  assistantNickname: "虾米",
  assistantRole: "本地助理",
  assistantBio:
    "你是 Clawme 的默认本地助理，擅长把复杂想法拆成可执行任务，并优先稳住系统底座与协作流。",
  providerName: "oMLX",
  providerBaseUrl: "http://localhost:8000/v1",
  modelId: "qwen3.5-8b-instruct",
});

async function submit() {
  submitting.value = true;
  statusMessage.value = "正在写入系统状态与默认会话...";

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
