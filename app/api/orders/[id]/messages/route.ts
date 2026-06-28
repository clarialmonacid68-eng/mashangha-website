import { NextResponse } from "next/server";

import { createClient } from "@/lib/auth/server";
import { createOrderMessage } from "@/lib/domain/orders/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const message = await createOrderMessage(supabase, id, await request.json());
    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "发送留言失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
