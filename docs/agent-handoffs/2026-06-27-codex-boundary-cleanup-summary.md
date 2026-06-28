# Codex Summary: Boundary Cleanup Phase

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Executive Summary

The boundary cleanup phase is now effectively complete.

The main architectural goal was to make `app/**` behave as UI/API adapters while business rules, data access, query contracts, form parsing, and operational workflows live in `lib/domain/**`, `lib/payments/**`, or focused infrastructure modules.

Current scan result:

```bash
rg -n "\.(from|rpc)\(" app --glob '!node_modules'
```

returns no matches. That means `app/**` no longer performs direct Supabase table reads/writes or RPC calls.

## What Changed

### Admin Boundary

Completed admin write-action and read-query extraction:

- review and suspension actions for demands/products/developers
- dispute decision routing
- risk actions
- admin list queries for demands, products, orders, disputes, audit, risk, developers

Primary files:

- `lib/domain/admin/governance.ts`
- `lib/domain/admin/queries.ts`
- `lib/domain/disputes/service.ts`

### Workspace Boundary

Completed workspace read-query extraction:

- notifications
- settings roles/developer review status
- customer demands
- customer demand quotes
- developer quotes
- developer profile
- dispute detail
- orders list/detail/payment summary
- purchases by reusing the existing buyer purchase service

Primary files:

- `lib/domain/notifications/queries.ts`
- `lib/domain/settings/queries.ts`
- `lib/domain/demands/service.ts`
- `lib/domain/developers/service.ts`
- `lib/domain/disputes/service.ts`
- `lib/domain/orders/queries.ts`
- `lib/domain/products/service.ts`
- `lib/domain/quotes/service.ts`

### Public Pages

Public developer queries were extracted and public demand/product query contracts are covered by tests:

- public developers list/detail
- public demands list/detail tests
- public products list/detail tests

Primary files:

- `lib/domain/developers/service.ts`
- `lib/domain/demands/service.ts`
- `lib/domain/products/service.ts`
- `tests/unit/developers/service.test.ts`
- `tests/unit/demands/service.test.ts`
- `tests/unit/products/service.test.ts`

### Payment And Order Workflows

Mock payment confirmation and settlement authorization moved out of pages/routes:

- pay page confirmation calls `confirmOrderMockPaymentForUser`
- mock confirm API calls `confirmMockPaymentForCurrentUser`
- order settlement page action calls `completeAcceptedOrderWithMockSettlementForCustomer`

Primary files:

- `lib/payments/service.ts`
- `lib/domain/orders/service.ts`
- `lib/domain/orders/queries.ts`

### Form Parsing

Page-level parsing/conversion was moved into domain form helpers:

- demand form parsing
- quote form amount/duration conversion
- order optional attachment parsing
- developer application form parsing

Primary files:

- `lib/domain/demands/form.ts`
- `lib/domain/quotes/form.ts`
- `lib/domain/orders/form.ts`
- `lib/domain/developers/form.ts`

## Recent Commit Trail

Key commits on `claude/domain-page-boundary`:

- `cda87e9` `refactor(domain): extract developer application form parsing`
- `11041f4` `refactor(domain): remove direct app data access`
- `6f42f94` `test(domain): cover public product queries`
- `3bfcf0d` `test(domain): cover public demand queries`
- `e643607` `feat(domain): extract public developer queries`
- `5752a8c` `feat(domain): extract developer profile query`
- `966078a` `feat(domain): extract dispute detail queries`
- `1daf3a9` `feat(domain): extract developer quotes query`
- `4f332d2` `feat(domain): extract customer demand quote queries`
- `54cbe9b` `feat(domain): extract customer demands query`
- `a1b6c22` `feat(domain): extract workspace settings queries`
- `4c7712d` `feat(domain): extract workspace notifications query`
- `e726b7e` `refactor(workspace): use buyer purchases service`
- `fdcead5` `feat(domain): extract participant orders list query`
- `bfc4f76` `feat(domain): extract order detail read queries`

Earlier Claude/Codex paired rounds in this branch covered admin reviews, admin lists, dispute routing, payment confirmation, and workspace form helpers.

## Current Verification

Latest local verification performed by Codex:

- `rg -n "\.(from|rpc)\(" app --glob '!node_modules'` -> no matches
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Latest observed results:

- all lint checks passed
- TypeScript passed with `tsc --noEmit`
- Vitest: `25 passed | 8 skipped` test files, `106 passed | 33 skipped` tests
- Next build succeeded and generated `42/42` static pages

## Remaining Known Constraints

### Supabase Type Generation

No schema/RLS/RPC/migration changes were made in the boundary cleanup phase.

Earlier notes mention the local Supabase CLI profile issue (`~/.supabase/profile` being empty) could block future `supabase gen types` runs. This did not affect these no-schema-change rounds, but it should be fixed before the next database migration.

### Real Payment

Payment remains mock-only. Real WeChat Pay / merchant-channel work is still externally blocked by merchant onboarding and compliance readiness.

Safe next work there is limited to a blocked skeleton, interface contracts, and configuration placeholders. It should not process real funds yet.

### Deployment

The branch has passed local build verification, but server deployment smoke checks remain separate:

- environment variables
- Supabase project credentials
- Tencent Cloud runtime
- domain/SSL/ICP public routing
- authenticated user flows

## Recommended Next Steps

1. Merge or PR `claude/domain-page-boundary` after final review.
2. Run a deployment smoke checklist on Tencent Cloud:
   - home/public pages
   - login/register
   - customer demand creation
   - developer application
   - quote submission
   - quote selection/order creation
   - mock payment
   - delivery/acceptance/review
   - admin review pages
3. Fix local Supabase CLI profile before future schema work.
4. Decide whether the next product milestone is:
   - deployment hardening
   - real payment blocked skeleton
   - admin operational polish
   - E2E expansion

## Handoff Position

This branch is in good shape for final review. The codebase now has a cleaner split:

- `app/**`: UI, route adapters, redirects, response mapping
- `lib/domain/**`: business rules, form parsing, read queries, governance workflows
- `lib/payments/**`: payment provider and mock-payment orchestration
- `tests/**`: unit/integration/E2E coverage for the extracted boundaries

