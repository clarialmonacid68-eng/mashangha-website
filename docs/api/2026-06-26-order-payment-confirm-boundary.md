# Order Mock Payment Confirmation Boundary

## Summary

- **Feature:** Confirm a mock order payment from the pay page (page→domain extraction)
- **Owner:** Claude
- **Status:** ready-for-integration
- **Related branch:** `claude/domain-page-boundary`
- **Related files:**
  - `lib/payments/service.ts` (added `confirmOrderMockPaymentForUser`)
  - `app/(workspace)/workspace/orders/[id]/pay/page.tsx` (server action now thin)
  - `lib/db/types.ts` (unchanged)
  - `supabase/migrations/**` (unchanged)

## Purpose

The pay page server action `confirmPayment` previously contained backend rules
inline: locate the mock payment, verify it belongs to the order and the
authenticated buyer, seed the mock provider from the stored snapshot, and run
the confirmation RPC. This moves all of that into a domain service so the page
only maps a typed result to redirects.

No schema, RLS, or RPC changes.

## Roles and Permissions

| Role | Allowed Actions | Denied Actions |
|---|---|---|
| guest | — | Confirm payment → `unauthenticated` |
| customer | Confirm a mock payment for an order they own | Confirm another buyer's payment → `forbidden` |
| developer | (same rule; must be the order's customer) | — |
| admin | n/a here | — |
| service role | Used internally to read payment/order and run the confirm RPC | — |

Ownership is enforced in the domain function: the payment must reference the
given `orderId`, and `orders.customer_id` must equal the authenticated user.

## Data Model Changes

None.

## Domain Service Signatures

```ts
// lib/payments/service.ts
export type ConfirmOrderMockPaymentResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden" | "missing_payment" | "confirm_failed";
    };

export async function confirmOrderMockPaymentForUser(
  userClient: SupabaseClient<Database>, // RLS-scoped: identifies the caller
  service: SupabaseClient<Database>,     // service-role: reads rows + runs RPC
  input: { orderId: string; providerPaymentId: string },
): Promise<ConfirmOrderMockPaymentResult>;
```

## API Routes

No HTTP route. Invoked from the pay page **server action** `confirmPayment`.

### Server action → redirect mapping (unchanged behavior)

| Result | Redirect |
|---|---|
| `{ ok: true, orderId }` | `/workspace/orders/{orderId}?payment=confirmed` |
| `unauthenticated` | `/login` |
| `forbidden` | `/workspace/settings` |
| `confirm_failed` | `/workspace/orders/{orderId}/pay?payment={id}&error=confirm_failed` |
| `missing_payment` (incl. empty id) | `/workspace/orders/{orderId}/pay?error=confirm_failed` |

## State Transitions

```text
pending_payment --confirm mock payment--> in_progress
```

Driven by the existing `confirm_mock_payment` RPC inside `confirmMockPayment`;
this task did not change that mechanism.

## Validation Rules

- `providerPaymentId` must be present (else `missing_payment`).
- Payment must exist for `provider = 'mock'` and reference `orderId`.
- Authenticated user must be the order's `customer_id`.

## Side Effects

- Notifications: developer notified of successful mock payment (existing, inside `confirmMockPayment`).
- Audit events: none added here.
- Payment/settlement: confirms the mock payment; order advances to `in_progress`.

## Codex Integration Checklist

- [ ] `pnpm typecheck` / `pnpm lint` pass.
- [ ] Pay page still: create mock payment → confirm → lands on order detail `?payment=confirmed`.
- [ ] Confirming a payment that is not yours redirects to `/workspace/settings`.
- [ ] Unauthenticated confirm redirects to `/login`.
- [ ] `pnpm test` / `pnpm build` pass after regenerating types (no schema change expected).

## Open Questions

- None. Behavior is intended to be identical to the previous inline implementation.
