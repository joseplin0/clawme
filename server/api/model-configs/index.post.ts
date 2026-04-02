import { createError, readBody } from "h3";
import { z } from "zod";
import type { CreateModelConfigRequest } from "~~/shared/types/clawme";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import {
  assertApiKeyForProvider,
  assertKnownModelProvider,
  assertValidBaseUrl,
  normalizeRequiredText,
} from "~~/server/utils/model-configs";

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().min(1).max(100),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  modelId: z.string().min(1).max(200),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const body = await readBody<CreateModelConfigRequest>(event);
  const validatedBody = bodySchema.parse(body);
  const providerEntry = assertKnownModelProvider(validatedBody.provider);

  const [modelConfig] = await db
    .insert(schema.modelConfigs)
    .values({
      name: normalizeRequiredText(validatedBody.name, "name"),
      provider: providerEntry.value,
      baseUrl: assertValidBaseUrl(validatedBody.baseUrl),
      apiKey: assertApiKeyForProvider(providerEntry.value, validatedBody.apiKey),
      modelId: normalizeRequiredText(validatedBody.modelId, "modelId"),
    })
    .returning();

  if (!modelConfig) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create model config",
    });
  }

  return {
    success: true,
    modelConfig: {
      id: modelConfig.id,
      name: modelConfig.name,
      provider: modelConfig.provider,
      baseUrl: modelConfig.baseUrl || "",
      modelId: modelConfig.modelId,
      createdAt: modelConfig.createdAt.toISOString(),
    },
  };
});
