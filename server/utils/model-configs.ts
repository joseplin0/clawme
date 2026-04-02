import { createError } from "h3";
import {
  getModelProviderCatalogEntry,
  isApiKeyRequiredForProvider,
} from "~~/shared/utils/model-config-catalog";

export function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeRequiredText(
  value: string | null | undefined,
  field: string,
) {
  const normalized = value?.trim();
  if (!normalized) {
    throw createError({
      statusCode: 400,
      statusMessage: `${field} is required`,
    });
  }

  return normalized;
}

export function assertKnownModelProvider(provider: string) {
  const entry = getModelProviderCatalogEntry(provider);
  if (!entry) {
    throw createError({
      statusCode: 400,
      statusMessage: "Unknown model provider",
    });
  }

  return entry;
}

export function assertValidBaseUrl(baseUrl: string | null | undefined) {
  const normalized = normalizeOptionalText(baseUrl);
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).toString().replace(/\/$/, "");
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "baseUrl must be a valid URL",
    });
  }
}

export function assertApiKeyForProvider(
  provider: string,
  apiKey: string | null | undefined,
) {
  const normalized = normalizeOptionalText(apiKey);
  if (isApiKeyRequiredForProvider(provider) && !normalized) {
    throw createError({
      statusCode: 400,
      statusMessage: "apiKey is required for this provider",
    });
  }

  return normalized;
}
