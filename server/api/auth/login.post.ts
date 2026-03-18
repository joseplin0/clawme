import { createError, readBody } from "h3";
import { hashPassword, readStoredState, writeStoredState } from "~~/server/utils/app-state";
import { setOwnerSessionCookie } from "~~/server/utils/auth";

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

  setOwnerSessionCookie(event, state.ownerAuthToken);

  return {
    ok: true,
    owner: {
      username: state.owner.username,
      nickname: state.owner.nickname,
    },
  };
});
