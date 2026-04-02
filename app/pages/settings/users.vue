<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">用户列表</h2>
        <p class="mt-1 text-sm text-muted">管理系统中的所有用户</p>
      </div>
    </div>

    <div class="space-y-4">
      <UCard
        v-for="user in users"
        :key="user.id"
        class="hover:border-primary/50 transition-colors"
      >
        <div class="flex items-start gap-4">
          <UAvatar size="lg" />
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-3">
              <p class="text-base font-semibold text-highlighted">
                {{ user.nickname || "未设置昵称" }}
              </p>
              <UBadge
                :color="user.type === 'human' ? 'success' : 'primary'"
                variant="subtle"
                size="sm"
              >
                {{ user.type === "human" ? "HUMAN" : "BOT" }}
              </UBadge>
              <UBadge
                v-if="user.role === 'OWNER'"
                color="warning"
                variant="subtle"
                size="sm"
              >
                Owner
              </UBadge>
            </div>
            <p class="text-sm text-muted mb-4">@{{ user.username }}</p>

            <div v-if="editingId === user.id" class="space-y-4">
              <UFormField label="昵称" :name="`user-${user.id}-nickname`">
                <UInput v-model="editForm.nickname" placeholder="输入昵称" />
              </UFormField>

              <template v-if="user.type === 'bot'">
                <UFormField label="角色" :name="`user-${user.id}-role`">
                  <UInput v-model="editForm.role" placeholder="输入角色" />
                </UFormField>

                <UFormField label="系统提示词" :name="`user-${user.id}-intro`">
                  <UTextarea
                    v-model="editForm.intro"
                    :rows="4"
                    placeholder="输入系统提示词"
                  />
                </UFormField>

                <UFormField label="模型配置" :name="`user-${user.id}-model-config`">
                  <div class="space-y-2">
                    <USelect
                      v-model="editForm.modelConfigId"
                      :items="modelConfigOptions"
                      placeholder="选择模型配置"
                      icon="i-lucide-cpu"
                    />

                    <div class="flex items-center gap-2">
                      <UButton
                        size="sm"
                        variant="soft"
                        color="neutral"
                        icon="i-lucide-plus"
                        @click="openCreateModelConfig"
                      >
                        快捷创建模型
                      </UButton>
                      <span class="text-xs text-muted">
                        创建成功后会自动选中新配置。
                      </span>
                    </div>
                  </div>
                </UFormField>
              </template>

              <div class="flex gap-2 pt-2">
                <UButton :loading="saving" @click="saveUser(user.id)">
                  保存
                </UButton>
                <UButton
                  variant="outline"
                  color="neutral"
                  @click="cancelEdit"
                >
                  取消
                </UButton>
              </div>
            </div>

            <div v-else class="text-sm text-toned space-y-1">
              <p v-if="user.role && user.type === 'bot'">{{ user.role }}</p>
              <p v-if="user.intro" class="line-clamp-2">{{ user.intro }}</p>
              <p v-if="user.type === 'bot'" class="text-muted">
                {{
                  getModelConfigSummary(user.modelConfigId) ||
                  "未绑定模型配置"
                }}
              </p>
            </div>
          </div>
          <UButton
            v-if="editingId !== user.id"
            icon="i-lucide-pencil"
            variant="ghost"
            color="neutral"
            @click="startEdit(user)"
          >
            编辑
          </UButton>
        </div>
      </UCard>
    </div>

    <div v-if="users.length === 0" class="border border-dashed p-8 text-center">
      <p class="text-base font-medium text-highlighted">暂无用户</p>
      <p class="mt-2 text-sm text-muted">请先完成系统引导来创建用户。</p>
    </div>

    <USlideover v-model:open="createPanelOpen" title="快捷创建模型配置" side="right">
      <template #body>
        <ModelConfigFields
          :state="createModelConfigForm"
          field-prefix="user-quick-create-model-config"
        />
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton variant="outline" color="neutral" @click="createPanelOpen = false">
            取消
          </UButton>
          <UButton :loading="creatingModelConfig" @click="createModelConfig">
            创建并选择
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
  UpdateUserRequest,
  UserProfile,
} from "~~/shared/types/clawme";
import {
  getModelConfigDefaults,
  getModelProviderCatalogEntry,
  modelProviderCatalog,
  type ModelConfigDraft,
} from "~~/shared/utils/model-config-catalog";

