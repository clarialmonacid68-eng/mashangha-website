# Codex Integration: Admin Developers Boundary

Date: 2026-06-26
Branch: `claude/domain-page-boundary`

## Scope Reviewed

Claude completed the backend admin boundary cleanup with `app/admin/developers/page.tsx`.

This page had two kinds of inline backend work:

- developer profile review writes (`developer_profiles.update` + audit log)
- read-only list/context queries for developer profiles and developer review audit logs

Both were moved into domain services.

## Equivalence Check

Verified the write path keeps the previous behavior:

- approve:
  - updates `developer_profiles.review_status` to `approved`
  - clears `rejection_reason`
  - sets `reviewed_at`
  - writes audit action `developer.approve`
  - redirects with `?reviewed=<developerId>`
- reject:
  - updates `developer_profiles.review_status` to `rejected`
  - writes `rejection_reason` from the trimmed note
  - sets `reviewed_at`
  - writes audit action `developer.reject`
  - redirects with `?reviewed=<developerId>`
- invalid input:
  - missing developer id, invalid decision, or blank note returns `missing_note`
  - page redirects to `/admin/developers?error=missing_note`

Verified the read paths keep the original query shape:

- `listAdminDevelopers`
  - table: `developer_profiles`
  - columns: `user_id, display_name, headline, bio, skills, review_status, rejection_reason, reviewed_at`
  - order: `updated_at` descending
  - limit: `50`
- `listDeveloperReviewAuditLogs`
  - table: `audit_logs`
  - columns: `entity_id, metadata, created_at`
  - filter: `entity_type = developer_profile`
  - order: `created_at` descending
  - limit: `100`

The page keeps the audit-note aggregation map as display-layer shaping, which is appropriate because it does not own permissions, state transitions, or writes.

## Additional Tests Added

Updated `tests/unit/admin/queries.test.ts`:

- covers `listAdminDevelopers` table/order/limit
- covers `listDeveloperReviewAuditLogs` entity filter/order/limit
- includes backend error propagation for both new query services

Updated `tests/unit/admin/governance.test.ts`:

- covers `reviewDeveloperProfile` approve branch
- covers `reviewDeveloperProfile` reject branch
- covers invalid decision/blank note guard with no mutation

## Validation

Commands run:

- `pnpm test tests/unit/admin/queries.test.ts tests/unit/admin/governance.test.ts`
  - result: 2 files passed, 20 tests passed
- `pnpm typecheck`
  - result: passed
- `pnpm lint; pnpm typecheck; pnpm test`
  - result: lint passed, typecheck passed, 15 test files passed, 8 skipped, 52 tests passed, 33 skipped
- `pnpm build`
  - result: passed, 42 static pages generated

No database schema changes were introduced in this round. Supabase type generation is not expected to change.

## Files Included For Commit

- `app/admin/developers/page.tsx`
- `lib/domain/admin/governance.ts`
- `lib/domain/admin/queries.ts`
- `tests/unit/admin/governance.test.ts`
- `tests/unit/admin/queries.test.ts`
- `docs/agent-handoffs/2026-06-26-claude-admin-developers-boundary-result.md`
- `docs/agent-handoffs/2026-06-26-codex-admin-developers-boundary-integration.md`

## Boundary Status

Admin pages are now complete for this cleanup phase:

- demands
- products
- orders
- disputes
- risk
- audit
- developers

Inline admin writes and admin read-only list queries have been moved into domain services.

## Next Recommended Claude Task

Move to workspace/public read-query extraction in small batches. Start with one module, not the entire app.

Suggested first candidate:

- `workspace/orders/[id]`

Why:

- it is important to the order lifecycle
- it has enough read context to benefit from a list/detail query service
- it should stay separate from payment adapter work

