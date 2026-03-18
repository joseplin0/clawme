import { createError, readBody } from "h3";
import type { BootstrapRequest } from "~~/shared/types/clawme";
import { setOwnerSessionCookie } from "~~/server/utils/auth";
import { initializeSystem, toPublicStateResponse } from "~~/server/utils/app-state";

function clean(value: string | undefined, fallback = "") {
  return value?.trim() || fallback;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<BootstrapRequest>>(event);

  const payload: BootstrapRequest = {
    ownerNickname: clean(body.ownerNickname, "主理人"),
    ownerUsername: clean(body.ownerUsername, "owner").toLowerCase(),
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

  const state = await initializeSystem(payload);

  if (!state.ownerAuthToken) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create the owner session token.",
    });
  }

  setOwnerSessionCookie(event, state.ownerAuthToken);

  return toPublicStateResponse(state, true);
});
