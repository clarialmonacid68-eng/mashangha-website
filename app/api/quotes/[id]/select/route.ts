import { NextResponse } from "next/server";

import { selectQuoteForOrder } from "@/lib/domain/quotes/service";
import { createClient } from "@/lib/auth/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const order = await selectQuoteForOrder(supabase, id);
    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "选择报价失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
