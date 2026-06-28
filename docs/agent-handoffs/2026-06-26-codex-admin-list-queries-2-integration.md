# Codex Integration: Admin Audit + Risk List Queries

Date: 2026-06-26
Branch: `claude/domain-page-boundary`

## Scope Reviewed

Claude moved the remaining simple admin read-only queries for:

- `app/admin/audit/page.tsx`
- `app/admin/risk/page.tsx`

into `lib/domain/admin/queries.ts`.

This round intentionally leaves `admin/developers` for a separate pass because it has a more complex list/detail/audit shape.

## Equivalence Check

Verified the moved queries keep the original behavior:

- `listAdminAuditLogs`
  - table: `audit_logs`
  - columns: `id, actor_id, action, entity_type, entity_id, metadata, created_at`
  - order: `created_at` descending
  - limit: `100`
- `listSuspendedProfiles`
  - table: `profiles`
  - columns: `id, display_name, is_suspended, updated_at`
  - filter: `is_suspended = true`
  - limit: `20`
- `listAbnormalPayments`
  - table: `payments`
  - columns: `id, order_id, status, amount_cents, provider, updated_at`
  - filter: `status in ("failed", "closed")`
  - limit: `20`
- `admin/risk` still runs the two risk queries in parallel with `Promise.all`.
- Existing server actions in `admin/risk` still use `createServiceClient` and were not changed.

Small Codex cleanup:

- Updated the `lib/domain/admin/queries.ts` header comment because not every admin list service now returns exactly 50 rows.

## Additional Tests Added

Updated `tests/unit/admin/queries.test.ts` to cover:

- audit log list table/order/limit
- suspended profile list `eq("is_suspended", true)` and limit
- abnormal payment list `.in("status", ["failed", "closed"])` and limit
- backend error propagation for the new query services

## Validation

Commands run:

- `pnpm test tests/unit/admin/queries.test.ts`
  - result: 1 file passed, 10 tests passed
- `pnpm typecheck`
  - result: passed
- `pnpm lint; pnpm typecheck; pnpm test`
  - result: lint passed, typecheck passed, 15 test files passed, 8 skipped, 45 tests passed, 33 skipped
- `pnpm build`
  - result: passed, 42 static pages generated

No database schema changes were introduced in this round. Supabase integration tests that require external/local DB services remain outside this specific query-unit validation.

## Files Included For Commit

- `app/admin/audit/page.tsx`
- `app/admin/risk/page.tsx`
- `lib/domain/admin/queries.ts`
- `tests/unit/admin/queries.test.ts`
- `docs/agent-handoffs/2026-06-26-claude-admin-list-queries-2-result.md`
- `docs/agent-handoffs/2026-06-26-codex-admin-list-queries-2-integration.md`

## Next Recommended Claude Task

Continue the same read-query extraction pattern with `admin/developers` as the backend admin-list-query cleanup finisher.

Suggested scope:

- read `app/admin/developers/page.tsx` carefully because it combines list, detail, and audit/read context
- move only read-only list/detail queries into `lib/domain/admin/queries.ts`
- keep server actions as thin adapters if they already call domain services
- avoid mixing this with public/workspace page query extraction

