<template>
  <div class="h-full w-full overflow-y-auto p-4 md:p-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <header class="space-y-3">
        <UBadge color="primary" variant="subtle" size="sm">Phase 1 Backbone</UBadge>
        <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 class="text-3xl font-semibold text-highlighted">系统管理</h1>
            <p class="mt-1 text-sm text-muted">
              管理主理人、默认助理、本地模型入口与初始化状态。
            </p>
          </div>
          <UButton to="/setup" icon="i-lucide-refresh-cw" variant="outline" color="neutral">
            重新查看引导
          </UButton>
        </div>
      </header>

      <div
        v-if="!state.system.isInitialized"
        class="rounded-3xl border border-dashed border-primary/40 bg-white/70 p-8 text-center"
      >
        <p class="text-base font-medium text-highlighted">系统还没有完成首次引导。</p>
        <p class="mt-2 text-sm text-muted">
          先去创建主理人与默认助理，后面的会话、导入器和生态系统才有稳定地基。
        </p>
      </div>

      <section v-else class="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <UCard class="border border-muted/70 bg-white/80">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">统一身份视图</h2>
                <p class="mt-1 text-sm text-muted">当前系统里已经落盘的主理人与默认助理。</p>
              </div>
              <UBadge color="success" variant="subtle">Initialized</UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <div class="rounded-2xl border border-muted/70 bg-muted/35 p-4">
              <div class="flex items-start gap-4">
                <UAvatar
                  size="lg"
                  :ui="{ root: 'bg-gradient-to-br from-sky-500 to-cyan-400' }"
                />
                <div class="space-y-1">
                  <p class="text-base font-semibold text-highlighted">
                    {{ state.owner?.nickname || "未设置主理人" }}
                  </p>
                  <p class="text-sm text-muted">@{{ state.owner?.username || "owner" }}</p>
                  <p class="text-sm text-toned">HUMAN · Owner workspace controller</p>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div class="flex items-start gap-4">
                <UAvatar
                  size="lg"
                  :ui="{ root: 'bg-gradient-to-br from-clawme-500 to-amber-300' }"
                />
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <p class="text-base font-semibold text-highlighted">
                      {{ state.bot?.nickname || "未设置默认助理" }}
                    </p>
                    <UBadge color="primary" variant="subtle" size="sm">BOT</UBadge>
                  </div>
                  <p class="text-sm text-muted">@{{ state.bot?.username || "clawme" }}</p>
                  <p class="text-sm text-toned">{{ state.bot?.role || "本地助理" }}</p>
                  <p class="pt-1 text-sm leading-6 text-default">
                    {{ state.bot?.bio || "还没有系统提示词。" }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <div class="space-y-6">
          <UCard class="border border-muted/70 bg-white/80">
            <template #header>
              <h2 class="text-lg font-semibold text-highlighted">模型网关</h2>
            </template>

            <div v-if="provider" class="space-y-4">
              <div class="rounded-2xl border border-muted/70 bg-muted/35 p-4">
                <p class="text-sm text-muted">Provider</p>
                <p class="mt-1 text-base font-semibold text-highlighted">{{ provider.name }}</p>
              </div>
              <div class="grid gap-3">
                <div class="rounded-2xl border border-muted/70 bg-white p-4">
                  <p class="text-sm text-muted">Model</p>
                  <p class="mt-1 font-medium text-highlighted">{{ provider.modelId }}</p>
                </div>
                <div class="rounded-2xl border border-muted/70 bg-white p-4">
                  <p class="text-sm text-muted">Base URL</p>
                  <p class="mt-1 break-all text-sm text-default">{{ provider.baseUrl }}</p>
                </div>
              </div>
            </div>

            <p v-else class="text-sm text-muted">尚未创建模型网关配置。</p>
          </UCard>

          <UCard class="border border-muted/70 bg-white/80">
            <template #header>
              <h2 class="text-lg font-semibold text-highlighted">系统脉搏</h2>
            </template>

            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between rounded-2xl bg-muted/35 px-4 py-3">
                <span class="text-muted">会话数</span>
                <span class="font-semibold text-highlighted">{{ state.sessions.length }}</span>
              </div>
              <div class="flex items-center justify-between rounded-2xl bg-muted/35 px-4 py-3">
                <span class="text-muted">消息数</span>
                <span class="font-semibold text-highlighted">{{ state.messages.length }}</span>
              </div>
              <div class="flex items-center justify-between rounded-2xl bg-muted/35 px-4 py-3">
                <span class="text-muted">Owner Session</span>
                <UBadge :color="viewer.isOwnerAuthenticated ? 'success' : 'warning'" variant="subtle">
                  {{ viewer.isOwnerAuthenticated ? "Authenticated" : "Missing" }}
                </UBadge>
              </div>
              <div class="flex items-center justify-between rounded-2xl bg-muted/35 px-4 py-3">
                <span class="text-muted">BOT Secret</span>
                <UBadge :color="viewer.hasBotSecret ? 'info' : 'warning'" variant="subtle">
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

if (!bootstrap.value) {
  bootstrap.value = await $fetch("/api/system/bootstrap");
}

const state = computed(() => bootstrap.value!.state);
const viewer = computed(() => bootstrap.value!.viewer);
const provider = computed(() => state.value.providers[0] ?? null);
</script>
