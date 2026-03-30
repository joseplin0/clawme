import { createError, readBody } from "h3";
import { and, eq } from "drizzle-orm";
import { setOwnerSession, type OwnerSessionUser } from "~~/server/utils/auth";
import { isSystemInitialized } from "~~/server/utils/system-config";
import { signJwtToken } from "~~/server/utils/jwt";
import { db, schema } from "~~/server/utils/db";

const { users } = schema;

interface LoginRequest {
  username?: string;
  password?: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginRequest>(event);
  const username = body.username?.trim();
  const password = body.password?.trim();

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: "Username and password are required.",
    });
  }

  if (!(await isSystemInitialized())) {
    throw createError({
      statusCode: 409,
      statusMessage: "System is not initialized yet.",
    });
  }

  const owner = await db.query.users.findFirst({
    where: and(
      eq(users.role, "OWNER"),
      eq(users.type, "human"),
      eq(users.username, username),
    ),
  });

  if (!owner) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid owner username.",
    });
  }

  if (!owner.passwordHash) {
    throw createError({
      statusCode: 500,
      statusMessage: "Owner password not set. Please reinitialize the system.",
    });
  }

  const isValid = await verifyPassword(owner.passwordHash, password);
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid password.",
    });
  }

  if (!owner.apiSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Owner API secret not set.",
    });
  }

  // Set session using nuxt-auth-utils
  const sessionUser: OwnerSessionUser = {
    id: owner.id,
    username: owner.username,
    nickname: owner.nickname,
    role: owner.role || "OWNER",
  };

  await setOwnerSession(event, sessionUser, owner.apiSecret);

  // Issue a JWT token for non-cookie clients when JWT auth is configured
  const token = await signJwtToken(sessionUser);

  return {
    ok: true,
    owner: {
      username: owner.username,
      nickname: owner.nickname,
    },
    token,
  };
});
