import { NextResponse } from "next/server";

import { confirmMockPaymentForCurrentUser } from "@/lib/payments/service";
import { createClient, createServiceClient } from "@/lib/auth/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    providerPaymentId?: string;
  };

  if (!body.providerPaymentId) {
    return NextResponse.json({ error: "缺少支付单号" }, { status: 400 });
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const result = await confirmMockPaymentForCurrentUser(
    userClient,
    createServiceClient(),
    { providerPaymentId: body.providerPaymentId },
  );

  if (!result.ok) {
    if (result.reason === "missing_payment") {
      return NextResponse.json({ error: "支付单不存在" }, { status: 404 });
    }
    if (result.reason === "forbidden") {
      return NextResponse.json({ error: "无权确认该支付单" }, { status: 403 });
    }
    return NextResponse.json({ error: "确认支付失败" }, { status: 400 });
  }

  return NextResponse.json(result);
}
