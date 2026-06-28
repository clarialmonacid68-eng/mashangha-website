# Codex Handoff: Public Product Query Coverage

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Summary

Public product pages were inspected as the next public-page boundary module:

- `app/(marketing)/products/page.tsx`
- `app/(marketing)/products/[id]/page.tsx`

Both pages already call domain services (`listPublishedProducts` and `getPublishedProduct`), so no page or production service code changes were needed in this round. This round adds unit coverage for the existing public product query contract.

## Changes

Updated:

- `tests/unit/products/service.test.ts`

Added unit coverage for:

- `listPublishedProducts`
- `getPublishedProduct`

## Coverage Added

### Public Product List

The test now verifies that `listPublishedProducts` applies the public list query contract:

- table: `products`
- select:
  - `id`
  - `seller_id`
  - `title`
  - `summary`
  - `description`
  - `category`
  - `price_cents`
  - `delivery_type`
  - `published_at`
- visibility filters:
  - `status = published`
  - `is_suspended = false`
- order: `published_at` descending
- limit: `24`

### Public Product Filters

The test now verifies parsed filters are translated into query operations:

- `category` -> `eq("category", value)`
- `keyword` -> `or("title.ilike.%...%,summary.ilike.%...%")`

### Public Product Detail

The test now verifies that `getPublishedProduct` only reads publicly visible product details:

- table: `products`
- filters:
  - `id = productId`
  - `status = published`
  - `is_suspended = false`
- result method: `maybeSingle`

## Production Code

No production code changed in this round.

No schema, RLS, RPC, migration, or UI changes were made.

## Validation

Local verification performed by Codex:

- `pnpm test tests/unit/products/service.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Notes

The product service test fake now models Supabase's chainable query builder more accurately: list-style query chains return the fake builder and resolve through `then`, while `maybeSingle` resolves explicitly.

## Next Recommendation

Continue public/workspace query coverage with a small module:

- public demand/product coverage is now in place
- next useful candidate: audit remaining marketing pages for direct `.from(...)` reads, then move to any remaining workspace pages

