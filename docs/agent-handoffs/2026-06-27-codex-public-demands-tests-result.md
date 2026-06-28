# Codex Handoff: Public Demand Query Coverage

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Summary

Public demand pages were inspected as the next public-page boundary module:

- `app/(marketing)/demands/page.tsx`
- `app/(marketing)/demands/[id]/page.tsx`

Both pages already call domain services (`listPublishedDemands` and `getPublishedDemandDetail`), so no page or production service code changes were needed in this round. The useful follow-up was to lock the existing public visibility behavior with unit coverage.

## Changes

Updated:

- `tests/unit/demands/service.test.ts`

Added unit coverage for:

- `listPublishedDemands`
- `getPublishedDemandDetail`

## Coverage Added

### Public Demand List

The test now verifies that `listPublishedDemands` applies the public list query contract:

- table: `demands`
- select:
  - `id`
  - `title`
  - `description`
  - `project_type`
  - `cooperation_mode`
  - `budget_min_cents`
  - `budget_max_cents`
  - `expected_delivery_days`
  - `published_at`
- visibility filters:
  - `status = published`
  - `is_suspended = false`
- order: `published_at` descending
- limit: `24`

### Public Demand Filters

The test now verifies parsed filters are translated into query operations:

- `projectType` -> `eq("project_type", value)`
- `budgetMaxCents` -> `lte("budget_min_cents", value)`
- `maxDeliveryDays` -> `lte("expected_delivery_days", value)`
- `keyword` -> `or("title.ilike.%...%,description.ilike.%...%")`
- `publishedWithinDays` -> `gte("published_at", isoDate)`

### Public Demand Detail

The test now verifies that `getPublishedDemandDetail` only reads public visible demand details:

- table: `demands`
- filters:
  - `id = demandId`
  - `status = published`
  - `is_suspended = false`
- result method: `maybeSingle`

## Production Code

No production code changed in this round.

No schema, RLS, RPC, migration, or UI changes were made.

## Validation

Local verification performed by Codex:

- `pnpm test tests/unit/demands/service.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Notes

The unit fake was adjusted to model Supabase's chainable query builder more accurately: list-style query chains now return the fake builder and resolve through `then`, while `single` and `maybeSingle` still resolve explicitly.

## Next Recommendation

Continue public-page query coverage and boundary checks with product-facing public pages:

- public products list page
- public product detail page

