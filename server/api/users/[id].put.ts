import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { UpdateUserRequest } from "~~/shared/types/clawme";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";

const { users, modelConfigs } = schema;

const paramsSchema = z.object({
  id: z.uuid(),
});

const bodySchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  intro: z.string().max(2000).optional(),
  role: z.string().max(100).optional(),
  avatar: z.union([z.string().max(2000), z.null()]).optional(),
  modelConfigId: z.union([z.uuid(), z.null()]).optional(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });

  const body = await readBody<UpdateUserRequest>(event);
  const validatedBody = bodySchema.parse(body);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!existingUser) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found",
    });
  }

  const updateData: Record<string, unknown> = {};
  if (validatedBody.nickname !== undefined) {
    updateData.nickname = validatedBody.nickname;
  }
  if (validatedBody.intro !== undefined) {
    updateData.intro = validatedBody.intro;
  }
  if (validatedBody.role !== undefined) {
    updateData.role = validatedBody.role;
  }
  if (validatedBody.avatar !== undefined) {
    updateData.avatar = validatedBody.avatar;
  }
  if (validatedBody.modelConfigId !== undefined) {
    if (validatedBody.modelConfigId) {
      const existingModelConfig = await db.query.modelConfigs.findFirst({
        where: eq(modelConfigs.id, validatedBody.modelConfigId),
      });

      if (!existingModelConfig) {
        throw createError({
          statusCode: 404,
          statusMessage: "Model config not found",
        });
      }
    }

    updateData.modelConfigId = validatedBody.modelConfigId;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, message: "No changes to update" };
  }

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();

  if (!updatedUser) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update user",
    });
  }

  return {
    success: true,
    user: {
      id: updatedUser.id,
      nickname: updatedUser.nickname,
      avatar: updatedUser.avatar,
      intro: updatedUser.intro,
      role: updatedUser.role,
      modelConfigId: updatedUser.modelConfigId,
    },
  };
});
