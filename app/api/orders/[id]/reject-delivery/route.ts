import { NextResponse } from "next/server";

import { createClient } from "@/lib/auth/server";
import { rejectOrderDelivery } from "@/lib/domain/orders/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
  };

  try {
    const order = await rejectOrderDelivery(supabase, id, body.reason ?? "");
    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "拒绝验收失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
