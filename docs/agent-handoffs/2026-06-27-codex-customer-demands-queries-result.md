# Codex Result: Workspace Customer Demands Read Query

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Context

Codex continued the workspace read-query extraction while Claude was unavailable.

Previous completed round:

- `a1b6c22 feat(domain): extract workspace settings queries`
- `docs/agent-handoffs/2026-06-27-codex-settings-queries-result.md`

## Scope Completed

Handled `app/(workspace)/workspace/customer/demands/page.tsx`.

The page had one render-time read query for the current customer's demand list and no write action. The query was moved into the existing demands domain service:

- `lib/domain/demands/service.ts`
- new `listCustomerDemands(supabase, customerId)`

## Equivalence Check

`listCustomerDemands` preserves the original page query:

- table: `demands`
- columns: `id, title, description, status, created_at`
- filter: `customer_id = user.id`
- order: `created_at` descending
- uses caller's RLS-scoped Supabase client
- returns `[]` when no rows are visible
- throws backend errors upward

The page still:

- redirects unauthenticated users to `/login`
- renders the same status labels
- links to `/workspace/customer/demands/new`
- links each demand to `/workspace/customer/demands/[id]/quotes`
- keeps JSX and styles unchanged

## Tests Added

Added `tests/unit/demands/service.test.ts` covering:

- `listCustomerDemands` table/select/filter/order
- empty rows returning `[]`
- backend error propagation

## Validation

Commands run:

- `pnpm test tests/unit/demands/service.test.ts`
  - result: 1 file passed, 2 tests passed
- `pnpm typecheck`
  - result: passed
- `pnpm lint; pnpm typecheck; pnpm test`
  - result: lint passed, typecheck passed, 20 test files passed, 8 skipped, 76 tests passed, 33 skipped
- `pnpm build`
  - result: passed, 42 static pages generated

No schema, RLS, RPC, or migration files changed. Supabase type generation was not needed for this round.

## Files Included For Commit

- `app/(workspace)/workspace/customer/demands/page.tsx`
- `lib/domain/demands/service.ts`
- `tests/unit/demands/service.test.ts`
- `docs/agent-handoffs/2026-06-27-codex-customer-demands-queries-result.md`

## Next Recommended Task

Continue workspace read-query extraction one module at a time.

Suggested next candidate:

- `workspace/customer/demands/[id]/quotes`

Why:

- it is adjacent to the customer demands list just completed
- it likely contains demand detail plus quote list reads
- it should be handled separately from developer quote pages to keep the diff small

