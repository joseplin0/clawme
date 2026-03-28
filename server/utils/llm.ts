import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { eq } from "drizzle-orm";
import type { LlmProvider } from "~~/server/database/schema";
import { db, schema } from "~~/server/utils/db";

type UserProviderCandidate = {
  id: string;
  type: string;
  llmProvider?: LlmProvider | null;
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

export function createModelFromProvider(provider: LlmProvider): LanguageModel {
  return createOpenAI({
    baseURL: provider.baseUrl ?? undefined,
    apiKey: provider.apiKey ?? undefined,
  }).languageModel(provider.modelId);
}

export async function resolveUserLlmProvider(
  user: UserProviderCandidate,
): Promise<LlmProvider | null> {
  if (user.llmProvider) {
    return user.llmProvider;
  }

  const hydratedUser = await db.query.users.findFirst({
    where: eq(schema.users.id, user.id),
    with: {
      llmProvider: true,
    },
  });

  if (hydratedUser?.llmProvider) {
    return hydratedUser.llmProvider;
  }

  if ((hydratedUser?.type ?? user.type) !== "bot") {
    return null;
  }

  const llmConfigs = await db.query.llm.findMany();
  if (llmConfigs.length !== 1) {
    return null;
  }

  const [provider] = llmConfigs;
  if (!provider) {
    return null;
  }

  await db
    .update(schema.users)
    .set({
      llmProviderId: provider.id,
    })
    .where(eq(schema.users.id, user.id));

  return provider;
}
