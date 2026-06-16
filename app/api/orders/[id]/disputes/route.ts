import { NextResponse } from "next/server";

import { createClient } from "@/lib/auth/server";
import { openOrderDispute } from "@/lib/domain/disputes/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const dispute = await openOrderDispute(supabase, id, await request.json());
    return NextResponse.json({ dispute });
  } catch (error) {
    const message = error instanceof Error ? error.message : "发起仲裁失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
