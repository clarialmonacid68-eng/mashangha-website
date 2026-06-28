import { NextResponse } from "next/server";

import { createClient } from "@/lib/auth/server";
import { acceptOrderDelivery } from "@/lib/domain/orders/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const order = await acceptOrderDelivery(supabase, id);
    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "验收失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
