# Codex Result: Public Developers Read Queries

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Context

Codex continued the read-query extraction after completing the authenticated workspace pages.

Previous completed round:

- `5752a8c feat(domain): extract developer profile query`
- `docs/agent-handoffs/2026-06-27-codex-developer-profile-query-result.md`

## Scope Completed

Handled public developer discovery pages:

- `app/(marketing)/developers/page.tsx`
- `app/(marketing)/developers/[id]/page.tsx`

Both pages had inline `developer_profiles` queries. They were moved into:

- `lib/domain/developers/service.ts`
- `listPublicDevelopers(supabase)`
- `getPublicDeveloperDetail(supabase, userId)`

## Equivalence Check

`listPublicDevelopers` preserves the original list query:

- table: `developer_profiles`
- columns: `user_id, headline, bio, skills`
- filter: `review_status = approved`
- order: `reviewed_at` descending
- limit: `24`
- returns `[]` when no rows are visible
- throws backend errors upward

`getPublicDeveloperDetail` preserves the original detail query:

- table: `developer_profiles`
- columns: `headline, bio, skills, hourly_rate_cents`
- filters:
  - `user_id = id`
  - `review_status = approved`
- uses `.maybeSingle()`
- returns row or `null`
- throws backend errors upward

The pages still:

- render only approved developer profiles
- keep metadata/canonical behavior unchanged
- keep empty state and detail `notFound()` behavior unchanged
- keep JSX and styles unchanged

## Tests Updated

Updated `tests/unit/developers/service.test.ts`:

- covers `listPublicDevelopers` table/select/filter/order/limit
- covers `getPublicDeveloperDetail` table/select/filters/`maybeSingle`
- existing own-profile tests remain unchanged

## Validation

Commands run:

- `pnpm test tests/unit/developers/service.test.ts`
  - result: 1 file passed, 5 tests passed
- `pnpm typecheck`
  - result: passed
- `pnpm lint; pnpm typecheck; pnpm test`
  - result: lint passed, typecheck passed, 23 test files passed, 8 skipped, 90 tests passed, 33 skipped
- `pnpm build`
  - result: passed, 42 static pages generated

No schema, RLS, RPC, or migration files changed. Supabase type generation was not needed for this round.

## Files Included For Commit

- `app/(marketing)/developers/page.tsx`
- `app/(marketing)/developers/[id]/page.tsx`
- `lib/domain/developers/service.ts`
- `tests/unit/developers/service.test.ts`
- `docs/agent-handoffs/2026-06-27-codex-public-developers-queries-result.md`

## Next Recommended Task

Continue public-facing read-query extraction.

Suggested next candidate:

- public demands list/detail pages

Why:

- demand discovery is another major public surface
- `lib/domain/demands/service.ts` already owns published-demand visibility rules
- the pass should confirm pages are using those services consistently

