<template>
  <div class="mt-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">模型配置</h2>
        <p class="mt-1 text-sm text-muted">管理 LLM 提供商配置</p>
      </div>
    </div>

    <div class="space-y-4">
      <UCard
        v-for="provider in providers"
        :key="provider.id"
        class="hover:border-primary/50 transition-colors"
      >
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2">
              <p class="text-base font-semibold text-highlighted">
                {{ provider.name }}
              </p>
              <UBadge color="info" variant="subtle" size="sm">
                {{ provider.provider }}
              </UBadge>
            </div>
            <p class="text-sm text-muted mt-1">{{ provider.modelId }}</p>
          </div>
          <UButton
            v-if="editingId !== provider.id"
            icon="i-lucide-pencil"
            variant="ghost"
            color="neutral"
            @click="startEdit(provider)"
          >
            编辑
          </UButton>
        </div>

        <div v-if="editingId === provider.id" class="space-y-4">
          <UFormField label="Provider 名称" :name="`provider-${provider.id}-name`">
            <UInput v-model="editForm.name" placeholder="输入 Provider 名称" />
          </UFormField>
          <UFormField label="Base URL" :name="`provider-${provider.id}-baseUrl`">
            <UInput v-model="editForm.baseUrl" placeholder="输入 Base URL" />
          </UFormField>
          <UFormField label="API Key" :name="`provider-${provider.id}-apiKey`">
            <UInput
              v-model="editForm.apiKey"
              type="password"
              placeholder="留空保持不变"
            />
          </UFormField>
          <UFormField label="Model ID" :name="`provider-${provider.id}-modelId`">
            <UInput v-model="editForm.modelId" placeholder="输入 Model ID" />
          </UFormField>
          <div class="flex gap-2 pt-2">
            <UButton :loading="saving" @click="saveProvider(provider.id)">
              保存
            </UButton>
            <UButton variant="outline" color="neutral" @click="cancelEdit">
              取消
            </UButton>
          </div>
        </div>

        <div v-else class="text-sm text-toned">
          <p class="break-all">{{ provider.baseUrl }}</p>
        </div>
      </UCard>
    </div>

    <div
      v-if="providers.length === 0"
      class="border border-dashed p-8 text-center"
    >
      <p class="text-base font-medium text-highlighted">暂无模型配置</p>
      <p class="mt-2 text-sm text-muted">请先完成系统引导来配置模型提供商。</p>
      <UButton to="/setup" icon="i-lucide-refresh-cw" class="mt-4">
        前往引导
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LlmProviderRecord } from "~~/shared/types/clawme";

const toast = useToast();

const { data: providers, refresh } = await useFetch<LlmProviderRecord[]>(
  "/api/llm",
  {
    lazy: true,
    default: () => [],
  },
);

const editingId = ref<string | null>(null);
const saving = ref(false);

const editForm = reactive({
  name: "",
  baseUrl: "",
  apiKey: "",
  modelId: "",
});

function startEdit(provider: LlmProviderRecord) {
  editingId.value = provider.id;
  editForm.name = provider.name;
  editForm.baseUrl = provider.baseUrl ?? "";
  editForm.apiKey = "";
  editForm.modelId = provider.modelId;
}

function cancelEdit() {
  editingId.value = null;
  editForm.name = "";
  editForm.baseUrl = "";
  editForm.apiKey = "";
  editForm.modelId = "";
}

async function saveProvider(providerId: string) {
  saving.value = true;
  try {
    const body: Record<string, string> = {
      name: editForm.name,
      baseUrl: editForm.baseUrl,
      modelId: editForm.modelId,
    };
    if (editForm.apiKey) {
      body.apiKey = editForm.apiKey;
    }

    await $fetch(`/api/llm/${providerId}`, {
      method: "PUT",
      body,
    });
    toast.add({
      title: "保存成功",
      description: "模型配置已更新。",
      color: "success",
      icon: "i-lucide-check",
    });
    editingId.value = null;
    await refresh();
  } catch (error) {
    toast.add({
      title: "保存失败",
      description: error instanceof Error ? error.message : "请稍后重试。",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    saving.value = false;
  }
}
</script>
