import { NextResponse } from "next/server";

import { MockPaymentProvider } from "@/lib/payments/mock-provider";
import { createOrderPayment } from "@/lib/payments/service";
import { createClient } from "@/lib/auth/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      idempotencyKey?: string;
    };
    const result = await createOrderPayment(
      supabase,
      new MockPaymentProvider(),
      {
        idempotencyKey: body.idempotencyKey ?? `pay-${id}`,
        orderId: id,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建支付失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
