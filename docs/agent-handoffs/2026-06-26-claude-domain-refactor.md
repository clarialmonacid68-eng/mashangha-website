# Claude Handoff: Extract Domain Logic From Page Files

## Objective

Prepare the monorepo for clean Claude/Codex collaboration by moving business logic out of `app/**` pages and route handlers into stable `lib/domain/**` services, then documenting the service contracts for Codex integration.

This is the first backend-owned task after defining the collaboration rules.

## Branch

Create a small branch from the current shared baseline:

```bash
git status --short --branch
git switch -c claude/domain-page-boundary
```

If the branch already exists locally, rebase it on the latest shared baseline before continuing.

## Ownership Boundaries

Claude may modify:

- `lib/domain/**`
- `lib/db/types.ts`
- `supabase/migrations/**`
- `docs/api/**`
- focused tests for domain services if available

Claude should avoid modifying:

- `app/**` UI markup except for the minimum needed to call extracted services
- `components/**`
- deployment files
- unrelated styling

If a page must change to complete the extraction, keep the edit tiny and note it in the contract.

## Current Pain Points To Address

### 1. Demand Creation Page Contains Parsing and Submission Logic

File:

```text
app/(workspace)/workspace/customer/demands/new/page.tsx
```

Observed inline responsibilities:

- parsing budget fields,
- parsing positive integer fields,
- validating project type,
- validating cooperation mode,
- parsing attachment form fields,
- authenticating the current user,
- creating a demand draft,
- submitting it for review,
- deciding failure redirect reasons.

Target:

- Move form parsing and domain validation into `lib/domain/demands/service.ts` or a focused helper under `lib/domain/demands/`.
- Keep the page server action as a thin adapter:
  - create Supabase client,
  - pass `FormData` or normalized input to the domain service,
  - redirect based on typed domain result/error.

Suggested service shape:

```ts
export type CreateDemandFromFormResult = {
  demandId: string;
  status: "pending_review";
};

export async function createAndSubmitDemandFromForm(
  supabase: SupabaseClient<Database>,
  formData: FormData,
): Promise<CreateDemandFromFormResult> {
  // Parse, validate, create draft, submit for review.
}
```

If using `FormData` inside `lib/domain` feels too coupled to Next.js, create an adapter type:

```ts
export type DemandFormFields = {
  attachmentName?: string;
  attachmentPath?: string;
  budgetMax?: string;
  budgetMin?: string;
  cooperationMode?: string;
  description?: string;
  expectedDeliveryDays?: string;
  projectType?: string;
  title?: string;
};
```

Then Codex can keep FormData extraction in the page and all business validation in the domain layer.

### 2. Marketing Demand Detail Page Queries Supabase Directly

File:

```text
app/(marketing)/demands/[id]/page.tsx
```

Observed inline responsibilities:

- direct Supabase query,
- published/suspended visibility rule,
- row-to-view formatting assumptions.

Target:

- Add a domain read service, for example:

```ts
export async function getPublishedDemandDetail(
  supabase: SupabaseClient<Database>,
  demandId: string,
): Promise<PublishedDemandDetail | null> {
  // Enforce published and not suspended.
}
```

- Page should call the service and render `notFound()` when it returns `null`.

### 3. API Routes Should Remain Thin

Existing example:

```text
app/api/demands/route.ts
```

This is already close to the desired shape because it calls `createDemandDraft` and `submitDemandForReview`. Keep that pattern. If new behavior is needed, place it in `lib/domain/demands/service.ts` first and keep the route as an adapter.

## Required Contract Docs

Create at least one contract document:

```text
docs/api/2026-06-26-demand-domain-boundary.md
```

Use:

```text
docs/api/contract-template.md
```

The contract must document:

- demand creation from form,
- published demand detail read,
- caller roles,
- validation rules,
- possible domain errors,
- expected page/API behavior for each error,
- changed service signatures.

## Acceptance Criteria

- [ ] Demand creation business validation is owned by `lib/domain/demands/**`.
- [ ] Published demand visibility rule is owned by `lib/domain/demands/**`.
- [ ] `app/(workspace)/workspace/customer/demands/new/page.tsx` is a thin server-action adapter.
- [ ] `app/(marketing)/demands/[id]/page.tsx` no longer queries Supabase directly.
- [ ] `app/api/demands/route.ts` remains thin and still composes domain services.
- [ ] `docs/api/2026-06-26-demand-domain-boundary.md` exists.
- [ ] `lib/db/types.ts` changes are noted, if any.
- [ ] No unrelated UI, style, deployment, or product-page files are changed.

## Suggested Verification

Claude should run whatever is available in the sandbox:

```bash
pnpm typecheck
pnpm lint
```

If a command cannot run, record the exact reason in the handoff.

Codex will later run:

```bash
pnpm exec supabase gen types typescript --local > lib/db/types.ts
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Codex will also manually verify:

- customer demand creation page,
- published demand detail page,
- unauthenticated redirects,
- production domain behavior before deployment.

## Handoff Back To Codex

When finished, provide:

- branch name,
- commit list,
- changed files,
- contract doc path,
- commands run and results,
- commands skipped and why,
- known risks or assumptions.
