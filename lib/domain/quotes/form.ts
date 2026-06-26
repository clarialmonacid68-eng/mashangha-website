import type { SupabaseClient } from "@supabase/supabase-js";

import { createQuote } from "@/lib/domain/quotes/service";

/**
 * Raw string fields a page extracts from the quote form. Keeping this a plain
 * object keeps `lib/domain` free of Next.js `FormData`.
 */
export type QuoteFormFields = {
  amountYuan?: string | null;
  deliveryDays?: string | null;
  proposal?: string | null;
  validDays?: string | null;
};

/**
 * Owns quote-submission conversions previously inlined in the page: yuan→cents
 * for the amount, and validity days → an absolute `expiresAt` (at least 1 day).
 * Validation lives in `createQuote` (Zod) and still throws so the page can
 * surface the specific message.
 */
export async function createQuoteFromForm(
  supabase: SupabaseClient,
  demandId: string,
  fields: QuoteFormFields,
) {
  const amountYuan = Number(fields.amountYuan ?? 0);
  const deliveryDays = Number(fields.deliveryDays ?? 0);
  const validDays = Number(fields.validDays ?? 0);
  const expiresAt = new Date(
    Date.now() + Math.max(1, validDays) * 24 * 60 * 60 * 1000,
  ).toISOString();

  return createQuote(supabase, demandId, {
    amountCents: Math.round(amountYuan * 100),
    deliveryDays,
    expiresAt,
    proposal: (fields.proposal ?? "").toString(),
  });
}
