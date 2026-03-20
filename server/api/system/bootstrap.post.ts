import { createError, readBody } from "h3";
import type { BootstrapRequest } from "~~/shared/types/clawme";
import { setOwnerSession, type OwnerSessionUser } from "~~/server/utils/auth";
import {
  initializeSystem,
  toPublicStateResponse,
} from "~~/server/utils/app-state";
import { db, schema } from "~~/server/utils/db";
import { and, eq } from "drizzle-orm";

const { users } = schema;

function clean(value: string | undefined, fallback = "") {
  return value?.trim() || fallback;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<BootstrapRequest>>(event);

  const payload: BootstrapRequest = {
    ownerNickname: clean(body.ownerNickname, "管理员"),
    ownerUsername: clean(body.ownerUsername, "owner").toLowerCase(),
    ownerPassword: clean(body.ownerPassword),
    assistantNickname: clean(body.assistantNickname, "虾米"),
    assistantRole: clean(body.assistantRole, "本地助理"),
    assistantBio: clean(
      body.assistantBio,
      "你是 Clawme 的默认本地助理，负责把系统底座与协作链路稳稳搭好。",
    ),
    providerName: clean(body.providerName, "oMLX"),
    providerBaseUrl: clean(body.providerBaseUrl, "http://localhost:8000/v1"),
    modelId: clean(body.modelId, "qwen3.5-8b-instruct"),
  };

  if (!/^[a-z0-9_-]{3,24}$/.test(payload.ownerUsername)) {
    throw createError({
      statusCode: 400,
      statusMessage: "ownerUsername must be 3-24 chars of a-z, 0-9, _ or -.",
    });
  }

  if (payload.ownerPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: "ownerPassword must be at least 6 characters.",
    });
  }

  const state = await initializeSystem(payload);

  if (!state.ownerAuthToken) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create the owner session token.",
    });
  }

  // Get the owner from database for full user info
  const owner = await db.query.users.findFirst({
    where: and(eq(users.role, "OWNER"), eq(users.type, "HUMAN")),
  });

  if (!owner) {
    throw createError({
      statusCode: 500,
      statusMessage: "Owner not found in database after initialization.",
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

  return toPublicStateResponse(state, true);
});
