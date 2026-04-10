import type { PinPreviewMode, PinRecord, PinStatus } from "~~/shared/types/clawme";

type AssetRecord = {
  url: string;
  width: number | null;
  height: number | null;
};

type PinWithPreviewRecord = {
  id: string;
  sourceUrl: string;
  title: string;
  description: string;
  note: string;
  siteName: string;
  previewMode: PinPreviewMode;
  status: PinStatus;
  sourceType: "chat_intent";
  createdAt: Date;
  previewAsset: AssetRecord | null;
};

export function mapPinToPinRecord(pin: PinWithPreviewRecord): PinRecord {
  const domain = toDomain(pin.sourceUrl);

  return {
    id: pin.id,
    sourceUrl: pin.sourceUrl,
    title: pin.title,
    description: pin.description,
    note: pin.note,
    siteName: pin.siteName,
    domain,
    previewUrl: pin.previewAsset?.url ?? "",
    previewWidth: pin.previewAsset?.width ?? undefined,
    previewHeight: pin.previewAsset?.height ?? undefined,
    previewMode: pin.previewMode,
    status: pin.status,
    sourceType: pin.sourceType,
    createdAt: pin.createdAt.toISOString(),
  };
}

function toDomain(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return "";
  }
}
