# Codex Handoff: App Data Access Boundary Closure

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Summary

This round scanned the `app/**` tree for direct Supabase data access after the prior workspace and public-page query extraction rounds.

Result: `app/**` no longer contains direct `.from(...)` or `.rpc(...)` calls. Page, layout, and route files now call domain/service functions and act as adapters.

## Scope

Changed app adapters:

- `app/(workspace)/workspace/layout.tsx`
- `app/(workspace)/workspace/settings/page.tsx`
- `app/(workspace)/workspace/orders/[id]/page.tsx`
- `app/(workspace)/workspace/orders/[id]/pay/page.tsx`
- `app/api/payments/mock/confirm/route.ts`

Changed domain/service code:

- `lib/domain/developers/service.ts`
- `lib/domain/orders/queries.ts`
- `lib/domain/orders/service.ts`
- `lib/payments/service.ts`

Changed tests:

- `tests/unit/developers/service.test.ts`
- `tests/unit/orders/queries.test.ts`
- `tests/unit/payments/service.test.ts`

## Details

### Workspace Layout Role Query

`workspace/layout.tsx` now uses the existing `listCurrentUserRoles` service instead of querying `user_roles` directly.

### Settings Developer Application RPC

`workspace/settings/page.tsx` now calls `applyForDeveloperRole`, which wraps the `apply_for_developer` RPC in `lib/domain/developers/service.ts`.

### Order Settlement Action

`workspace/orders/[id]/page.tsx` now calls `completeAcceptedOrderWithMockSettlementForCustomer`, which owns:

- current user lookup
- customer ownership check
- service-role settlement handoff

The page action only maps errors to redirects.

### Order Payment Page Read Query

`workspace/orders/[id]/pay/page.tsx` now calls `getOrderPaymentSummaryForCustomer` from `lib/domain/orders/queries.ts`.

The function preserves the previous behavior:

- select `id, amount_cents, status, developer_id, customer_id`
- return `null` if the order is missing or not owned by the current customer
- let the page redirect to settings when no payable customer summary is visible

### Mock Payment Confirm API

`app/api/payments/mock/confirm/route.ts` now calls `confirmMockPaymentForCurrentUser` from `lib/payments/service.ts`.

The route keeps HTTP response mapping while payment lookup, order ownership check, mock provider seeding, and confirmation live in the payment service.

## Verification

Performed locally:

- `rg -n "\\.(from|rpc)\\(" app --glob '!node_modules'` -> no matches
- `pnpm test tests/unit/orders/queries.test.ts tests/unit/payments/service.test.ts tests/unit/settings/queries.test.ts tests/unit/developers/service.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Notes

No schema, RLS, RPC, migration, route shape, or UI changes were introduced.

This is primarily an architectural boundary cleanup: `app/**` now has no direct Supabase table/RPC access.

## Next Recommendation

Run a final boundary audit over:

- `app/**` route handlers for non-Supabase business logic that should move to domain services
- public/workspace pages for remaining form parsing that is still worth extracting
- deployment smoke checks after this branch is merged or promoted

