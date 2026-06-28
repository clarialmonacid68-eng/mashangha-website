# Demand Domain Boundary

## Summary

- **Feature:** Demand creation + published demand detail (page→domain boundary extraction)
- **Owner:** Claude
- **Status:** ready-for-integration
- **Related branch:** `claude/domain-page-boundary`
- **Related files:**
  - `lib/domain/demands/form.ts` (new)
  - `lib/domain/demands/service.ts` (added `getPublishedDemandDetail`)
  - `app/(workspace)/workspace/customer/demands/new/page.tsx` (now thin adapter)
  - `app/(marketing)/demands/[id]/page.tsx` (now calls domain service)
  - `app/api/demands/route.ts` (unchanged; already thin)
  - `lib/db/types.ts` (unchanged)
  - `supabase/migrations/**` (unchanged)

## Purpose

Move demand business logic out of page files into `lib/domain/demands/**` so pages
are thin adapters. Two flows:

1. Customer creates a demand from the publish form (parse → validate → create
   draft → submit for review).
2. Public marketing page reads a single demand, enforcing the published +
   not-suspended visibility rule in the domain layer.

No schema, RLS, or RPC changes. No UI/markup changes beyond server-action wiring
and one UI default (pre-selected project type).

## Roles and Permissions

| Role | Allowed Actions | Denied Actions |
|---|---|---|
| guest | Read published, non-suspended demand detail | Create demands (treated as `unauthenticated`) |
| customer | Create + submit own demand for review | — |
| developer | (same as any authed user; RLS governs ownership) | — |
| admin | n/a here (review handled elsewhere) | — |
| service role | n/a here | — |

Permission enforcement is unchanged and still lives in existing RLS + the
`createDemandDraft` service (which calls `auth.getUser()` and inserts with
`customer_id = auth.uid()`). This task only relocated parsing/validation/visibility.

## Data Model Changes

None. No migration, enum, table, RPC, trigger, or RLS change.

## Domain Service Signatures

```ts
// lib/domain/demands/form.ts
export type DemandFormFields = {
  attachmentName?: string | null;
  attachmentPath?: string | null;
  budgetMax?: string | null;        // yuan, as typed in the form
  budgetMin?: string | null;        // yuan
  cooperationMode?: string | null;
  description?: string | null;
  expectedDeliveryDays?: string | null;
  projectType?: string | null;
  title?: string | null;
};

export type CreateDemandFromFormResult =
  | { demandId: string; ok: true; status: "pending_review" }
  | { ok: false; reason: "unauthenticated" | "invalid" | "create_failed" };

export async function createAndSubmitDemandFromForm(
  supabase: SupabaseClient<Database>,
  fields: DemandFormFields,
): Promise<CreateDemandFromFormResult>;

// lib/domain/demands/service.ts
export async function getPublishedDemandDetail(
  supabase: SupabaseClient<Database>,
  demandId: string,
): Promise<{
  title: string;
  description: string;
  project_type: string;
  cooperation_mode: string;
  budget_min_cents: number;
  budget_max_cents: number;
  expected_delivery_days: number | null;
  published_at: string | null;
} | null>;
```

`createAndSubmitDemandFromForm` returns a typed result instead of throwing for
expected cases, so the page maps it to redirects without string matching.

## API Routes

| Method | Route | Auth | Domain Service | Notes |
|---|---|---|---|---|
| POST | `/api/demands` | authenticated (RLS) | `createDemandDraft` + `submitDemandForReview` | Unchanged. Already thin; accepts JSON payload. Not switched to the form helper because it consumes JSON, not form strings. |

The publish form uses a **server action** (`createDraftDemand`) on
`app/(workspace)/workspace/customer/demands/new/page.tsx`, not the JSON route.
The server action is now a thin adapter over `createAndSubmitDemandFromForm`.

### Server action behavior (publish form)

Input: `FormData` with fields `title, projectType, description, budgetMin,
budgetMax, expectedDeliveryDays, cooperationMode, attachmentName?,
attachmentPath?`.

Mapping of `CreateDemandFromFormResult` to redirects:

| Result | Redirect |
|---|---|
| `{ ok: true }` | `/workspace/customer/demands/new?submitted=1` |
| `{ ok: false, reason: "unauthenticated" }` | `/login` |
| `{ ok: false, reason: "invalid" }` | `/workspace/customer/demands/new?error=invalid` |
| `{ ok: false, reason: "create_failed" }` | `/workspace/customer/demands/new?error=create_failed` |

This preserves the previous page behavior exactly.

## State Transitions

```text
(none) -> draft -> pending_review
```

`createAndSubmitDemandFromForm` creates the demand as `draft` (via
`createDemandDraft`) then moves it to `pending_review` (via
`submitDemandForReview`). Admin publish/reject transitions are unchanged and
handled in the admin area, not here.

## Validation Rules

Owned by `lib/domain/demands/form.ts` (identical to the prior page logic):

- `title` trimmed length ≥ 4
- `description` trimmed length ≥ 20
- `budgetMin` / `budgetMax` parse to finite numbers → cents (`round(yuan * 100)`)
- `budgetMax >= budgetMin`
- `expectedDeliveryDays` is a positive integer
- `projectType` ∈ `demandProjectTypes`
- `cooperationMode` ∈ `cooperationModes`
- attachment included only when both `attachmentName` and `attachmentPath` are present

Note: positivity of budget cents is still enforced downstream by
`parseDemandInput` (Zod) inside `createDemandDraft`; a non-positive budget that
passes the coarse checks surfaces as `reason: "create_failed"` (unchanged
behavior).

Published demand visibility rule (owned by `getPublishedDemandDetail`):
`status = 'published' AND is_suspended = false`, else returns `null`.

## Side Effects

- Notifications: none added here.
- Audit events: none added here.
- File storage: attachment metadata only (path/name), unchanged.
- Payment/refund/settlement: none.
- Email/SMS: none.

## Codex Integration Checklist

- [ ] `pnpm exec supabase gen types typescript --local > lib/db/types.ts` (no schema change expected; confirm no drift).
- [ ] `pnpm lint` / `pnpm typecheck` pass.
- [ ] Publish form still creates + submits a demand and shows `submitted=1`.
- [ ] Invalid form input shows `error=invalid`; backend failure shows `error=create_failed`.
- [ ] Unauthenticated submit redirects to `/login`.
- [ ] Public demand detail renders for published demands and `notFound()` for unpublished/suspended/missing ids.
- [ ] Digital-employee entry still pre-selects the `digital_employee` project type.

## Open Questions

- Question: Should `/api/demands` (JSON route) also adopt `createAndSubmitDemandFromForm`, or stay JSON-shaped for programmatic callers?
- Decision owner: Codex (frontend/API integration)
- Deadline: before any new client starts posting to `/api/demands`
