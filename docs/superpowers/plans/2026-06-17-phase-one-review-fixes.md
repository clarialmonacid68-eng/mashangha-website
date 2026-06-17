# Phase One Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the review gaps that block a natural first-phase local transaction loop without enabling real WeChat Pay funds movement.

**Architecture:** Reuse existing domain services and Supabase tables. Add minimal service helpers for mock settlement and persistent notifications, then wire them into payment, order, and dispute success paths.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Vitest, Playwright.

---

### Task 1: Mock Payment Confirmation UI

**Files:**
- Modify: `app/(workspace)/workspace/orders/[id]/pay/page.tsx`
- Test: `tests/unit/payments/pay-page-ui.test.ts`
- Verify: `tests/e2e/customer-flow.spec.ts`

- [x] **Step 1: Write failing UI expectation**

Add a lightweight UI source expectation that a created mock payment exposes a confirmation action on the payment page.

- [x] **Step 2: Run the focused test**

Run:

```bash
pnpm vitest run tests/unit/payments/pay-page-ui.test.ts
```

Expected: fails because no confirm action exists on the page.

- [x] **Step 3: Implement confirmation server action**

Add a server action to the pay page that calls the existing `/api/payments/mock/confirm` behavior through `confirmMockPayment` and redirects to `/workspace/orders/[id]`.

- [x] **Step 4: Verify focused test passes**

Run the same Playwright file and confirm it passes.

### Task 2: Mock Settlement Completion

**Files:**
- Modify: `lib/domain/orders/service.ts`
- Test: `tests/integration/orders/acceptance.test.ts`

- [x] **Step 1: Write failing integration test**

Assert an accepted order can be completed by a mock settlement service and then reviewed without manually updating `orders`.

- [x] **Step 2: Run the focused test**

Run:

```bash
pnpm vitest run tests/integration/orders/acceptance.test.ts
```

Expected: fails because the mock settlement function does not exist.

- [x] **Step 3: Implement minimal service**

Add `completeAcceptedOrderWithMockSettlement()` that requires `accepted`, creates a `profit_shares` row, writes status history, and updates order to `completed`.

- [x] **Step 4: Verify focused test passes**

Run the same Vitest file and confirm it passes.

### Task 3: Persistent Notifications

**Files:**
- Create: `lib/notifications/repository.ts`
- Modify: `lib/domain/orders/service.ts`
- Modify: `lib/domain/disputes/service.ts`
- Modify: `lib/payments/service.ts`
- Create: `supabase/migrations/202606170001_notification_service_select.sql`
- Test: `tests/integration/notifications/persistence.test.ts`

- [x] **Step 1: Write failing persistence test**

Assert `SupabaseNotificationRepository` deduplicates by `event_key` and that payment/message/delivery/acceptance/settlement/dispute services create recipient notifications.

- [x] **Step 2: Run focused notification test**

Run:

```bash
pnpm vitest run tests/integration/notifications/persistence.test.ts
```

Expected: fails because the repository and service wiring do not exist.

- [x] **Step 3: Implement repository and service wiring**

Create `SupabaseNotificationRepository`, then call it after successful domain mutations. Use stable event keys like `payment:{orderId}:succeeded`.

- [x] **Step 4: Verify focused test passes**

Run the notification test and confirm it passes.

### Task 4: Final Verification and Commit

**Files:**
- Modify: `docs/superpowers/plans/2026-06-17-phase-one-review-fixes.md`

- [x] **Step 1: Run focused verification**

```bash
pnpm vitest run tests/integration/payments/mock-payment.test.ts tests/integration/orders/acceptance.test.ts tests/integration/notifications/persistence.test.ts
pnpm playwright test tests/e2e/customer-flow.spec.ts tests/e2e/developer-flow.spec.ts
```

- [x] **Step 2: Run full verification**

```bash
pnpm verify
```

- [x] **Step 3: Commit**

```bash
git add app lib tests docs/superpowers
git commit -m "feat: close phase one review gaps"
```
