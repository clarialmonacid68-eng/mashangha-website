import { NextResponse } from "next/server";

import { createClient } from "@/lib/auth/server";
import { submitOrderDelivery } from "@/lib/domain/orders/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const delivery = await submitOrderDelivery(supabase, id, await request.json());
    return NextResponse.json({ delivery });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交交付失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
