import { createError, readBody } from "h3";
import { and, eq } from "drizzle-orm";
import { readStoredState } from "~~/server/services";
import { setOwnerSession, type OwnerSessionUser } from "~~/server/utils/auth";
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

  const state = await readStoredState();

  if (!state.system.isInitialized || !state.owner || !state.ownerAuthToken) {
    throw createError({
      statusCode: 409,
      statusMessage: "System is not initialized yet.",
    });
  }

  if (username !== state.owner.username) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid owner username.",
    });
  }

  if (!state.ownerPasswordHash) {
    throw createError({
      statusCode: 500,
      statusMessage: "Owner password not set. Please reinitialize the system.",
    });
  }

  const isValid = await verifyPassword(state.ownerPasswordHash, password);
  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid password.",
    });
  }

  // Get the owner from database for full user info
  const owner = await db.query.users.findFirst({
    where: and(eq(users.role, "OWNER"), eq(users.type, "HUMAN")),
  });

  if (!owner) {
    throw createError({
      statusCode: 500,
      statusMessage: "Owner not found in database.",
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
