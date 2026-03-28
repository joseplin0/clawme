import type {
  MomentAttachmentKind,
  MomentRecord,
} from "~~/shared/types/clawme";

type AssetRecord = {
  id: string;
  type: "image" | "video" | "audio" | "file" | "avatar" | "cover";
  url: string;
  fileName: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  coverUrl: string | null;
};

type MomentAssetRecord = {
  sort: number;
  asset: AssetRecord;
};

type MomentWithAssetsRecord = {
  id: string;
  userId: string;
  title: string | null;
  content: string | null;
  context: string | null;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  assets: MomentAssetRecord[];
};

function toMomentAttachmentKind(type: AssetRecord["type"]): MomentAttachmentKind {
  switch (type) {
    case "image":
    case "avatar":
    case "cover":
      return "IMAGE";
    default:
      return "DOCUMENT";
  }
}

function toAttachmentIcon(type: AssetRecord["type"]): string {
  switch (type) {
    case "image":
    case "avatar":
    case "cover":
      return "i-lucide-image";
    case "video":
      return "i-lucide-video";
    case "audio":
      return "i-lucide-audio-lines";
    default:
      return "i-lucide-file-text";
  }
}

function toAttachmentAccent(type: AssetRecord["type"]): string {
  switch (type) {
    case "image":
    case "avatar":
    case "cover":
      return "from-amber-100 to-rose-50";
    case "video":
      return "from-violet-100 to-fuchsia-50";
    case "audio":
      return "from-emerald-100 to-lime-50";
    default:
      return "from-sky-100 to-cyan-50";
  }
}

export function mapMomentToMomentRecord(
  moment: MomentWithAssetsRecord,
): MomentRecord {
  const attachments = [...moment.assets]
    .sort((left, right) => left.sort - right.sort)
    .map(({ asset }) => ({
      id: asset.id,
      kind: toMomentAttachmentKind(asset.type),
      url: asset.coverUrl || asset.url,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      title: asset.fileName || "",
      subtitle: asset.mimeType || "",
      icon: toAttachmentIcon(asset.type),
      accent: toAttachmentAccent(asset.type),
    }));

  return {
    id: moment.id,
    primaryAuthorId: moment.userId,
    coAuthorIds: [],
    title: moment.title,
    text: moment.content || "",
    context: moment.context || "随笔",
    likeCount: moment.likeCount,
    commentCount: 0,
    attachments,
    createdAt: moment.createdAt.toISOString(),
    updatedAt: moment.updatedAt.toISOString(),
  };
}
