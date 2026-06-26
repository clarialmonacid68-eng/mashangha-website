/**
 * Raw attachment string fields a page extracts from an order message / delivery
 * form. Keeping this a plain object keeps `lib/domain` free of `FormData`.
 */
export type OrderAttachmentFields = {
  attachmentName?: string | null;
  attachmentPath?: string | null;
  attachmentType?: string | null;
  attachmentSize?: string | null;
};

type OrderAttachmentInput = {
  contentType?: string | null;
  fileName: string;
  sizeBytes: number;
  storagePath: string;
};

/**
 * Build the optional attachment list from raw form fields. Owns the trimming,
 * empty-check and size/content-type coercion previously inlined in the page.
 * Returns an empty array when no attachment was provided.
 */
export function parseOptionalOrderAttachment(
  fields: OrderAttachmentFields,
): OrderAttachmentInput[] {
  const storagePath = (fields.attachmentPath ?? "").trim();
  const fileName = (fields.attachmentName ?? "").trim();

  if (!storagePath || !fileName) {
    return [];
  }

  return [
    {
      contentType: (fields.attachmentType ?? "").trim() || null,
      fileName,
      sizeBytes: Number(fields.attachmentSize ?? 0),
      storagePath,
    },
  ];
}
