# Codex Result: Workspace Dispute Detail Read Queries

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Context

Codex continued the workspace read-query extraction while Claude was unavailable.

Previous completed round:

- `1daf3a9 feat(domain): extract developer quotes query`
- `docs/agent-handoffs/2026-06-27-codex-developer-quotes-queries-result.md`

## Scope Completed

Handled `app/(workspace)/workspace/disputes/[id]/page.tsx`.

The page had two render-time read queries and no server action/write path:

- dispute detail
- dispute evidence list

Both reads were moved into:

- `lib/domain/disputes/service.ts`
- `getWorkspaceDisputeDetail(supabase, disputeId)`
- `listWorkspaceDisputeEvidence(supabase, disputeId)`

Existing dispute resolution/write services were not changed.

## Equivalence Check

`getWorkspaceDisputeDetail` preserves the original dispute query:

- table: `disputes`
- columns: `id, order_id, opened_by, reason, requested_resolution, status, resolution_notes, created_at`
- filter: `id = disputeId`
- uses `.single()`
- uses caller's RLS-scoped Supabase client
- throws backend errors upward

`listWorkspaceDisputeEvidence` preserves the original evidence query:

- table: `dispute_evidence`
- columns: `id, storage_path, description, submitted_by, created_at`
- filter: `dispute_id = disputeId`
- order: `created_at` ascending
- uses caller's RLS-scoped Supabase client
- returns `[]` when no rows are visible
- throws backend errors upward

The page still:

- redirects unauthenticated users to `/login`
- redirects missing/invisible disputes to `/workspace/settings`
- renders the same dispute fields and evidence list
- keeps JSX and styles unchanged

## Tests Added

Added `tests/unit/disputes/service.test.ts` covering:

- dispute detail table/select/filter/`single`
- evidence table/select/filter/order
- empty evidence rows returning `[]`
- backend error propagation for both services

Existing dispute decision router tests remain unchanged.

## Validation

Commands run:

- `pnpm test tests/unit/disputes/service.test.ts tests/unit/disputes/decision-router.test.ts`
  - result: 2 files passed, 6 tests passed
- `pnpm typecheck`
  - result: passed
- `pnpm lint; pnpm typecheck; pnpm test`
  - result: lint passed, typecheck passed, 22 test files passed, 8 skipped, 85 tests passed, 33 skipped
- `pnpm build`
  - result: passed, 42 static pages generated

No schema, RLS, RPC, or migration files changed. Supabase type generation was not needed for this round.

## Files Included For Commit

- `app/(workspace)/workspace/disputes/[id]/page.tsx`
- `lib/domain/disputes/service.ts`
- `tests/unit/disputes/service.test.ts`
- `docs/agent-handoffs/2026-06-27-codex-dispute-detail-queries-result.md`

## Next Recommended Task

The main workspace read-query cleanup is now mostly complete. Remaining candidates:

- public `developers` list/detail pages
- public demand/product list/detail review
- `workspace/developer/profile` if it still has inline read queries

Suggested next candidate:

- `workspace/developer/profile`

Why:

- it is still an authenticated workspace page
- it may mix developer profile reads and update/application flows
- it should be inspected before moving to public marketing pages

