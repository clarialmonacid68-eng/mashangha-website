import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/auth/server";
import { createOrderFileUploadRequest } from "@/lib/domain/orders/service";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const supabase = await createClient();
  const service = createServiceClient();

  try {
    const upload = await createOrderFileUploadRequest(
      supabase,
      service,
      await request.json(),
    );
    return NextResponse.json({ upload });
  } catch (error) {
    logError("api.files.sign", error);
    const message = error instanceof Error ? error.message : "生成文件签名失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
