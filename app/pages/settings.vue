<template>
  <div class="h-full w-full overflow-y-auto p-4 md:p-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <header class="space-y-3">
        <UBadge color="primary" variant="subtle" size="sm"
          >Phase 1 Backbone</UBadge
        >
        <div
          class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <h1 class="text-3xl font-semibold text-highlighted">系统管理</h1>
            <p class="mt-1 text-sm text-muted">
              管理员、默认助理、本地模型入口与初始化状态。
            </p>
          </div>
          <UButton
            to="/setup"
            icon="i-lucide-refresh-cw"
            variant="outline"
            color="neutral"
          >
            重新查看引导
          </UButton>
        </div>
      </header>

      <div
        v-if="!state.system.isInitialized"
        class="border border-dashed p-8 text-center"
      >
        <p class="text-base font-medium text-highlighted">
          系统还没有完成首次引导。
        </p>
        <p class="mt-2 text-sm text-muted">
          先去创建管理员与默认助理，后面的会话、导入器和生态系统才有稳定地基。
        </p>
      </div>

      <section v-else class="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  统一身份视图
                </h2>
                <p class="mt-1 text-sm text-muted">
                  当前系统里已经落盘的管理员与默认助理。
                </p>
              </div>
              <UBadge color="success" variant="subtle">Initialized</UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <div class="border p-4">
              <div class="flex items-start gap-4">
                <UAvatar size="lg" />
                <div class="space-y-1">
                  <p class="text-base font-semibold text-highlighted">
                    {{ state.owner?.nickname || "未设置管理员" }}
                  </p>
                  <p class="text-sm text-muted">
                    @{{ state.owner?.username || "owner" }}
                  </p>
                  <p class="text-sm text-toned">
                    HUMAN · Owner workspace controller
                  </p>
                </div>
              </div>
            </div>

            <div class="border p-4">
              <div class="flex items-start gap-4">
                <UAvatar size="lg" />
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <p class="text-base font-semibold text-highlighted">
                      {{ state.bot?.nickname || "未设置默认助理" }}
                    </p>
                    <UBadge color="primary" variant="subtle" size="sm"
                      >BOT</UBadge
                    >
                  </div>
                  <p class="text-sm text-muted">
                    @{{ state.bot?.username || "clawme" }}
                  </p>
                  <p class="text-sm text-toned">
                    {{ state.bot?.role || "本地助理" }}
                  </p>
                  <p class="pt-1 text-sm leading-6 text-default">
                    {{ state.bot?.bio || "还没有系统提示词。" }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <div class="space-y-6">
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold text-highlighted">模型网关</h2>
            </template>

            <div v-if="provider" class="space-y-4">
              <div class="border p-4">
                <p class="text-sm text-muted">Provider</p>
                <p class="mt-1 text-base font-semibold text-highlighted">
                  {{ provider.name }}
                </p>
              </div>
              <div class="grid gap-3">
                <div class="border p-4">
                  <p class="text-sm text-muted">Model</p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ provider.modelId }}
                  </p>
                </div>
                <div class="border p-4">
                  <p class="text-sm text-muted">Base URL</p>
                  <p class="mt-1 break-all text-sm text-default">
                    {{ provider.baseUrl }}
                  </p>
                </div>
              </div>
            </div>

            <p v-else class="text-sm text-muted">尚未创建模型网关配置。</p>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold text-highlighted">系统脉搏</h2>
            </template>

            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between border px-4 py-3">
                <span class="text-muted">会话数</span>
                <span class="font-semibold text-highlighted">{{
                  state.sessions.length
                }}</span>
              </div>
              <div class="flex items-center justify-between border px-4 py-3">
                <span class="text-muted">消息数</span>
                <span class="font-semibold text-highlighted">{{
                  state.messages.length
                }}</span>
              </div>
              <div class="flex items-center justify-between border px-4 py-3">
                <span class="text-muted">Owner Session</span>
                <UBadge
                  :color="viewer.isOwnerAuthenticated ? 'success' : 'warning'"
                  variant="subtle"
                >
                  {{
                    viewer.isOwnerAuthenticated ? "Authenticated" : "Missing"
                  }}
                </UBadge>
              </div>
              <div
                v-if="loggedIn"
                class="flex items-center justify-between border px-4 py-3"
              >
                <span class="text-muted">操作</span>
                <UButton
                  icon="i-lucide-log-out"
                  size="sm"
                  variant="outline"
                  color="error"
                  :loading="loggingOut"
                  @click="handleLogout"
                >
                  登出
                </UButton>
              </div>
              <div class="flex items-center justify-between border px-4 py-3">
                <span class="text-muted">BOT Secret</span>
                <UBadge
                  :color="viewer.hasBotSecret ? 'info' : 'warning'"
                  variant="subtle"
                >
                  {{ viewer.hasBotSecret ? "Ready" : "Missing" }}
                </UBadge>
              </div>
            </div>
          </UCard>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicStateResponse } from "~~/shared/types/clawme";

const bootstrap = useState<PublicStateResponse | null>("bootstrap-state");
const toast = useToast();
const loggingOut = ref(false);

// Use nuxt-auth-utils session
const { loggedIn, clear: clearSession } = useUserSession();

if (!bootstrap.value) {
  bootstrap.value = await $fetch("/api/system/bootstrap");
}

const state = computed(() => bootstrap.value!.state);
const viewer = computed(() => bootstrap.value!.viewer);
const provider = computed(() => state.value.providers[0] ?? null);

async function handleLogout() {
  loggingOut.value = true;
  try {
    await $fetch("/api/auth/logout", { method: "POST" });
    await clearSession();
    toast.add({
      title: "已登出",
      description: "再见，期待下次见面。",
      color: "success",
      icon: "i-lucide-check",
    });
    await navigateTo("/login");
  } catch (error) {
    toast.add({
      title: "登出失败",
      description: error instanceof Error ? error.message : "请稍后重试。",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    loggingOut.value = false;
  }
}
</script>
