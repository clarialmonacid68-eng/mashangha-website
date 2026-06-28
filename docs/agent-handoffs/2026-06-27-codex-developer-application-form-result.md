# Codex Handoff: Developer Application Form Boundary

Date: 2026-06-27
Branch: `claude/domain-page-boundary`

## Summary

During the final `app/**` boundary audit, the remaining clear page-level parsing logic was found in:

- `app/(workspace)/workspace/developer/apply/page.tsx`

The page contained local helpers for:

- splitting skills and service scopes by newline / comma / Chinese comma
- converting starting price from yuan to cents
- defaulting payout subject type

This round moved that parsing into a developer-domain form helper.

## Changes

Added:

- `lib/domain/developers/form.ts`
- `tests/unit/developers/form.test.ts`

Updated:

- `app/(workspace)/workspace/developer/apply/page.tsx`

## Behavior Preserved

`createDeveloperApplicationFromForm(formData)` preserves the previous page behavior:

- `skills` and `serviceScopes` split by `\n`, `,`, and `，`
- list items are trimmed and empty items removed
- `startingPrice` is converted from yuan to cents with `Math.round(amount * 100)`
- invalid money becomes `-1`, allowing the existing schema validation to reject it
- payout subject type defaults to `individual` unless the submitted value is exactly `company`

The page server action is now a thin adapter:

- create Supabase client
- call `submitDeveloperApplication(supabase, createDeveloperApplicationFromForm(formData))`
- map errors to redirect query params

## Tests

Added unit tests for:

- full developer application form parsing
- list splitting
- yuan-to-cents conversion
- invalid payout type default
- invalid money fallback

## Validation

Performed locally:

- `pnpm test tests/unit/developers/form.test.ts tests/unit/developers/service.test.ts`
- `pnpm exec eslint app/(workspace)/workspace/developer/apply/page.tsx lib/domain/developers/form.ts tests/unit/developers/form.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Notes

No schema, RLS, RPC, migration, UI, or route behavior changed.

This is a small final-boundary cleanup after direct `app/**` Supabase table/RPC access had already been eliminated.

## Next Recommendation

At this point, the boundary cleanup phase is close to complete. Recommended next steps:

- run one final full audit report over `app/**`, `lib/domain/**`, and tests
- decide whether to merge this branch
- move focus to deployment smoke checks or real-payment blocked skeleton work

