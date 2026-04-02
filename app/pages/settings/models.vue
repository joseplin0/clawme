<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">模型配置</h2>
        <p class="mt-1 text-sm text-muted">管理可绑定给 Bot 的模型配置</p>
      </div>

      <UButton icon="i-lucide-plus" @click="openCreatePanel">
        新建模型
      </UButton>
    </div>

    <div class="space-y-4">
      <UCard v-for="modelConfig in modelConfigs" :key="modelConfig.id"
        class="hover:border-primary/50 transition-colors">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-base font-semibold text-highlighted">
                {{ modelConfig.name }}
              </p>
              <UBadge color="info" variant="subtle" size="sm">
                {{ getProviderLabel(modelConfig.provider) }}
              </UBadge>
            </div>
            <p class="mt-2 text-sm text-muted break-all">
              {{ modelConfig.baseUrl || "留空，使用 SDK 默认" }}
            </p>
            <p class="mt-1 text-sm text-toned">{{ modelConfig.modelId }}</p>
          </div>

          <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" @click="openEditPanel(modelConfig)">
            编辑
          </UButton>
        </div>
      </UCard>
    </div>


    <USlideover v-model:open="panelOpen" :title="panelMode === 'create' ? '新建模型配置' : '编辑模型配置'" side="right">
      <template #body>
        <ModelConfigFields :state="editForm" field-prefix="settings-model-config" />
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="outline" color="neutral" @click="closePanel">
            取消
          </UButton>
          <UButton :loading="saving" @click="saveModelConfig">
            {{ panelMode === "create" ? "创建" : "保存" }}
          </UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import type {
  CreateModelConfigRequest,
  ModelConfigRecord,
  UpdateModelConfigRequest,
} from "~~/shared/types/clawme";
import {
  getModelConfigDefaults,
  getModelProviderCatalogEntry,
  modelProviderCatalog,
  type ModelConfigDraft,
} from "~~/shared/utils/model-config-catalog";

type PanelMode = "create" | "edit";

const toast = useToast();

const { data: modelConfigs, refresh } = await useFetch<ModelConfigRecord[]>(
  "/api/model-configs",
  {
    lazy: true,
    default: () => [],
  },
);

const defaultProvider = modelProviderCatalog[0]?.value ?? "openai";
const panelOpen = ref(false);
const panelMode = ref<PanelMode>("create");
const editingModelConfigId = ref<string | null>(null);
const saving = ref(false);

const editForm = reactive<ModelConfigDraft>(getModelConfigDefaults(defaultProvider));

function openCreatePanel() {
  panelMode.value = "create";
  editingModelConfigId.value = null;
  Object.assign(editForm, getModelConfigDefaults(defaultProvider));
  panelOpen.value = true;
}

function openEditPanel(modelConfig: ModelConfigRecord) {
  panelMode.value = "edit";
  editingModelConfigId.value = modelConfig.id;
  editForm.name = modelConfig.name;
  editForm.provider = modelConfig.provider;
  editForm.baseUrl = modelConfig.baseUrl;
  editForm.apiKey = "";
  editForm.modelId = modelConfig.modelId;
  panelOpen.value = true;
}

function closePanel() {
  panelOpen.value = false;
}

function getProviderLabel(provider: string) {
  return getModelProviderCatalogEntry(provider)?.label ?? provider;
}

async function saveModelConfig() {
  saving.value = true;
  try {
    if (panelMode.value === "create") {
      const body: CreateModelConfigRequest = {
        name: editForm.name,
        provider: editForm.provider,
        baseUrl: editForm.baseUrl,
        apiKey: editForm.apiKey,
        modelId: editForm.modelId,
      };

      await $fetch("/api/model-configs", {
        method: "POST",
        body,
      });
    } else if (editingModelConfigId.value) {
      const body: UpdateModelConfigRequest = {
        name: editForm.name,
        provider: editForm.provider,
        baseUrl: editForm.baseUrl,
        modelId: editForm.modelId,
      };

      if (editForm.apiKey.trim()) {
        body.apiKey = editForm.apiKey;
      }

      await $fetch(`/api/model-configs/${editingModelConfigId.value}`, {
        method: "PUT",
        body,
      });
    }

    toast.add({
      title: panelMode.value === "create" ? "创建成功" : "保存成功",
      description:
        panelMode.value === "create"
          ? "模型配置已创建。"
          : "模型配置已更新。",
      color: "success",
      icon: "i-lucide-check",
    });
    panelOpen.value = false;
    await refresh();
  } catch (error) {
    toast.add({
      title: panelMode.value === "create" ? "创建失败" : "保存失败",
      description: error instanceof Error ? error.message : "请稍后重试。",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    saving.value = false;
  }
}
</script>
