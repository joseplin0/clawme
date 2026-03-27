import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { OwnerSessionUser } from "./auth";

type OwnerJwtPayload = JWTPayload & {
  id: string;
  username: string;
  nickname: string;
  role: "OWNER";
  scope: "owner-api";
};

let hasWarnedMissingSecret = false;

function getSecretKey() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    return new TextEncoder().encode(secret);
  }

  if (!hasWarnedMissingSecret) {
    hasWarnedMissingSecret = true;
    console.warn("[auth] JWT_SECRET 未配置，Bearer JWT 鉴权已禁用。");
  }

  return null;
}

function isOwnerJwtPayload(payload: JWTPayload): payload is OwnerJwtPayload {
  return (
    payload.scope === "owner-api" &&
    payload.role === "OWNER" &&
    typeof payload.id === "string" &&
    typeof payload.username === "string" &&
    typeof payload.nickname === "string"
  );
}

/**
 * Sign a JWT token for owner API access.
 * Returns null when JWT auth is not configured.
 */
export async function signJwtToken(
  user: OwnerSessionUser,
  expiresIn = "24h",
): Promise<string | null> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return null;
  }

  return await new SignJWT({
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    role: "OWNER",
    scope: "owner-api",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("clawme")
    .setSubject(user.id)
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Verify a JWT token and return a normalized owner user.
 */
export async function verifyJwtToken(
  token: string,
): Promise<OwnerSessionUser | null> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: "clawme",
    });

    if (!isOwnerJwtPayload(payload)) {
      return null;
    }

    return {
      id: payload.id,
      username: payload.username,
      nickname: payload.nickname,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
