import { describe, expect, it } from "vitest";

import { parseOptionalOrderAttachment } from "@/lib/domain/orders/form";

describe("parseOptionalOrderAttachment", () => {
  it("returns no attachments when name or storage path is missing", () => {
    expect(
      parseOptionalOrderAttachment({
        attachmentName: "design.pdf",
        attachmentPath: "",
        attachmentSize: "1024",
        attachmentType: "application/pdf",
      }),
    ).toEqual([]);

    expect(
      parseOptionalOrderAttachment({
        attachmentName: "",
        attachmentPath: "orders/design.pdf",
        attachmentSize: "1024",
        attachmentType: "application/pdf",
      }),
    ).toEqual([]);
  });

  it("trims fields and coerces optional attachment metadata", () => {
    expect(
      parseOptionalOrderAttachment({
        attachmentName: " design.pdf ",
        attachmentPath: " orders/design.pdf ",
        attachmentSize: "1024",
        attachmentType: " application/pdf ",
      }),
    ).toEqual([
      {
        contentType: "application/pdf",
        fileName: "design.pdf",
        sizeBytes: 1024,
        storagePath: "orders/design.pdf",
      },
    ]);
  });
});
