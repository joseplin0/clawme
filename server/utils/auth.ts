import { createError, getCookie, getHeader, setCookie } from "h3";
import { readStoredState } from "~~/server/utils/app-state";
import { prisma } from "~~/server/utils/db";

export const OWNER_SESSION_COOKIE = "clawme_owner_token";

function extractBearerToken(rawHeader?: string | null) {
  if (!rawHeader?.startsWith("Bearer ")) {
    return null;
  }

  return rawHeader.slice("Bearer ".length).trim();
}

export async function isOwnerAuthenticated(event: Parameters<typeof getCookie>[0]) {
  const bearer = extractBearerToken(getHeader(event, "authorization"));
  const cookie = getCookie(event, OWNER_SESSION_COOKIE);
  const token = bearer ?? cookie ?? null;

  if (!token) return false;

  const owner = await prisma.user.findFirst({
    where: { role: "OWNER", type: "HUMAN", apiSecret: token }
  });

  return Boolean(owner);
}

export async function requireOwnerSession(
  event: Parameters<typeof getCookie>[0],
) {
  const bearer = extractBearerToken(getHeader(event, "authorization"));
  const cookie = getCookie(event, OWNER_SESSION_COOKIE);
  const token = bearer ?? cookie ?? null;

  // Optimistically fetch owner instead of pulling all DB state
  const ownerModel = await prisma.user.findFirst({
    where: { role: "OWNER", type: "HUMAN" }
  });
  
  const isInitializedConfig = await prisma.systemConfig.findUnique({ where: { id: "global" } });

  if (!isInitializedConfig?.isInitialized || !ownerModel || token !== ownerModel.apiSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: "Owner session is required.",
    });
  }

  // Fallback to readStoredState for backwards compatibility where the full state is expected
  // In the future this should be slimmed down
  const state = await readStoredState();

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
