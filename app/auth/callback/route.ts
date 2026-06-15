import { NextResponse } from "next/server";

import { createClient } from "@/lib/auth/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const destination =
    next?.startsWith("/") && !next.startsWith("//")
      ? next
      : "/workspace/settings";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(destination, appUrl));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=callback_failed", appUrl),
  );
}
