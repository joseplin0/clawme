import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";

const { llm } = schema;

const paramsSchema = z.object({
  id: z.uuid(),
});

const bodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  modelId: z.string().min(1).max(200).optional(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });

  const body = await readBody(event);
  const validatedBody = bodySchema.parse(body);

  const existingLlm = await db.query.llm.findFirst({
    where: eq(llm.id, id),
  });

  if (!existingLlm) {
    throw createError({
      statusCode: 404,
      statusMessage: "LLM provider not found",
    });
  }

  const updateData: Record<string, unknown> = {};
  if (validatedBody.name !== undefined) {
    updateData.name = validatedBody.name;
  }
  if (validatedBody.baseUrl !== undefined) {
    updateData.baseUrl = validatedBody.baseUrl;
  }
  if (validatedBody.apiKey !== undefined) {
    updateData.apiKey = validatedBody.apiKey;
  }
  if (validatedBody.modelId !== undefined) {
    updateData.modelId = validatedBody.modelId;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, message: "No changes to update" };
  }

  const [updatedLlm] = await db
    .update(llm)
    .set(updateData)
    .where(eq(llm.id, id))
    .returning();

  if (!updatedLlm) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update LLM provider",
    });
  }

  return {
    success: true,
    llm: {
      id: updatedLlm.id,
      name: updatedLlm.name,
      baseUrl: updatedLlm.baseUrl,
      modelId: updatedLlm.modelId,
    },
  };
});
