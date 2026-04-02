<template>
  <div class="space-y-4">
    <UFormField :label="nameLabel" :name="`${fieldPrefix}-name`" required>
      <UInput
        v-model="state.name"
        placeholder="输入配置名称"
        icon="i-lucide-tag"
      />
    </UFormField>

    <UFormField :name="`${fieldPrefix}-provider`" label="供应商" required>
      <USelect
        v-model="state.provider"
        :items="providerOptions"
        placeholder="选择供应商"
        icon="i-lucide-cloud"
      />
    </UFormField>

    <UFormField :name="`${fieldPrefix}-baseUrl-select`" label="地址">
      <div class="space-y-2">
        <USelect
          v-if="baseUrlOptions.length > 0"
          v-model="baseUrlSelection"
          :items="baseUrlOptions"
          placeholder="选择地址"
          icon="i-lucide-network"
        />

        <UInput
          v-if="showBaseUrlInput"
          v-model="state.baseUrl"
          placeholder="输入自定义 Base URL，留空则使用 SDK 默认"
          icon="i-lucide-link"
        />

        <p class="text-xs text-muted">
          地址可留空；有预设地址时可直接选，也可以切换到自定义地址。
        </p>
      </div>
    </UFormField>

    <UFormField :name="`${fieldPrefix}-model-select`" label="模型" required>
      <div class="space-y-2">
        <USelect
          v-if="modelOptions.length > 0"
          v-model="modelSelection"
          :items="modelOptions"
          placeholder="选择模型"
          icon="i-lucide-cpu"
        />

        <UInput
          v-if="showModelInput"
          v-model="state.modelId"
          placeholder="输入模型 ID"
          icon="i-lucide-bot"
          required
        />
      </div>
    </UFormField>

    <UFormField
      :name="`${fieldPrefix}-apiKey`"
      label="API Key"
      :required="apiKeyRequired"
    >
      <UInput
        v-model="state.apiKey"
        type="password"
        :placeholder="apiKeyRequired ? '输入 API Key' : '可留空'"
        icon="i-lucide-key"
      />
      <template #help>
        <span class="text-xs text-muted">
          {{ apiKeyRequired ? "当前供应商需要 API Key。" : "当前供应商可不填 API Key。" }}
        </span>
      </template>
    </UFormField>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ModelConfigDraft } from "~~/shared/utils/model-config-catalog";
import {
  getModelConfigDefaults,
  getModelProviderCatalogEntry,
  isApiKeyRequiredForProvider,
  modelProviderCatalog,
} from "~~/shared/utils/model-config-catalog";

const CUSTOM_BASE_URL = "__custom_base_url__";
const DEFAULT_BASE_URL = "__default_base_url__";
const CUSTOM_MODEL = "__custom_model__";

const props = withDefaults(
  defineProps<{
    state: ModelConfigDraft;
    fieldPrefix?: string;
    nameLabel?: string;
  }>(),
  {
    fieldPrefix: "model-config",
    nameLabel: "配置名称",
  },
);

const state = props.state;
const baseUrlSelection = ref(DEFAULT_BASE_URL);
const modelSelection = ref(CUSTOM_MODEL);

const currentProvider = computed(() =>
  state.provider ? getModelProviderCatalogEntry(state.provider) : null,
);

const providerOptions = computed(() => {
  const options = modelProviderCatalog.map((provider) => ({
    label: provider.label,
    value: provider.value,
  }));

  if (
    state.provider &&
    !options.some((option) => option.value === state.provider)
  ) {
    options.unshift({
      label: `${state.provider} (现有配置)`,
      value: state.provider,
    });
  }

  return options;
});

const baseUrlOptions = computed(() => {
  const entry = currentProvider.value;
  const options = [
    { label: "留空（使用 SDK 默认）", value: DEFAULT_BASE_URL },
  ];

  if (!entry) {
    return options;
  }

  options.push(
    ...entry.baseUrls.map((baseUrl) => ({
      label: baseUrl,
      value: baseUrl,
    })),
  );

  if (entry.supportsCustomBaseUrl) {
    options.push({ label: "自定义地址", value: CUSTOM_BASE_URL });
  }

  return options;
});

const modelOptions = computed(() => {
  const entry = currentProvider.value;
  if (!entry) {
    return [{ label: "自定义模型", value: CUSTOM_MODEL }];
  }

  return [
    ...entry.models.map((modelId) => ({
      label: modelId,
      value: modelId,
    })),
    { label: "自定义模型", value: CUSTOM_MODEL },
  ];
});

const apiKeyRequired = computed(() =>
  state.provider ? isApiKeyRequiredForProvider(state.provider) : true,
);

const showBaseUrlInput = computed(
  () =>
    baseUrlSelection.value === CUSTOM_BASE_URL ||
    baseUrlOptions.value.length <= 1,
);

const showModelInput = computed(
  () => modelSelection.value === CUSTOM_MODEL || modelOptions.value.length === 1,
);

watch(
  () => state.provider,
  (provider, previousProvider) => {
    syncSelections();

    if (!provider || previousProvider === undefined || provider === previousProvider) {
      return;
    }

    const defaults = getModelConfigDefaults(provider);
    state.name = defaults.name;
    state.baseUrl = defaults.baseUrl;
    state.modelId = defaults.modelId;
    if (!isApiKeyRequiredForProvider(provider)) {
      state.apiKey = "";
    }
    syncSelections();
  },
  { immediate: true },
);

watch(baseUrlSelection, (selection) => {
  if (selection === CUSTOM_BASE_URL) {
    return;
  }

  if (selection === DEFAULT_BASE_URL) {
    state.baseUrl = "";
    return;
  }

  state.baseUrl = selection;
});

watch(modelSelection, (selection) => {
  if (selection === CUSTOM_MODEL) {
    return;
  }

  state.modelId = selection;
});

watch(
  () => state.baseUrl,
  () => {
    syncBaseUrlSelection();
  },
);

watch(
  () => state.modelId,
  () => {
    syncModelSelection();
  },
);

function syncSelections() {
  syncBaseUrlSelection();
  syncModelSelection();
}

function syncBaseUrlSelection() {
  const entry = currentProvider.value;
  const currentBaseUrl = state.baseUrl?.trim() ?? "";

  if (!currentBaseUrl) {
    baseUrlSelection.value = DEFAULT_BASE_URL;
    return;
  }

  if (entry?.baseUrls.includes(currentBaseUrl)) {
    baseUrlSelection.value = currentBaseUrl;
    return;
  }

  baseUrlSelection.value = CUSTOM_BASE_URL;
}

function syncModelSelection() {
  const entry = currentProvider.value;
  const currentModelId = state.modelId?.trim() ?? "";

  if (!currentModelId) {
    modelSelection.value = CUSTOM_MODEL;
    return;
  }

  if (entry?.models.includes(currentModelId)) {
    modelSelection.value = currentModelId;
    return;
  }

  modelSelection.value = CUSTOM_MODEL;
}
</script>
