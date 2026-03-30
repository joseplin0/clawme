import { createError, getHeader } from "h3";
import { and, eq } from "drizzle-orm";
import { db, schema } from "~~/server/utils/db";
import type { H3Event } from "h3";
import { isSystemInitialized } from "./system-config";
import { verifyJwtToken } from "./jwt";

const { users } = schema;
const OWNER_AUTH_CACHE_TTL_MS = 30_000;
const SESSION_CACHE_KEY_PREFIX = "session-user";
const JWT_CACHE_KEY_PREFIX = "jwt-user";
const API_SECRET_CACHE_KEY_PREFIX = "api-secret";

type OwnerAuthCacheEntry = {
  user: OwnerSessionUser;
  expiresAt: number;
};

const ownerAuthCache = new Map<string, OwnerAuthCacheEntry>();

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

type OwnerAuthContext = {
  user?: OwnerSessionUser;
  [key: string]: unknown;
};

type OwnerAuthTarget = {
  context: OwnerAuthContext;
  headers?: Headers;
};

type RawOwnerSession = {
  user?: Record<string, unknown> | null;
  secure?: {
    apiSecret?: string;
  };
} | null;

declare const setUserSession: (
  event: H3Event,
  data: OwnerSessionData,
) => Promise<unknown>;
declare const getUserSession: (
  event: H3Event | OwnerAuthTarget,
) => Promise<RawOwnerSession>;
declare const clearUserSession: (event: H3Event) => Promise<boolean>;

function extractBearerToken(rawHeader?: string | null) {
  if (!rawHeader?.startsWith("Bearer ")) {
    return null;
  }
  return rawHeader.slice("Bearer ".length).trim();
}

function isOwnerSessionUser(value: unknown): value is OwnerSessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Partial<OwnerSessionUser>;
  return (
    typeof user.id === "string" &&
    typeof user.username === "string" &&
    typeof user.nickname === "string" &&
    typeof user.role === "string"
  );
}

function getOwnerContext(target: OwnerAuthTarget) {
  return target.context;
}

function isH3EventTarget(
  target: OwnerAuthTarget,
): target is H3Event & OwnerAuthTarget {
  return "node" in (target as Record<string, unknown>);
}

function getAuthorizationHeader(target: OwnerAuthTarget) {
  if (isH3EventTarget(target)) {
    return getHeader(target, "authorization");
  }

  return target.headers?.get("authorization") ?? null;
}

function getCookieHeader(target: OwnerAuthTarget) {
  if (isH3EventTarget(target)) {
    return getHeader(target, "cookie");
  }

  return target.headers?.get("cookie") ?? null;
}

function normalizeOwnerUser(user: OwnerSessionUser) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    role: user.role,
  } satisfies OwnerSessionUser;
}

function buildSessionCacheKey(userId: string, apiSecret: string) {
  return `${SESSION_CACHE_KEY_PREFIX}:${userId}:${apiSecret}`;
}

function buildJwtCacheKey(userId: string, bearer: string) {
  return `${JWT_CACHE_KEY_PREFIX}:${userId}:${bearer}`;
}

function buildApiSecretCacheKey(bearer: string) {
  return `${API_SECRET_CACHE_KEY_PREFIX}:${bearer}`;
}

function getCachedOwnerUser(cacheKey: string): OwnerSessionUser | null {
  const cached = ownerAuthCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    ownerAuthCache.delete(cacheKey);
    return null;
  }

  return normalizeOwnerUser(cached.user);
}

function setCachedOwnerUser(cacheKey: string, user: OwnerSessionUser) {
  ownerAuthCache.set(cacheKey, {
    user: normalizeOwnerUser(user),
    expiresAt: Date.now() + OWNER_AUTH_CACHE_TTL_MS,
  });
}

function invalidateOwnerAuthCacheByPrefix(prefix: string) {
  for (const key of ownerAuthCache.keys()) {
    if (key.startsWith(prefix)) {
      ownerAuthCache.delete(key);
    }
  }
}

function invalidateOwnerAuthCacheForUser(userId: string) {
  invalidateOwnerAuthCacheByPrefix(`${SESSION_CACHE_KEY_PREFIX}:${userId}:`);
  invalidateOwnerAuthCacheByPrefix(`${JWT_CACHE_KEY_PREFIX}:${userId}:`);
  for (const [key, entry] of ownerAuthCache.entries()) {
    if (
      key.startsWith(`${API_SECRET_CACHE_KEY_PREFIX}:`) &&
      entry.user.id === userId
    ) {
      ownerAuthCache.delete(key);
    }
  }
}

async function readValidatedOwnerById(userId: string) {
  return await db.query.users.findFirst({
    where: and(
      eq(users.id, userId),
      eq(users.role, "OWNER"),
      eq(users.type, "human"),
    ),
  });
}

