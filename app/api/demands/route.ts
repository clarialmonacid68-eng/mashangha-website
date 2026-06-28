import { NextResponse } from "next/server";

import {
  createDemandDraft,
  submitDemandForReview,
} from "@/lib/domain/demands/service";
import { createClient } from "@/lib/auth/server";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const payload = await request.json();
    const demand = await createDemandDraft(supabase, payload);

    if (payload.submitForReview) {
      return NextResponse.json({
        demand: await submitDemandForReview(supabase, demand.id),
      });
    }

    return NextResponse.json({ demand });
  } catch (error) {
    logError("api.demands.create", error);
    const message = error instanceof Error ? error.message : "保存需求失败";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
