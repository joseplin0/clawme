import { createError, getRouterParam, setHeader } from "h3";

type UploadMetadata = {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

const STORAGE_NAMESPACE = "assets:uploads";

export default defineEventHandler(async (event) => {
  const encodedFilename = getRouterParam(event, "filename");

  if (!encodedFilename) {
    throw createError({
      statusCode: 400,
      statusMessage: "缺少文件名",
    });
  }

  const filename = decodeURIComponent(encodedFilename);
  const storage = useStorage(STORAGE_NAMESPACE);
  const [file, metadata] = await Promise.all([
    storage.getItemRaw(filename),
    storage.getItem<UploadMetadata>(`${filename}:meta`),
  ]);

  if (!file || !metadata) {
    throw createError({
      statusCode: 404,
      statusMessage: "文件不存在",
    });
  }

  setHeader(event, "Content-Type", metadata.mimeType || "application/octet-stream");
  setHeader(event, "Content-Length", String(metadata.size));
  setHeader(
    event,
    "Content-Disposition",
    buildDisposition(metadata.originalName, metadata.mimeType),
  );
  setHeader(event, "Cache-Control", "public, max-age=31536000, immutable");

  return file;
});

function buildDisposition(filename: string, mimeType: string) {
  const encodedName = encodeURIComponent(filename);
  const kind = mimeType.startsWith("image/") ? "inline" : "attachment";
  return `${kind}; filename*=UTF-8''${encodedName}`;
}
