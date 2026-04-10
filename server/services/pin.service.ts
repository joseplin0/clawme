import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { and, count, desc, eq } from "drizzle-orm";
import type { PinListResponse } from "~~/shared/types/clawme";
import { db, schema } from "~~/server/utils/db";
import {
  cacheRemoteImageAsAsset,
  generateSvgCoverAsAsset,
} from "./asset.service";
import { mapPinToPinRecord } from "./pin-record.mapper";

const { pins } = schema;

const URL_MATCHER = /https?:\/\/[^\s<>"'）)]+/gi;
const TRACKING_PARAM_KEYS = new Set(["fbclid", "gclid"]);

export type PinIngestSummary = {
  savedCount: number;
  duplicateCount: number;
  failedCount: number;
};

export async function getPaginatedPins(
  ownerId: string,
  page: number = 1,
  limit: number = 15,
): Promise<PinListResponse> {
  const offset = (page - 1) * limit;
  const [pinList, totalCount] = await Promise.all([
    db.query.pins.findMany({
      where: eq(pins.ownerId, ownerId),
      with: {
        previewAsset: true,
      },
      orderBy: [desc(pins.createdAt)],
      limit,
      offset,
    }),
    db
      .select({ count: count() })
      .from(pins)
      .where(eq(pins.ownerId, ownerId)),
  ]);

  return {
    list: pinList.map(mapPinToPinRecord),
    pageNum: page,
    pageSize: limit,
    total: totalCount[0]?.count ?? 0,
  };
}

export async function getPaginatedPinsByUserId(
  userId: string,
  page: number = 1,
  limit: number = 15,
): Promise<PinListResponse> {
  const offset = (page - 1) * limit;
  const [pinList, totalCount] = await Promise.all([
    db.query.pins.findMany({
      where: eq(pins.ownerId, userId),
      with: {
        previewAsset: true,
      },
      orderBy: [desc(pins.createdAt)],
      limit,
      offset,
    }),
    db
      .select({ count: count() })
      .from(pins)
      .where(eq(pins.ownerId, userId)),
  ]);

  return {
    list: pinList.map(mapPinToPinRecord),
    pageNum: page,
    pageSize: limit,
    total: totalCount[0]?.count ?? 0,
  };
}

export function extractUrlsFromText(text: string) {
  return Array.from(
    new Set(
      (text.match(URL_MATCHER) ?? [])
        .map(cleanMatchedUrl)
        .filter(Boolean),
    ),
  );
}

export function stripUrlsFromText(text: string) {
  return text.replace(URL_MATCHER, " ").replace(/\s+/g, " ").trim();
}

export async function ingestPinsFromMessage(input: {
  ownerId: string;
  roomId: string;
  messageId: string;
  text: string;
}): Promise<PinIngestSummary> {
  const urls = extractUrlsFromText(input.text);
  const note = stripUrlsFromText(input.text);

  let savedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  for (const url of urls) {
    try {
      const normalizedUrl = normalizeUrl(url);
      const existing = await db.query.pins.findFirst({
        where: and(
          eq(pins.ownerId, input.ownerId),
          eq(pins.normalizedUrl, normalizedUrl),
        ),
      });

      if (existing) {
        duplicateCount += 1;
        continue;
      }

      const metadata = await fetchUrlMetadata(url).catch(() => null);
      const domain = safeHostname(url);
      const siteName = metadata?.siteName || domain;
      const title = metadata?.title || domain || "未命名采集";
      const description = metadata?.description || note || "稍后再读";
      const previewAsset = metadata?.coverUrl
        ? await cacheRemoteImageAsAsset({
          userId: input.ownerId,
          remoteUrl: metadata.coverUrl,
          suggestedFileName: `${slugify(siteName || domain || "pin")}-cover`,
        }).catch(() => null)
        : null;

      const fallbackAsset = previewAsset ?? await generateSvgCoverAsAsset({
        userId: input.ownerId,
        title,
        subtitle: siteName || domain || "外部采集",
        description,
        fileName: `${slugify(siteName || domain || "pin")}-cover.svg`,
      });

      await db.insert(pins).values({
        ownerId: input.ownerId,
        sourceUrl: url,
        normalizedUrl,
        siteName,
        title,
        description,
        note,
        remoteCoverUrl: metadata?.coverUrl ?? null,
        previewAssetId: fallbackAsset.id,
        previewMode: previewAsset ? "fetched" : "generated",
        sourceRoomId: input.roomId,
        sourceMessageId: input.messageId,
        sourceType: "chat_intent",
        status: "ready",
      });

      savedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return {
    savedCount,
    duplicateCount,
    failedCount,
  };
}

export function normalizeUrl(input: string) {
  const url = new URL(cleanMatchedUrl(input));
  url.hash = "";
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  const nextParams = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    if (key.toLowerCase().startsWith("utm_")) {
      continue;
    }

    if (TRACKING_PARAM_KEYS.has(key.toLowerCase())) {
      continue;
    }

    nextParams.append(key, value);
  }

  url.search = nextParams.toString();
  return url.toString();
}

async function fetchUrlMetadata(sourceUrl: string) {
  const url = new URL(sourceUrl);

  assertAllowedRemoteUrl(url);
  await assertPublicHostname(url.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }

    const html = await response.text();
    return {
      title:
        readMetaContent(html, "property", "og:title")
        || readMetaContent(html, "name", "twitter:title")
        || readTitle(html)
        || "",
      description:
        readMetaContent(html, "property", "og:description")
        || readMetaContent(html, "name", "description")
        || readMetaContent(html, "name", "twitter:description")
        || "",
      siteName:
        readMetaContent(html, "property", "og:site_name")
        || safeHostname(sourceUrl),
      coverUrl: normalizeMetaUrl(
        readMetaContent(html, "property", "og:image")
        || readMetaContent(html, "name", "twitter:image")
        || "",
        response.url,
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

function readTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtml(match?.[1] ?? "").trim();
}

function readMetaContent(
  html: string,
  attribute: "property" | "name",
  key: string,
) {
  const pattern = new RegExp(
    `<meta[^>]*${attribute}=["']${escapeRegExp(key)}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversePattern = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escapeRegExp(key)}["'][^>]*>`,
    "i",
  );

  const match = html.match(pattern) ?? html.match(reversePattern);
  return decodeHtml(match?.[1] ?? "").trim();
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function normalizeMetaUrl(value: string, baseUrl: string) {
  if (!value.trim()) {
    return "";
  }

  try {
    const url = new URL(value, baseUrl);
    return url.toString();
  } catch {
    return "";
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanMatchedUrl(url: string) {
  return url.replace(/[),.;!?]+$/g, "").trim();
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function slugify(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "pin";
}

function assertAllowedRemoteUrl(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Localhost URLs are not allowed");
  }
}

async function assertPublicHostname(hostname: string) {
  const results = await lookup(hostname, { all: true });

  for (const result of results) {
    if (!isPublicAddress(result.address)) {
      throw new Error("Private network URLs are not allowed");
    }
  }
}

function isPublicAddress(address: string) {
  if (isIP(address) === 4) {
    if (
      address.startsWith("10.")
      || address.startsWith("127.")
      || address.startsWith("169.254.")
      || address.startsWith("192.168.")
    ) {
      return false;
    }

    const [first, second = 0] = address.split(".").map((segment) => Number(segment));
    if (first === 172 && second >= 16 && second <= 31) {
      return false;
    }

    return true;
  }

  const normalized = address.toLowerCase();
  return !(
    normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:")
  );
}
