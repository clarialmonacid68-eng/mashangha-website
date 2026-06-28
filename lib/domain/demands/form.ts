import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import {
  cooperationModes,
  demandProjectTypes,
  type DemandInput,
} from "@/lib/domain/demands/schema";
import {
  createDemandDraft,
  submitDemandForReview,
} from "@/lib/domain/demands/service";

type Service = SupabaseClient<Database>;

/**
 * Raw string fields a page may extract from a `FormData` and hand to the domain
 * layer. Keeping this a plain object avoids coupling `lib/domain` to Next.js.
 */
export type DemandFormFields = {
  attachmentName?: string | null;
  attachmentPath?: string | null;
  budgetMax?: string | null;
  budgetMin?: string | null;
  cooperationMode?: string | null;
  description?: string | null;
  expectedDeliveryDays?: string | null;
  projectType?: string | null;
  title?: string | null;
};

export type CreateDemandFromFormResult =
  | { demandId: string; ok: true; status: "pending_review" }
  | { ok: false; reason: "unauthenticated" | "invalid" | "create_failed" };

function parseBudgetCents(value?: string | null) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function parsePositiveInteger(value?: string | null) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}

function parseProjectType(
  value?: string | null,
): DemandInput["projectType"] | null {
  return demandProjectTypes.includes(
    value as (typeof demandProjectTypes)[number],
  )
    ? (value as DemandInput["projectType"])
    : null;
}

function parseCooperationMode(
  value?: string | null,
): DemandInput["cooperationMode"] | null {
  return cooperationModes.includes(value as (typeof cooperationModes)[number])
    ? (value as DemandInput["cooperationMode"])
    : null;
}

function parseAttachment(fields: DemandFormFields) {
  const storagePath = (fields.attachmentPath ?? "").trim();
  const fileName = (fields.attachmentName ?? "").trim();

  if (!storagePath || !fileName) {
    return [];
  }

  return [
    {
      contentType: null,
      fileName,
      sizeBytes: 0,
      storagePath,
    },
  ];
}

/**
 * Owns demand-creation business rules: parse and validate form fields, create a
 * draft, and submit it for review. Pages stay thin by extracting raw strings
 * from `FormData` and mapping the typed result to redirects.
 */
export async function createAndSubmitDemandFromForm(
  supabase: Service,
  fields: DemandFormFields,
): Promise<CreateDemandFromFormResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const title = (fields.title ?? "").trim();
  const description = (fields.description ?? "").trim();
  const projectType = parseProjectType(fields.projectType);
  const cooperationMode = parseCooperationMode(fields.cooperationMode);
  const budgetMinCents = parseBudgetCents(fields.budgetMin);
  const budgetMaxCents = parseBudgetCents(fields.budgetMax);
  const expectedDeliveryDays = parsePositiveInteger(fields.expectedDeliveryDays);

  if (
    title.length < 4 ||
    description.length < 20 ||
    budgetMinCents === null ||
    budgetMaxCents === null ||
    budgetMaxCents < budgetMinCents ||
    expectedDeliveryDays === null ||
    projectType === null ||
    cooperationMode === null
  ) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const demand = await createDemandDraft(supabase, {
      attachments: parseAttachment(fields),
      budgetMaxCents,
      budgetMinCents,
      cooperationMode,
      description,
      expectedDeliveryDays,
      projectType,
      title,
    });
    await submitDemandForReview(supabase, demand.id);

    return { demandId: demand.id, ok: true, status: "pending_review" };
  } catch {
    return { ok: false, reason: "create_failed" };
  }
}
