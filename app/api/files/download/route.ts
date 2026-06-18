import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/auth/server";
import { createOrderFileDownloadUrl } from "@/lib/domain/orders/service";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId") ?? "";
  const storagePath = searchParams.get("path") ?? "";

  if (!orderId || !storagePath) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  const supabase = await createClient();
  const service = createServiceClient();

  try {
    const { signedUrl } = await createOrderFileDownloadUrl(supabase, service, {
      orderId,
      storagePath,
    });
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    logError("api.files.download", error, { orderId });
    const message = error instanceof Error ? error.message : "生成下载链接失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
