import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";

const { users } = schema;

const paramsSchema = z.object({
  id: z.uuid(),
});

const bodySchema = z.object({
  nickname: z.string().min(1).max(100).optional(),
  intro: z.string().max(2000).optional(),
  role: z.string().max(100).optional(),
});

export default defineEventHandler(async (event) => {
  await requireOwnerSession(event);

  const rawId = getRouterParam(event, "id");
  const { id } = paramsSchema.parse({ id: rawId });

  const body = await readBody(event);
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
      intro: updatedUser.intro,
      role: updatedUser.role,
    },
  };
});
