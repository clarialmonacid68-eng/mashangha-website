# API and Domain Contract Template

Copy this file when introducing or changing a domain service, API route, RPC, or schema-backed workflow.

Suggested path:

```text
docs/api/YYYY-MM-DD-<feature-or-flow>.md
```

## Summary

- **Feature:** `<short feature name>`
- **Owner:** `Claude | Codex | Shared`
- **Status:** `draft | ready-for-integration | integrated | deprecated`
- **Related branch:** `<branch name>`
- **Related files:**
  - `lib/domain/...`
  - `app/api/...`
  - `supabase/migrations/...`
  - `lib/db/types.ts`

## Purpose

Explain what user or system workflow this contract supports.

## Roles and Permissions

| Role | Allowed Actions | Denied Actions |
|---|---|---|
| guest |  |  |
| customer |  |  |
| developer |  |  |
| admin |  |  |
| service role |  |  |

## Data Model Changes

List all changed tables, enums, views, RPC functions, triggers, and RLS policies.

```sql
-- Include the important shape, not the full migration if it is long.
```

## Domain Service Signatures

```ts
export type ExampleInput = {
  id: string;
};

export async function exampleService(
  supabase: SupabaseClient<Database>,
  input: ExampleInput,
): Promise<ExampleResult> {
  // Contract only. Implementation lives in lib/domain.
}
```

## API Routes

| Method | Route | Auth | Domain Service | Notes |
|---|---|---|---|---|
| POST | `/api/example` | authenticated | `exampleService` |  |

### Request Example

```json
{
  "id": "00000000-0000-0000-0000-000000000000"
}
```

### Success Response

```json
{
  "ok": true
}
```

### Error Responses

| HTTP Status | Error Code or Message | Cause | UI Handling |
|---|---|---|---|
| 400 | `invalid_input` | Input failed validation. | Show field error. |
| 401 | `unauthorized` | User is not logged in. | Redirect to `/login`. |
| 403 | `forbidden` | RLS or domain permission denied. | Show permission error. |
| 409 | `invalid_state` | State transition is not allowed. | Refresh current state. |

## State Transitions

```text
draft -> pending_review -> published -> matched -> closed
```

Document who can trigger each transition and the database/RPC mechanism used.

## Validation Rules

- Rule 1:
- Rule 2:
- Rule 3:

## Side Effects

- Notifications:
- Audit events:
- File storage:
- Payment/refund/settlement:
- Email/SMS:

## Codex Integration Checklist

- [ ] Page or component imports only the API route or domain adapter intended for UI use.
- [ ] No duplicated business rule is added to `app/**`.
- [ ] Loading, success, and error states are visible in the UI.
- [ ] `pnpm typecheck` passes after regenerating types if schema changed.
- [ ] Relevant unit, integration, or E2E coverage is added.
- [ ] Production environment impact is documented.

## Open Questions

- Question:
- Decision owner:
- Deadline:
