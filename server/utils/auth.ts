import { createError, getHeader } from "h3";
import { readStoredState } from "~~/server/utils/app-state";
import { prisma } from "~~/server/utils/db";
import type { H3Event } from "h3";

// Owner session user type
export interface OwnerSessionUser {
  id: string;
  username: string;
  nickname: string;
  role: string;
}

// Extended session data with secure fields
interface OwnerSessionData {
  user: OwnerSessionUser;
  secure?: {
    apiSecret: string;
  };
}

function extractBearerToken(rawHeader?: string | null) {
  if (!rawHeader?.startsWith("Bearer ")) {
    return null;
  }
  return rawHeader.slice("Bearer ".length).trim();
}

/**
 * Set owner session using nuxt-auth-utils
 */
export async function setOwnerSession(event: H3Event, user: OwnerSessionUser, apiSecret: string) {
  await setUserSession(event, {
    user,
    secure: {
      apiSecret,
    },
  });
}

/**
 * Get owner session from nuxt-auth-utils
 */
export async function getOwnerSession(event: H3Event): Promise<OwnerSessionData | null> {
  const session = await getUserSession(event);

  if (!session?.user?.id) {
    return null;
  }

  return session as OwnerSessionData;
}

/**
 * Check if owner is authenticated via session or Bearer token
 */
export async function isOwnerAuthenticated(event: H3Event): Promise<boolean> {
  // First check nuxt-auth-utils session
  const session = await getOwnerSession(event);
  if (session?.user) {
    // Verify the apiSecret matches
    const owner = await prisma.user.findFirst({
      where: { id: session.user.id, role: "OWNER", type: "HUMAN" },
    });
    if (owner && session.secure?.apiSecret === owner.apiSecret) {
      return true;
    }
  }

  // Fallback to Bearer token for API access
  const bearer = extractBearerToken(getHeader(event, "authorization"));
  if (bearer) {
    const owner = await prisma.user.findFirst({
      where: { role: "OWNER", type: "HUMAN", apiSecret: bearer },
    });
    return Boolean(owner);
  }

  return false;
}

/**
 * Require owner session - throws 401 if not authenticated
 */
export async function requireOwnerSession(event: H3Event) {
  // Check Bearer token first for API access
  const bearer = extractBearerToken(getHeader(event, "authorization"));

  if (bearer) {
    const ownerModel = await prisma.user.findFirst({
      where: { role: "OWNER", type: "HUMAN" },
    });
    const isInitializedConfig = await prisma.systemConfig.findUnique({
      where: { id: "global" },
    });

    if (
      !isInitializedConfig?.isInitialized ||
      !ownerModel ||
      bearer !== ownerModel.apiSecret
    ) {
      throw createError({
        statusCode: 401,
        statusMessage: "Owner session is required.",
      });
    }

    const state = await readStoredState();
    return {
      state,
      owner: state.owner,
      bot: state.bot,
    };
  }

  // Check session-based authentication
  const session = await getOwnerSession(event);

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Owner session is required.",
    });
  }

  // Verify the session is still valid
  const ownerModel = await prisma.user.findFirst({
    where: { id: session.user.id, role: "OWNER", type: "HUMAN" },
  });
  const isInitializedConfig = await prisma.systemConfig.findUnique({
    where: { id: "global" },
  });

  if (
    !isInitializedConfig?.isInitialized ||
    !ownerModel ||
    session.secure?.apiSecret !== ownerModel.apiSecret
  ) {
    // Clear invalid session
    await clearUserSession(event);
    throw createError({
      statusCode: 401,
      statusMessage: "Owner session is required.",
    });
  }

  const state = await readStoredState();
  return {
    state,
    owner: state.owner,
    bot: state.bot,
  };
}

/**
 * Clear owner session
 */
export async function clearOwnerSession(event: H3Event) {
  await clearUserSession(event);
}
