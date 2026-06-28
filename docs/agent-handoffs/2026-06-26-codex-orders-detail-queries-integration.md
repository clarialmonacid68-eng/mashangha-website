# Codex Integration: Workspace Order Detail Read Queries

Date: 2026-06-26
Branch: `claude/domain-page-boundary`

## Scope Reviewed

Claude started the workspace/public read-query extraction phase with:

- `app/(workspace)/workspace/orders/[id]/page.tsx`
- new `lib/domain/orders/queries.ts`

The order detail page's five render-time read queries were moved into a domain query module while keeping server actions, payment flow, JSX, and styling unchanged.

## Equivalence Check

Verified the read services keep the previous query behavior:

- `getOrderForParticipant`
  - table: `orders`
  - columns: `id, amount_cents, status, customer_id, developer_id, created_at`
  - filter: `id = orderId`
  - uses caller's RLS-scoped client
  - returns one row or `null`
- `listOrderMessages`
  - table: `order_messages`
  - filter: `order_id = orderId`
  - order: `created_at` ascending
  - returns `[]` for no rows
- `listOrderAttachments`
  - table: `order_attachments`
  - filter: `order_id = orderId`
  - order: `created_at` ascending
  - returns `[]` for no rows
- `listOrderDeliveries`
  - table: `deliveries`
  - filter: `order_id = orderId`
  - order: `version` descending
  - returns `[]` for no rows
- `getOrderReviewByAuthor`
  - table: `reviews`
  - filters: `order_id = orderId`, `author_id = user.id`
  - returns one row or `null`

The page still uses the user-scoped Supabase client from `createClient()`, so RLS behavior remains unchanged. If the order is not visible, `getOrderForParticipant` returns `null` and the page still redirects to `/workspace/settings`.

Claude changed the order lookup from `.single()` to `.maybeSingle()`. For this page's existing control flow, the relevant 0-row behavior remains equivalent because the previous implementation ignored the error and checked falsy `data`; the new implementation returns `null` directly.

## Additional Tests Added

Added `tests/unit/orders/queries.test.ts` covering:

- invisible order returns `null`
- messages filter/order and `null -> []`
- attachments filter/order and `null -> []`
- deliveries filter/order and `null -> []`
- review lookup by `order_id + author_id`
- backend error propagation for single-row and list queries

## Validation

Commands run:

- `pnpm test tests/unit/orders/queries.test.ts`
  - result: 1 file passed, 10 tests passed
- `pnpm typecheck`
  - result: passed
- `pnpm lint; pnpm typecheck; pnpm test`
  - result: lint passed, typecheck passed, 16 test files passed, 8 skipped, 62 tests passed, 33 skipped
- `pnpm build`
  - result: passed, 42 static pages generated

No database schema changes were introduced in this round.

## Files Included For Commit

- `app/(workspace)/workspace/orders/[id]/page.tsx`
- `lib/domain/orders/queries.ts`
- `tests/unit/orders/queries.test.ts`
- `docs/agent-handoffs/2026-06-26-claude-orders-detail-queries-result.md`
- `docs/agent-handoffs/2026-06-26-codex-orders-detail-queries-integration.md`

## Next Recommended Claude Task

Continue workspace read-query extraction one module at a time.

Suggested next candidate:

- `workspace/orders` list page

Why:

- it is adjacent to the order detail module just completed
- it should be a simpler list-query extraction
- it keeps the workspace order surface moving as one coherent slice