const toast = useToast();

const { data: users, refresh } = await useFetch<UserProfile[]>("/api/users", {
  lazy: true,
  default: () => [],
});

const { data: modelConfigs, refresh: refreshModelConfigs } =
  await useFetch<ModelConfigRecord[]>("/api/model-configs", {
    lazy: true,
    default: () => [],
  });

const defaultProvider = modelProviderCatalog[0]?.value ?? "openai";
const editingId = ref<string | null>(null);
const saving = ref(false);
const createPanelOpen = ref(false);
const creatingModelConfig = ref(false);

const editForm = reactive({
  nickname: "",
  role: "",
  intro: "",
  modelConfigId: null as string | null,
});

const createModelConfigForm = reactive<ModelConfigDraft>(
  getModelConfigDefaults(defaultProvider),
);

const modelConfigOptions = computed(() => [
  { label: "未绑定", value: null },
  ...modelConfigs.value.map((modelConfig) => ({
    label: `${modelConfig.name} · ${modelConfig.modelId}`,
    value: modelConfig.id,
  })),
]);

const modelConfigsById = computed<Record<string, ModelConfigRecord>>(() =>
  Object.fromEntries(modelConfigs.value.map((modelConfig) => [modelConfig.id, modelConfig])),
);

function startEdit(user: UserProfile) {
  editingId.value = user.id;
  editForm.nickname = user.nickname;
  editForm.role = user.role ?? "";
  editForm.intro = user.intro ?? "";
  editForm.modelConfigId = user.modelConfigId ?? null;
}

function cancelEdit() {
  editingId.value = null;
  editForm.nickname = "";
  editForm.role = "";
  editForm.intro = "";
  editForm.modelConfigId = null;
}

function getModelConfigSummary(modelConfigId: string | null) {
  if (!modelConfigId) {
    return "";
  }

  const modelConfig = modelConfigsById.value[modelConfigId];
  if (!modelConfig) {
    return "已绑定历史模型配置";
  }

  const providerLabel =
    getModelProviderCatalogEntry(modelConfig.provider)?.label ?? modelConfig.provider;
  return `${modelConfig.name} · ${providerLabel} · ${modelConfig.modelId}`;
}

function openCreateModelConfig() {
  Object.assign(createModelConfigForm, getModelConfigDefaults(defaultProvider));
  createPanelOpen.value = true;
}

async function createModelConfig() {
  creatingModelConfig.value = true;
  try {
    const body: CreateModelConfigRequest = {
      name: createModelConfigForm.name,
      provider: createModelConfigForm.provider,
      baseUrl: createModelConfigForm.baseUrl,
      apiKey: createModelConfigForm.apiKey,
      modelId: createModelConfigForm.modelId,
    };

    const response = await $fetch<{ modelConfig: ModelConfigRecord }>(
      "/api/model-configs",
      {
        method: "POST",
        body,
      },
    );

    await refreshModelConfigs();
    editForm.modelConfigId = response.modelConfig.id;
    createPanelOpen.value = false;

    toast.add({
      title: "创建成功",
      description: "模型配置已创建，并已自动选中。",
      color: "success",
      icon: "i-lucide-check",
    });
  } catch (error) {
    toast.add({
      title: "创建失败",
      description: error instanceof Error ? error.message : "请稍后重试。",
      color: "error",
      icon: "i-lucide-triangle-alert",
    });
  } finally {
    creatingModelConfig.value = false;
  }
}

async function saveUser(userId: string) {
  saving.value = true;
  try {
    const body: UpdateUserRequest = {
      nickname: editForm.nickname,
    };

    const user = users.value?.find((candidate) => candidate.id === userId);
    if (user?.type === "bot") {
      body.role = editForm.role;
      body.intro = editForm.intro;
      body.modelConfigId = editForm.modelConfigId;
    }

    await $fetch(`/api/users/${userId}`, {
      method: "PUT",
      body,
    });

    toast.add({
      title: "保存成功",
      description: "用户信息已更新。",
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
