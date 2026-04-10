import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { db, schema } from "~~/server/utils/db";

type AssetKind = "image" | "file";

type PersistAssetInput = {
  userId: string;
  data: Uint8Array;
  fileName: string;
  mimeType: string;
  type?: AssetKind;
  width?: number;
  height?: number;
};

type CachedAssetRecord = {
  id: string;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
};

type CacheRemoteImageInput = {
  userId: string;
  remoteUrl: string;
  suggestedFileName?: string;
  timeoutMs?: number;
  maxBytes?: number;
};

type SvgCoverInput = {
  userId: string;
  title: string;
  subtitle: string;
  description?: string;
  width?: number;
  height?: number;
  fileName?: string;
};

const STORAGE_NAMESPACE = "assets:uploads";
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 1400;
const RASTER_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function persistBufferAsAsset(
  input: PersistAssetInput,
): Promise<CachedAssetRecord> {
  const storage = useStorage(STORAGE_NAMESPACE);
  const safeFileName = sanitizeFilename(input.fileName);
  const filename = `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  await storage.setItemRaw(filename, input.data);

  const [asset] = await db
    .insert(schema.assets)
    .values({
      userId: input.userId,
      type: input.type ?? inferAssetType(input.mimeType),
      url: `/api/files/${encodeURIComponent(filename)}`,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.data.byteLength,
      width: input.width,
      height: input.height,
    })
    .returning();

  if (!asset) {
    throw new Error("Failed to persist asset record");
  }

  await storage.setItem(buildMetadataKey(filename), {
    filename,
    originalName: input.fileName,
    mimeType: input.mimeType,
    size: input.data.byteLength,
    uploadedAt: new Date().toISOString(),
    assetId: asset.id,
  });

  return {
    id: asset.id,
    url: asset.url,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
  };
}

export async function cacheRemoteImageAsAsset(
  input: CacheRemoteImageInput,
): Promise<CachedAssetRecord> {
  const remoteUrl = new URL(input.remoteUrl);

  assertAllowedRemoteUrl(remoteUrl);
  await assertPublicHostname(remoteUrl.hostname);

  const response = await fetchWithTimeout(remoteUrl.toString(), {
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch remote image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!RASTER_MIME_TYPES.has(contentType)) {
    throw new Error(`Unsupported remote image type: ${contentType || "unknown"}`);
  }

  const bytes = await readResponseBodyWithLimit(
    response,
    input.maxBytes ?? DEFAULT_MAX_BYTES,
  );
  const fileName =
    input.suggestedFileName?.trim()
    || buildRemoteFileName(remoteUrl, contentType);

  return await persistBufferAsAsset({
    userId: input.userId,
    data: bytes,
    fileName,
    mimeType: contentType,
    type: "image",
  });
}

export async function generateSvgCoverAsAsset(
  input: SvgCoverInput,
): Promise<CachedAssetRecord> {
  const width = input.width ?? SVG_WIDTH;
  const height = input.height ?? SVG_HEIGHT;
  const svg = buildCoverSvg({
    width,
    height,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description ?? "",
  });

  return await persistBufferAsAsset({
    userId: input.userId,
    data: new TextEncoder().encode(svg),
    fileName: input.fileName ?? "pin-cover.svg",
    mimeType: "image/svg+xml",
    type: "image",
    width,
    height,
  });
}

function buildMetadataKey(filename: string) {
  return `meta/${filename}.json`;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function inferAssetType(mimeType: string): AssetKind {
  return mimeType.startsWith("image/") ? "image" : "file";
}

function buildRemoteFileName(url: URL, mimeType: string) {
  const pathname = url.pathname.split("/").filter(Boolean).pop();
  const fallbackBase = pathname?.trim() ? pathname : "remote-image";
  const ext = mimeTypeToExt(mimeType);
  return fallbackBase.includes(".") ? fallbackBase : `${fallbackBase}.${ext}`;
}

function mimeTypeToExt(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
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

async function fetchWithTimeout(
  url: string,
  input: { timeoutMs: number; redirect?: RequestRedirect },
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: input.redirect,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readResponseBodyWithLimit(response: Response, maxBytes: number) {
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > maxBytes) {
    throw new Error("Remote image is too large");
  }

  if (!response.body) {
    return new Uint8Array(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    received += value.byteLength;
    if (received > maxBytes) {
      throw new Error("Remote image is too large");
    }

    chunks.push(value);
  }

  const output = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

function buildCoverSvg(input: {
  width: number;
  height: number;
  title: string;
  subtitle: string;
  description: string;
}) {
  const title = escapeXml(clampText(input.title || input.subtitle || "未命名采集", 80));
  const subtitle = escapeXml(clampText(input.subtitle || "外部内容采集", 40));
  const description = escapeXml(clampText(input.description || "稍后再读", 120));
  const hue = stringToHue(`${input.title}-${input.subtitle}`);
  const hueSecondary = (hue + 35) % 360;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 78% 58%)" />
      <stop offset="100%" stop-color="hsl(${hueSecondary} 72% 42%)" />
    </linearGradient>
  </defs>
  <rect width="${input.width}" height="${input.height}" rx="48" fill="url(#bg)" />
  <rect x="64" y="64" width="${input.width - 128}" height="${input.height - 128}" rx="40" fill="rgba(255,255,255,0.12)" />
  <text x="96" y="170" fill="rgba(255,255,255,0.92)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="600">${subtitle}</text>
  <foreignObject x="88" y="220" width="${input.width - 176}" height="560">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: ui-sans-serif, system-ui, sans-serif; color: white; font-size: 72px; font-weight: 700; line-height: 1.08; letter-spacing: -0.03em;">
      ${title}
    </div>
  </foreignObject>
  <foreignObject x="92" y="${input.height - 420}" width="${input.width - 184}" height="210">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: ui-sans-serif, system-ui, sans-serif; color: rgba(255,255,255,0.84); font-size: 34px; line-height: 1.45;">
      ${description}
    </div>
  </foreignObject>
  <rect x="92" y="${input.height - 150}" width="${input.width - 184}" height="2" fill="rgba(255,255,255,0.28)" />
</svg>`;
}

function clampText(input: string, limit: number) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function stringToHue(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }

  return hash;
}
