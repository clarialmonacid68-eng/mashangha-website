import { NextResponse } from "next/server";

import { submitDeveloperApplication } from "@/lib/domain/developers/service";
import { createClient } from "@/lib/auth/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    const profile = await submitDeveloperApplication(
      supabase,
      await request.json(),
    );

    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "提交开发者认证失败";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