async function getExistingOwnerSession(
  target: H3Event | OwnerAuthTarget,
): Promise<OwnerSessionData | null> {
  if (!isH3EventTarget(target) && !getCookieHeader(target)) {
    return null;
  }

  try {
    return await getOwnerSession(target);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cannot initialize a new session")
    ) {
      return null;
    }

    throw error;
  }
}

async function resolveOwnerUser(
  target: OwnerAuthTarget,
): Promise<OwnerSessionUser | null> {
  const context = getOwnerContext(target);
  if (isOwnerSessionUser(context.user)) {
    return normalizeOwnerUser(context.user);
  }

  const session = await getExistingOwnerSession(target);
  if (session?.user && session.secure?.apiSecret) {
    const sessionCacheKey = buildSessionCacheKey(
      session.user.id,
      session.secure.apiSecret,
    );
    const cachedUser = getCachedOwnerUser(sessionCacheKey);
    if (cachedUser) {
      context.user = cachedUser;
      return cachedUser;
    }

    const owner = await readValidatedOwnerById(session.user.id);
    if (owner && session.secure?.apiSecret === owner.apiSecret) {
      const user = normalizeOwnerUser({
        id: owner.id,
        username: owner.username,
        nickname: owner.nickname,
        role: "OWNER",
      });
      context.user = user;
      setCachedOwnerUser(sessionCacheKey, user);
      return user;
    }
  }

  const bearer = extractBearerToken(getAuthorizationHeader(target));
  if (!bearer) {
    return null;
  }

  const jwtUser = await verifyJwtToken(bearer);
  if (jwtUser) {
    const jwtCacheKey = buildJwtCacheKey(jwtUser.id, bearer);
    const cachedUser = getCachedOwnerUser(jwtCacheKey);
    if (cachedUser) {
      context.user = cachedUser;
      return cachedUser;
    }

    const owner = await readValidatedOwnerById(jwtUser.id);
    if (owner) {
      const user = normalizeOwnerUser({
        id: owner.id,
        username: owner.username,
        nickname: owner.nickname,
        role: "OWNER",
      });
      context.user = user;
      setCachedOwnerUser(jwtCacheKey, user);
      return user;
    }
  }

  const apiSecretCacheKey = buildApiSecretCacheKey(bearer);
  const cachedUser = getCachedOwnerUser(apiSecretCacheKey);
  if (cachedUser) {
    context.user = cachedUser;
    return cachedUser;
  }

  const owner = await db.query.users.findFirst({
    where: and(
      eq(users.role, "OWNER"),
      eq(users.type, "human"),
      eq(users.apiSecret, bearer),
    ),
  });
  if (!owner) {
    return null;
  }

  const user = normalizeOwnerUser({
    id: owner.id,
    username: owner.username,
    nickname: owner.nickname,
    role: "OWNER",
  });
  context.user = user;
  setCachedOwnerUser(apiSecretCacheKey, user);
  return user;
}

/**
 * Set owner session using nuxt-auth-utils
 */
export async function setOwnerSession(
  event: H3Event,
  user: OwnerSessionUser,
  apiSecret: string,
) {
  invalidateOwnerAuthCacheByPrefix(`${API_SECRET_CACHE_KEY_PREFIX}:`);
  invalidateOwnerAuthCacheForUser(user.id);
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
export async function getOwnerSession(
  event: H3Event | OwnerAuthTarget,
): Promise<OwnerSessionData | null> {
  const session = await getUserSession(event);

  if (!session?.user || !("id" in session.user)) {
    return null;
  }

  return session as unknown as OwnerSessionData;
}

/**
 * Check if owner is authenticated via session or Bearer token (JWT or apiSecret)
 */
export async function isOwnerAuthenticated(event: H3Event): Promise<boolean> {
  return Boolean(await resolveOwnerUser(event));
}

/**
 * Require owner session - throws 401 if not authenticated
 * Returns the normalized owner user for callers that need the current user id.
 */
export async function requireOwnerSession(event: H3Event) {
  const user = await resolveOwnerUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Owner session is required.",
    });
  }

  if (!(await isSystemInitialized())) {
    throw createError({
      statusCode: 401,
      statusMessage: "System not initialized.",
    });
  }

  return user;
}

/**
 * Resolve the current owner user for WebSocket upgrade requests.
 */
export async function resolveOwnerSocketUser(target: OwnerAuthTarget) {
  return await resolveOwnerUser(target);
}

/**
 * Clear owner session
 */
export async function clearOwnerSession(event: H3Event) {
  const contextUser = isOwnerSessionUser(event.context.user)
    ? normalizeOwnerUser(event.context.user)
    : null;
  if (contextUser) {
    invalidateOwnerAuthCacheForUser(contextUser.id);
  }
  delete event.context.user;
  await clearUserSession(event);
}
