const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const allowedContentTypes = new Set([
  "application/json",
  "application/pdf",
  "application/zip",
  "image/gif",
  "image/jpeg",
  "image/png",
  "text/markdown",
  "text/plain",
]);

export type OrderFileInput = {
  contentType?: string | null;
  fileName: string;
  orderId: string;
  sizeBytes: number;
};

export function maxOrderFileSizeBytes() {
  const configured = Number(process.env.ORDER_FILE_MAX_BYTES);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_FILE_SIZE_BYTES;
}

export function sanitizeFileName(fileName: string) {
  const normalized = fileName.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  const safe = normalized.replace(/[^a-zA-Z0-9._-]/g, "-");

  if (!safe || safe === "." || safe === "..") {
    throw new Error("文件名不合法");
  }

  return safe;
}

export function assertOrderFileAllowed(input: OrderFileInput) {
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 0) {
    throw new Error("文件大小不合法");
  }

  if (input.sizeBytes > maxOrderFileSizeBytes()) {
    throw new Error("文件超过大小限制");
  }

  if (input.contentType && !allowedContentTypes.has(input.contentType)) {
    throw new Error("暂不支持该文件类型");
  }
}

export function createOrderStoragePath(input: OrderFileInput) {
  assertOrderFileAllowed(input);
  return `orders/${input.orderId}/${crypto.randomUUID()}-${sanitizeFileName(
    input.fileName,
  )}`;
}
