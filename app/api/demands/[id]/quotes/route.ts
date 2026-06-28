import { NextResponse } from "next/server";

import { createQuote } from "@/lib/domain/quotes/service";
import { createClient } from "@/lib/auth/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const quote = await createQuote(supabase, id, await request.json());
    return NextResponse.json({ quote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交报价失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
