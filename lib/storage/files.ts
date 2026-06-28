export function buildUserStoragePath({
  fileName,
  kind,
  userId,
}: {
  fileName: string;
  kind: string;
  userId: string;
}) {
  const safeName = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${kind}/${userId}/${crypto.randomUUID()}-${safeName || "file"}`;
}
