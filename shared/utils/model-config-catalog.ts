export interface ModelProviderCatalogEntry {
  label: string;
  value: string;
  baseUrls: string[];
  defaultModelId: string;
  models: string[];
  requiresApiKey: boolean;
  supportsCustomBaseUrl: boolean;
}

export interface ModelConfigDraft {
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelId: string;
}

export const modelProviderCatalog: ModelProviderCatalogEntry[] = [
  {
    label: "Z.AI",
    value: "zai-international",
    baseUrls: [
      "https://api.z.ai/api/coding/paas/v4",
      "https://api.z.ai/api/paas/v4",
    ],
    defaultModelId: "glm-4.6",
    models: [
      "glm-4.5",
      "glm-4.5-air",
      "glm-4.5-x",
      "glm-4.5-airx",
      "glm-4.5-flash",
      "glm-4.5v",
      "glm-4.6v",
      "glm-4.6",
      "glm-4.7",
      "glm-5",
      "glm-4.7-flash",
      "glm-4.7-flashx",
      "glm-4.6v-flash",
      "glm-4.6v-flashx",
      "glm-4-32b-0414-128k",
    ],
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
  },
  {
    label: "智谱",
    value: "zai-mainland",
    baseUrls: [
      "https://open.bigmodel.cn/api/coding/paas/v4",
      "https://open.bigmodel.cn/api/paas/v4",
    ],
    defaultModelId: "glm-4.6",
    models: [
      "glm-4.5",
      "glm-4.5-air",
      "glm-4.5-x",
      "glm-4.5-airx",
      "glm-4.5-flash",
      "glm-4.5v",
      "glm-4.6",
      "glm-4.7",
      "glm-5",
      "glm-4.7-flash",
      "glm-4.7-flashx",
      "glm-4.6v",
      "glm-4.6v-flash",
      "glm-4.6v-flashx",
    ],
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
  },
  {
    label: "OpenAI",
    value: "openai",
    baseUrls: ["https://api.openai.com/v1"],
    defaultModelId: "gpt-4o-mini",
    models: [
      "gpt-3.5-turbo",
      "gpt-4o-mini",
      "gpt-4",
      "gpt-4-0125-preview",
      "gpt-4o",
      "o1",
      "o3-mini",
      "o4-mini",
      "gpt-4.1",
      "gpt-5-mini",
      "gpt-5",
    ],
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
  },
  {
    label: "OpenRouter",
    value: "openrouter",
    baseUrls: ["https://openrouter.ai/api/v1"],
    defaultModelId: "",
    models: [],
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
  },
  {
    label: "Gemini",
    value: "gemini",
    baseUrls: ["https://generativelanguage.googleapis.com/v1"],
    defaultModelId: "gemini-2.5-pro",
    models: ["gemini-2.0-flash-001", "gemini-2.5-pro"],
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
  },
  {
    label: "OpenAI Compatible",
    value: "openai-compatible",
    baseUrls: [],
    defaultModelId: "",
    models: [],
    requiresApiKey: true,
    supportsCustomBaseUrl: true,
  },
  {
    label: "Ollama",
    value: "ollama",
    baseUrls: ["http://localhost:11434"],
    defaultModelId: "nomic-embed-text:latest",
    models: [
      "nomic-embed-text:latest",
      "llama2:latest",
      "mistralai/devstral-small-2505",
      "qwen2",
    ],
    requiresApiKey: false,
    supportsCustomBaseUrl: true,
  },
  {
    label: "LM Studio",
    value: "lmstudio",
    baseUrls: ["http://localhost:1234"],
    defaultModelId: "mistralai/devstral-small-2505",
    models: [
      "mistralai/devstral-small-2505",
      "Meta/Llama-3.1/8B-Instruct",
      "mistralai/mistral-7b-instruct",
      "meta/codellama/7b",
      "meta/llama/7b",
    ],
    requiresApiKey: false,
    supportsCustomBaseUrl: true,
  },
  {
    label: "oMLX",
    value: "omlx",
    baseUrls: ["http://localhost:8000/v1"],
    defaultModelId: "",
    models: [],
    requiresApiKey: false,
    supportsCustomBaseUrl: true,
  },
];

export function getModelProviderCatalogEntry(provider: string) {
  return modelProviderCatalog.find((entry) => entry.value === provider) ?? null;
}

export function getModelConfigDefaults(provider: string): ModelConfigDraft {
  const entry = getModelProviderCatalogEntry(provider);

  return {
    name: entry?.label ?? "",
    provider,
    baseUrl: entry?.baseUrls[0] ?? "",
    apiKey: "",
    modelId: entry?.defaultModelId || entry?.models[0] || "",
  };
}

export function isApiKeyRequiredForProvider(provider: string) {
  const entry = getModelProviderCatalogEntry(provider);
  return entry?.requiresApiKey ?? true;
}
