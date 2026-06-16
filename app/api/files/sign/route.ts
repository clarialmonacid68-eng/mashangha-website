import { NextResponse } from "next/server";

import { createClient } from "@/lib/auth/server";
import { createOrderFileUploadRequest } from "@/lib/domain/orders/service";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const upload = await createOrderFileUploadRequest(
      supabase,
      await request.json(),
    );
    return NextResponse.json({ upload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成文件签名失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
