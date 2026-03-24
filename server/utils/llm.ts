import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { LlmProvider } from "~~/server/database/schema";

let _defaultModel: LanguageModel | null = null;

export function getModel(): LanguageModel {
  if (!_defaultModel) {
    const baseUrl = process.env.LLM_BASE_URL;
    const apiKey = process.env.LLM_API_KEY;
    const modelId = process.env.LLM_MODEL_ID || "gpt-4o-mini";

    if (!baseUrl || !apiKey) {
      throw new Error("LLM_BASE_URL and LLM_API_KEY environment variables are required");
    }

    _defaultModel = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    }).languageModel(modelId);
  }

  return _defaultModel;
}

export function createModelFromProvider(provider: LlmProvider): LanguageModel {
  return createOpenAI({
    baseURL: provider.baseUrl ?? undefined,
    apiKey: provider.apiKey ?? undefined,
  }).languageModel(provider.modelId);
}
