import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { UpdateModelConfigRequest } from "~~/shared/types/clawme";
import { getModelProviderCatalogEntry } from "~~/shared/utils/model-config-catalog";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";
import {
  assertApiKeyForProvider,
  assertKnownModelProvider,
  assertValidBaseUrl,
  normalizeOptionalText,
  normalizeRequiredText,
} from "~~/server/utils/model-configs";

const { modelConfigs } = schema;

const paramsSchema = z.object({
  id: z.uuid(),
});

const bodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).max(100).optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  modelId: z.string().min(1).max(200).optional(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });

  const body = await readBody<UpdateModelConfigRequest>(event);
  const validatedBody = bodySchema.parse(body);

  const existingModelConfig = await db.query.modelConfigs.findFirst({
    where: eq(modelConfigs.id, id),
  });

  if (!existingModelConfig) {
    throw createError({
      statusCode: 404,
      statusMessage: "Model config not found",
    });
  }

  const nextProvider = validatedBody.provider ?? existingModelConfig.provider;
  if (validatedBody.provider && validatedBody.provider !== existingModelConfig.provider) {
    assertKnownModelProvider(validatedBody.provider);
  }

  const nextApiKey =
    validatedBody.apiKey !== undefined
      ? normalizeOptionalText(validatedBody.apiKey)
      : existingModelConfig.apiKey;

  if (getModelProviderCatalogEntry(nextProvider)) {
    assertApiKeyForProvider(nextProvider, nextApiKey);
  }

  const updateData: Record<string, unknown> = {};
  if (validatedBody.name !== undefined) {
    updateData.name = normalizeRequiredText(validatedBody.name, "name");
  }
  if (validatedBody.provider !== undefined) {
    updateData.provider = nextProvider;
  }
  if (validatedBody.baseUrl !== undefined) {
    updateData.baseUrl = assertValidBaseUrl(validatedBody.baseUrl);
  }
  if (validatedBody.apiKey !== undefined) {
    updateData.apiKey = nextApiKey;
  }
  if (validatedBody.modelId !== undefined) {
    updateData.modelId = normalizeRequiredText(validatedBody.modelId, "modelId");
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, message: "No changes to update" };
  }

  const [updatedModelConfig] = await db
    .update(modelConfigs)
    .set(updateData)
    .where(eq(modelConfigs.id, id))
    .returning();

  if (!updatedModelConfig) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update model config",
    });
  }

  return {
    success: true,
    modelConfig: {
      id: updatedModelConfig.id,
      name: updatedModelConfig.name,
      provider: updatedModelConfig.provider,
      baseUrl: updatedModelConfig.baseUrl || "",
      modelId: updatedModelConfig.modelId,
      createdAt: updatedModelConfig.createdAt.toISOString(),
    },
  };
});
