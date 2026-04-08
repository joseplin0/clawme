import { createError, readMultipartFormData } from "h3";
import { requireOwnerSession } from "~~/server/utils/auth";
import { db, schema } from "~~/server/utils/db";

type UploadMetadata = {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  assetId: string;
};

const STORAGE_NAMESPACE = "assets:uploads";
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const { assets } = schema;

export default defineEventHandler(async (event) => {
  const owner = await requireOwnerSession(event);
  const formData = await readMultipartFormData(event);
  const uploadedFile = formData?.find((item) => item.name === "file");

  if (!uploadedFile || !uploadedFile.filename || !uploadedFile.data) {
    throw createError({
      statusCode: 400,
      statusMessage: "未找到上传文件",
    });
  }

  if (uploadedFile.data.byteLength > MAX_UPLOAD_SIZE) {
    throw createError({
      statusCode: 413,
      statusMessage: "上传文件过大",
    });
  }

  const storage = useStorage(STORAGE_NAMESPACE);
  const safeOriginalName = sanitizeFilename(uploadedFile.filename);
  const filename = `${Date.now()}-${crypto.randomUUID()}-${safeOriginalName}`;
  const mimeType = uploadedFile.type || "application/octet-stream";
  const assetType = inferAssetType(mimeType);

  await storage.setItemRaw(filename, uploadedFile.data);

  const [asset] = await db
    .insert(assets)
    .values({
      userId: owner.id,
      type: assetType,
      url: `/api/files/${encodeURIComponent(filename)}`,
      fileName: uploadedFile.filename,
      mimeType,
      size: uploadedFile.data.byteLength,
    })
    .returning();

  if (!asset) {
    throw createError({
      statusCode: 500,
      statusMessage: "资源记录创建失败",
    });
  }

  await storage.setItem<UploadMetadata>(`${filename}:meta`, {
    filename,
    originalName: uploadedFile.filename,
    mimeType,
    size: uploadedFile.data.byteLength,
    uploadedAt: new Date().toISOString(),
    assetId: asset.id,
  });

  return {
    success: true,
    assetId: asset.id,
    filename,
    originalName: uploadedFile.filename,
    mimeType,
    size: uploadedFile.data.byteLength,
    url: asset.url,
  };
});

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function inferAssetType(mimeType: string): "image" | "file" {
  return mimeType.startsWith("image/") ? "image" : "file";
}
