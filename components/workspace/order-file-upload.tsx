"use client";

import { useState } from "react";

import { createClient } from "@/lib/auth/client";

type UploadResponse = {
  upload?: { bucket: string; storagePath: string; token: string };
  error?: string;
};

/**
 * Real file upload to the private `order-files` bucket using a short-lived
 * signed upload URL. After a successful upload the hidden inputs are populated
 * so the surrounding server-action form persists the attachment metadata.
 */
export function OrderFileUpload({ orderId }: { orderId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [type, setType] = useState("");
  const [size, setSize] = useState(0);

  async function handleChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBusy(true);
    setMessage("正在上传…");

    try {
      const signResponse = await fetch("/api/files/sign", {
        body: JSON.stringify({
          contentType: file.type || null,
          fileName: file.name,
          orderId,
          sizeBytes: file.size,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const signJson = (await signResponse.json()) as UploadResponse;

      if (!signResponse.ok || !signJson.upload) {
        throw new Error(signJson.error ?? "生成上传签名失败");
      }

      const { bucket, storagePath, token } = signJson.upload;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(storagePath, token, file);

      if (error) {
        throw new Error(error.message);
      }

      setName(file.name);
      setPath(storagePath);
      setType(file.type || "");
      setSize(file.size);
      setMessage(`已上传：${file.name}`);
    } catch (uploadError) {
      setName("");
      setPath("");
      setType("");
      setSize(0);
      setMessage(
        uploadError instanceof Error ? uploadError.message : "上传失败",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="file-upload-field">
      <input disabled={busy} onChange={handleChange} type="file" />
      {message ? <p className="auth-message">{message}</p> : null}
      <input name="attachmentName" type="hidden" value={name} readOnly />
      <input name="attachmentPath" type="hidden" value={path} readOnly />
      <input name="attachmentType" type="hidden" value={type} readOnly />
      <input
        name="attachmentSize"
        type="hidden"
        value={String(size)}
        readOnly
      />
    </div>
  );
}
