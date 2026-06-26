# Admin Review Boundary (Demand + Product Moderation)

## Summary

- **Feature:** Admin demand/product review + product takedown (page→domain extraction)
- **Owner:** Claude
- **Status:** ready-for-integration
- **Related branch:** `claude/domain-page-boundary`
- **Related files:**
  - `lib/domain/admin/governance.ts` (added `reviewDemand`, `reviewProduct`, `setProductSuspension`)
  - `app/admin/demands/page.tsx` (server actions now thin)
  - `app/admin/products/page.tsx` (server actions now thin)
  - `lib/db/types.ts` (unchanged)
  - `supabase/migrations/**` (unchanged)

## Purpose

The admin demand/product pages previously implemented moderation business rules
inline in server actions: the publish/reject/close state update, the audit log
write, and the decision/note validation. This moves all of it into the admin
domain layer so the pages only read the form, call a service, and map the typed
result to `revalidatePath` + redirect.

No schema, RLS, or RPC changes.

## Roles and Permissions

| Role | Allowed Actions | Denied Actions |
|---|---|---|
| guest / customer / developer | — | All (admin pages call `requireAdmin`) |
| admin | Approve/reject demands, approve/reject products, suspend/resume products | — |
| service role | Performs the update + audit insert (admin pages create the service client) | — |

`requireAdmin()` stays in the page server action (auth gate). The domain
functions assume an already-authorized admin and a service-role client.

## Data Model Changes

None.

## Domain Service Signatures

```ts
// lib/domain/admin/governance.ts
export type AdminReviewDecision = "approve" | "reject";

export type AdminModerationResult =
  | { entityId: string; ok: true }
  | { ok: false; reason: "missing_note" };

export async function reviewDemand(
  service: SupabaseClient<Database>,
  input: { adminId: string; decision: string; demandId: string; note: string },
): Promise<AdminModerationResult>;

export async function reviewProduct(
  service: SupabaseClient<Database>,
  input: { adminId: string; decision: string; note: string; productId: string },
): Promise<AdminModerationResult>;

export async function setProductSuspension(
  service: SupabaseClient<Database>,
  input: { adminId: string; note: string; productId: string; suspended: boolean },
): Promise<AdminModerationResult>;
```

`decision` is validated inside the service (`approve` | `reject`); an invalid
decision or empty note returns `{ ok: false, reason: "missing_note" }` (matches
the previous page redirect to `?error=missing_note`). A real DB error throws.

## API Routes

No HTTP routes. Invoked from admin page server actions:

| Page | Server action | Domain service | Success redirect |
|---|---|---|---|
| `/admin/demands` | `reviewDemandAction` | `reviewDemand` | `/admin/demands?reviewed={id}` |
| `/admin/demands` | `toggleSuspension` | `setDemandSuspension` (already domain) | `/admin/demands?reviewed={id}` |
| `/admin/products` | `reviewProductAction` | `reviewProduct` | `/admin/products?reviewed={id}` |
| `/admin/products` | `toggleSuspensionAction` | `setProductSuspension` | `/admin/products?reviewed={id}` |

On `{ ok: false }` each action redirects to `?error=missing_note` (unchanged behavior).

## State Transitions

```text
demand:  pending_review --approve--> published
         pending_review --reject---> closed
product: pending_review --approve--> published
         pending_review --reject---> rejected
product: published <--suspend/resume--> published (is_suspended flag only)
```

`approve` also stamps `published_at`; `reject` clears it. Suspension toggles
`is_suspended` only and never edits historical records.

## Validation Rules

- `demandId` / `productId` present.
- `decision ∈ {approve, reject}` for review actions.
- `note` non-empty (trimmed) for all four actions.

## Side Effects

- Audit events: `demand.approve` / `demand.reject` / `product.approve` /
  `product.reject` / `product.suspend` / `product.resume` (unchanged actions).
- Business events (new, additive): `demand.approved/rejected`,
  `product.approved/rejected`, `product.suspended/resumed` via `logBusinessEvent`.
- Notifications / payment / storage: none.

## Codex Integration Checklist

- [ ] `pnpm typecheck` / `pnpm lint` pass.
- [ ] `/admin/demands`: approve publishes + audit; reject closes + audit; empty note → `?error=missing_note`.
- [ ] `/admin/products`: approve publishes; reject rejects; suspend/resume toggles visibility; empty note → `?error=missing_note`.
- [ ] Audit rows still written with the same `action` values.
- [ ] `pnpm test` / `pnpm build` pass (no schema change; no `gen types` drift expected).

## Open Questions

- None. Behavior is intended to be identical to the previous inline implementation; only the home of the logic moved.
