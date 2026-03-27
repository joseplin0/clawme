import { createError, getHeader } from "h3";
import { and, eq } from "drizzle-orm";
import { db, schema } from "~~/server/utils/db";
import type { H3Event } from "h3";

const { users, systemConfig } = schema;

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

type RawOwnerSession = {
  user?: Record<string, unknown> | null;
  secure?: {
    apiSecret?: string;
  };
} | null;

declare const setUserSession: (event: H3Event, data: OwnerSessionData) => Promise<unknown>;
declare const getUserSession: (event: H3Event) => Promise<RawOwnerSession>;
declare const clearUserSession: (event: H3Event) => Promise<boolean>;

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

  if (!session?.user || !('id' in session.user)) {
    return null;
  }

  return session as unknown as OwnerSessionData;
}

/**
 * Check if owner is authenticated via session or Bearer token
 */
export async function isOwnerAuthenticated(event: H3Event): Promise<boolean> {
  // First check nuxt-auth-utils session
  const session = await getOwnerSession(event);
  if (session?.user) {
    // Verify the apiSecret matches
    const owner = await db.query.users.findFirst({
      where: and(
        eq(users.id, session.user.id),
        eq(users.role, "OWNER"),
        eq(users.type, "HUMAN")
      ),
    });
    if (owner && session.secure?.apiSecret === owner.apiSecret) {
      return true;
    }
  }

  // Fallback to Bearer token for API access
  const bearer = extractBearerToken(getHeader(event, "authorization"));
  if (bearer) {
    const owner = await db.query.users.findFirst({
      where: and(
        eq(users.role, "OWNER"),
        eq(users.type, "HUMAN"),
        eq(users.apiSecret, bearer)
      ),
    });
    return Boolean(owner);
  }

  return false;
}

/**
 * Require owner session - throws 401 if not authenticated
 * Only validates authentication, does not fetch state data
 */
export async function requireOwnerSession(event: H3Event) {
  // Check Bearer token first for API access
  const bearer = extractBearerToken(getHeader(event, "authorization"));

  if (bearer) {
    const ownerModel = await db.query.users.findFirst({
      where: and(eq(users.role, "OWNER"), eq(users.type, "HUMAN")),
    });
    const isInitializedConfig = await db.query.systemConfig.findFirst({
      where: eq(systemConfig.id, "global"),
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

    return;
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
  const ownerModel = await db.query.users.findFirst({
    where: and(
      eq(users.id, session.user.id),
      eq(users.role, "OWNER"),
      eq(users.type, "HUMAN")
    ),
  });
  const isInitializedConfig = await db.query.systemConfig.findFirst({
    where: eq(systemConfig.id, "global"),
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
}

/**
 * Clear owner session
 */
export async function clearOwnerSession(event: H3Event) {
  await clearUserSession(event);
}
