import { createError, getCookie, getHeader, setCookie } from "h3";
import { readStoredState } from "~~/server/utils/app-state";

export const OWNER_SESSION_COOKIE = "clawme_owner_token";

function extractBearerToken(rawHeader?: string | null) {
  if (!rawHeader?.startsWith("Bearer ")) {
    return null;
  }

  return rawHeader.slice("Bearer ".length).trim();
}

export async function isOwnerAuthenticated(event: Parameters<typeof getCookie>[0]) {
  const state = await readStoredState();
  const bearer = extractBearerToken(getHeader(event, "authorization"));
  const cookie = getCookie(event, OWNER_SESSION_COOKIE);
  const token = bearer ?? cookie ?? null;

  return Boolean(token && token === state.ownerAuthToken);
}

export async function requireOwnerSession(
  event: Parameters<typeof getCookie>[0],
) {
  const state = await readStoredState();
  const bearer = extractBearerToken(getHeader(event, "authorization"));
  const cookie = getCookie(event, OWNER_SESSION_COOKIE);
  const token = bearer ?? cookie ?? null;

  if (!state.system.isInitialized || !state.owner || token !== state.ownerAuthToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Owner session is required.",
    });
  }

  return {
    state,
    owner: state.owner,
    bot: state.bot,
  };
}

export function setOwnerSessionCookie(event: Parameters<typeof setCookie>[0], token: string) {
  setCookie(event, OWNER_SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
}
