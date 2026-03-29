import { createError, readBody } from "h3";
import type { BootstrapRequest } from "~~/shared/types/clawme";
import { setOwnerSession, type OwnerSessionUser } from "~~/server/utils/auth";
import {
  initializeSystem,
  toPublicStateResponse,
} from "~~/server/services";

export default defineEventHandler(async (event) => {
  const body = await readBody<BootstrapRequest>(event);

  if (!/^[a-z0-9_-]{3,24}$/.test(body.ownerUsername)) {
    throw createError({
      statusCode: 400,
      statusMessage: "ownerUsername must be 3-24 chars of a-z, 0-9, _ or -.",
    });
  }

  if (body.ownerPassword.length < 6) {
    throw createError({
      statusCode: 400,
      statusMessage: "ownerPassword must be at least 6 characters.",
    });
  }

  const result = await initializeSystem(body);

  if (!result.owner || !result.ownerAuthToken) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create the owner session token.",
    });
  }

  // Set session using nuxt-auth-utils
  const sessionUser: OwnerSessionUser = {
    id: result.owner.id,
    username: result.owner.username,
    nickname: result.owner.nickname,
    role: result.owner.role || "OWNER",
  };

  await setOwnerSession(event, sessionUser, result.ownerAuthToken);

  // 返回 PublicStateResponse；默认会话由后台继续生成
  return {
    ...toPublicStateResponse(result, true),
    roomId: result.rooms[0]?.id,
  };
});
