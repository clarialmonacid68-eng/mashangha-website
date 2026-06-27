# Codex Result: Customer Demand Quotes Read Queries

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Context

Codex continued the workspace read-query extraction while Claude was unavailable.

Previous completed round:

- `54cbe9b feat(domain): extract customer demands query`
- `docs/agent-handoffs/2026-06-27-codex-customer-demands-queries-result.md`

## Scope Completed

Handled `app/(workspace)/workspace/customer/demands/[id]/quotes/page.tsx`.

The page had:

- one demand context read (`demands`)
- one quote list read (`quotes`)
- one server action that already calls `selectQuoteForOrder`

This round extracted only the read queries:

- `getCustomerDemandQuoteContext` in `lib/domain/demands/service.ts`
- `listQuotesForCustomerDemand` in `lib/domain/quotes/service.ts`

The `selectQuote` server action remains a thin adapter around `selectQuoteForOrder` and was not otherwise changed.

## Equivalence Check

`getCustomerDemandQuoteContext` preserves the original demand query:

- table: `demands`
- columns: `id, title, status`
- filter: `id = demandId`
- uses `.single()`
- uses caller's RLS-scoped Supabase client
- throws backend errors upward

`listQuotesForCustomerDemand` preserves the original quote query:

- table: `quotes`
- columns: `id, amount_cents, delivery_days, proposal, status, developer_id`
- filter: `demand_id = demandId`
- order: `amount_cents` ascending
- uses caller's RLS-scoped Supabase client
- returns `[]` when no rows are visible
- throws backend errors upward

The page still:

- redirects unauthenticated users to `/login`
- redirects missing/invisible demand to `/workspace/settings`
- renders the same selected/error messages
- shows the select button only when demand is `published` and quote is `active`
- keeps JSX and styles unchanged

## Tests Added

Updated `tests/unit/demands/service.test.ts`:

- covers `getCustomerDemandQuoteContext` table/select/filter/`single`

Added `tests/unit/quotes/service.test.ts`:

- covers `listQuotesForCustomerDemand` table/select/filter/order
- covers empty rows returning `[]`
- covers backend error propagation

## Validation

Commands run:

- `pnpm test tests/unit/demands/service.test.ts tests/unit/quotes/service.test.ts`
  - result: 2 files passed, 5 tests passed
- `pnpm typecheck`
  - result: passed
- `pnpm lint; pnpm typecheck; pnpm test`
  - result: lint passed, typecheck passed, 21 test files passed, 8 skipped, 79 tests passed, 33 skipped
- `pnpm build`
  - result: passed, 42 static pages generated

No schema, RLS, RPC, or migration files changed. Supabase type generation was not needed for this round.

## Files Included For Commit

- `app/(workspace)/workspace/customer/demands/[id]/quotes/page.tsx`
- `lib/domain/demands/service.ts`
- `lib/domain/quotes/service.ts`
- `tests/unit/demands/service.test.ts`
- `tests/unit/quotes/service.test.ts`
- `docs/agent-handoffs/2026-06-27-codex-customer-demand-quotes-queries-result.md`

## Next Recommended Task

Continue workspace read-query extraction one module at a time.

Suggested next candidate:

- `workspace/developer/quotes`

Why:

- it is the developer-side companion to the customer quote list just completed
- it should be a contained quote list/read surface
- it keeps the quote workflow cleanup coherent before moving to disputes

