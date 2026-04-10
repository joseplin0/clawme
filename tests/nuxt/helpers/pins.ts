import type { PinListResponse, PinRecord } from "~~/shared/types/clawme";

export type PinIntentRouteKind = "pass" | "handled" | "needs_confirmation";

export interface PinIntentRouteInput {
  assistantUsername: string;
  roomType: "direct" | "group";
  text: string;
}

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

export function extractUrls(text: string): string[] {
  return text.match(URL_RE) ?? [];
}

export function normalizePinUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  const cleanedParams = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    if (
      key.startsWith("utm_") ||
      key === "fbclid" ||
      key === "gclid"
    ) {
      continue;
    }

    cleanedParams.append(key, value);
  }

  url.search = cleanedParams.toString();

  return url.toString();
}

export function classifyPinIntent(
  input: PinIntentRouteInput,
): PinIntentRouteKind {
  if (input.assistantUsername !== "clawme" || input.roomType !== "direct") {
    return "pass";
  }

  const urls = extractUrls(input.text);
  if (urls.length === 0) {
    return "pass";
  }

  if (/(采集|存一下|稍后看|入库)/.test(input.text)) {
    return "handled";
  }

  const textWithoutUrls = input.text
    .replace(URL_RE, "")
    .replace(/\s+/g, " ")
    .trim();

  if (textWithoutUrls.length <= 20 && !/[?？]/.test(textWithoutUrls)) {
    return "handled";
  }

  return "needs_confirmation";
}

export function mapPinCardFixture(record: PinRecord) {
  return {
    title: record.title,
    description: record.description,
    note: record.note,
    siteName: record.siteName,
    domain: record.domain,
    previewUrl: record.previewUrl,
    previewWidth: record.previewWidth,
    previewHeight: record.previewHeight,
    previewMode: record.previewMode,
    status: record.status,
    createdAt: record.createdAt,
  };
}

export function buildPinsApiResponse(
  list: PinRecord[],
  pageNum = 1,
  pageSize = list.length,
  total = list.length,
) : PinListResponse {
  return {
    list,
    pageNum,
    pageSize,
    total,
  };
}

export function createPinRecordFixture(
  overrides: Partial<PinRecord> = {},
): PinRecord {
  return {
    id: "pin-1",
    sourceUrl: "https://example.com/article",
    title: "一篇值得收藏的文章",
    description: "文章摘要",
    note: "晚点看",
    siteName: "Example",
    domain: "example.com",
    previewUrl: "/api/files/pin-cover.jpg",
    previewWidth: 1000,
    previewHeight: 1400,
    previewMode: "generated",
    status: "ready",
    sourceType: "chat_intent",
    createdAt: "2026-03-29T00:00:00.000Z",
    ...overrides,
  };
}
