import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { eq } from "drizzle-orm";
import type { ModelConfig } from "~~/server/database/schema";
import { db, schema } from "~~/server/utils/db";

type UserModelConfigCandidate = {
  id: string;
  type: string;
  modelConfig?: ModelConfig | null;
};

let _defaultModel: LanguageModel | null = null;

export function getModel(): LanguageModel {
  if (!_defaultModel) {
    const baseUrl = process.env.LLM_BASE_URL;
    const apiKey = process.env.LLM_API_KEY;
    const modelId = process.env.LLM_MODEL_ID || "gpt-4o-mini";

    if (!baseUrl || !apiKey) {
      throw new Error(
        "LLM_BASE_URL and LLM_API_KEY environment variables are required",
      );
    }

    _defaultModel = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    }).languageModel(modelId);
  }

  return _defaultModel;
}

export function createModelFromConfig(modelConfig: ModelConfig): LanguageModel {
  const apiKey = modelConfig.apiKey || process.env.LLM_API_KEY;
  const baseUrl = modelConfig.baseUrl || process.env.LLM_BASE_URL;

  if (!apiKey) {
    throw new Error(`API key not found for model ${modelConfig.modelId}. Please set it in model config or LLM_API_KEY env.`);
  }

  return createOpenAI({
    baseURL: baseUrl || undefined,
    apiKey,
  }).languageModel(modelConfig.modelId);
}

export async function resolveUserModelConfig(
  user: UserModelConfigCandidate,
): Promise<ModelConfig | null> {
  if (user.modelConfig) {
    return user.modelConfig;
  }

  const hydratedUser = await db.query.users.findFirst({
    where: eq(schema.users.id, user.id),
    with: {
      modelConfig: true,
    },
  });

  if (hydratedUser?.modelConfig) {
    return hydratedUser.modelConfig;
  }

  if ((hydratedUser?.type ?? user.type) !== "bot") {
    return null;
  }

  const configuredModelConfigs = await db.query.modelConfigs.findMany();
  if (configuredModelConfigs.length !== 1) {
    return null;
  }

  const [modelConfig] = configuredModelConfigs;
  if (!modelConfig) {
    return null;
  }

  await db
    .update(schema.users)
    .set({
      modelConfigId: modelConfig.id,
    })
    .where(eq(schema.users.id, user.id));

  return modelConfig;
}
