import { createError, readBody } from "h3";
import { hashPassword, readStoredState, writeStoredState } from "~~/server/utils/app-state";
import { setOwnerSession, type OwnerSessionUser } from "~~/server/utils/auth";
import { prisma } from "~~/server/utils/db";

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
    state.ownerPasswordHash = hashPassword(password);
    await writeStoredState(state);
  } else if (state.ownerPasswordHash !== hashPassword(password)) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid password.",
    });
  }

  // Get the owner from database for full user info
  const owner = await prisma.user.findFirst({
    where: { role: "OWNER", type: "HUMAN" },
  });

  if (!owner) {
    throw createError({
      statusCode: 500,
      statusMessage: "Owner not found in database.",
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

  return {
    ok: true,
    owner: {
      username: owner.username,
      nickname: owner.nickname,
    },
  };
});
