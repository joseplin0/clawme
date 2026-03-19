import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

let _model: LanguageModel | null = null;

export function getModel(): LanguageModel {
  if (!_model) {
    const baseUrl = process.env.LLM_BASE_URL;
    const apiKey = process.env.LLM_API_KEY;
    const modelId = process.env.LLM_MODEL_ID || "gpt-4o-mini";

    if (!baseUrl || !apiKey) {
      throw new Error("LLM_BASE_URL and LLM_API_KEY environment variables are required");
    }

    _model = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    }).languageModel(modelId);
  }

  return _model;
}
