# Codex Result: Workspace Settings Read Queries

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Context

Claude remains unavailable, so Codex continued the planned workspace read-query extraction.

Previous completed round:

- `4c7712d feat(domain): extract workspace notifications query`
- `docs/agent-handoffs/2026-06-27-codex-notifications-queries-result.md`

## Scope Completed

Handled `app/(workspace)/workspace/settings/page.tsx`.

The settings page had:

- a `switchRole` server action that reads `user_roles`, validates access, then sets a cookie
- an `applyForDeveloper` server action that calls `apply_for_developer`
- render-time reads for `user_roles` and `developer_profiles.review_status`

This round extracted the read queries into:

- new `lib/domain/settings/queries.ts`
- `listCurrentUserRoles(service, userId)`
- `getDeveloperReviewStatus(service, userId)`

The server actions were intentionally kept otherwise unchanged. `applyForDeveloper` is already a small RPC adapter; changing it would be a separate write-path task.

## Equivalence Check

`listCurrentUserRoles` preserves the original role query:

- table: `user_roles`
- columns: `role`
- filter: `user_id = user.id`
- uses caller's RLS-scoped Supabase client
- returns `[]` when no rows are visible
- throws backend errors upward

`getDeveloperReviewStatus` preserves the original developer profile query:

- table: `developer_profiles`
- columns: `review_status`
- filter: `user_id = user.id`
- uses `maybeSingle()`
- uses caller's RLS-scoped Supabase client
- returns row or `null`
- throws backend errors upward

The page still:

- redirects unauthenticated users to `/login`
- resolves current workspace role from roles and cookie
- renders the existing developer application/status UI
- sets the `workspace-role` cookie in `switchRole`
- calls `apply_for_developer` in `applyForDeveloper`
- keeps JSX and styles unchanged

## Tests Added

Added `tests/unit/settings/queries.test.ts` covering:

- `listCurrentUserRoles` table/select/filter and role mapping
- empty role rows returning `[]`
- `getDeveloperReviewStatus` table/select/filter/`maybeSingle`
- backend error propagation for both services

## Validation

Commands run:

- `pnpm test tests/unit/settings/queries.test.ts`
  - result: 1 file passed, 5 tests passed
- `pnpm typecheck`
  - result: passed
- `pnpm lint; pnpm typecheck; pnpm test`
  - result: lint passed, typecheck passed, 19 test files passed, 8 skipped, 74 tests passed, 33 skipped
- `pnpm build`
  - result: passed, 42 static pages generated

No schema, RLS, RPC, or migration files changed. Supabase type generation was not needed for this round.

## Files Included For Commit

- `app/(workspace)/workspace/settings/page.tsx`
- `lib/domain/settings/queries.ts`
- `tests/unit/settings/queries.test.ts`
- `docs/agent-handoffs/2026-06-27-codex-settings-queries-result.md`

## Next Recommended Task

Continue workspace read-query extraction one module at a time.

Suggested next candidate:

- `workspace/customer/demands`

Why:

- it is an authenticated workspace list page
- it is adjacent to the demand/order flow already being cleaned up
- it should be kept separate from quote-detail pages to avoid a broad diff

