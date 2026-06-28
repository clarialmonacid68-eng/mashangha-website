# Agent Collaboration Rules

This repository uses an asynchronous Git-based workflow for two coding agents:

- Claude owns backend domain design, database migrations, generated database types, RLS/RPC, and complex transaction logic.
- Codex owns Next.js pages, UI components, form state, API integration, automated checks, Tencent Cloud deployment, and integration acceptance.

The goal is to keep both agents productive without editing the same files for the same reason.

## Current Baseline

- Working branch: `feature/marketplace-platform`.
- Production domain: `https://www.mshcode.com`.
- Production hosting: Tencent Cloud Ubuntu server with Nginx and PM2.
- ICP footer requirement: `陕ICP备2026015803号-1`.
- Backend candidate stack currently in use: Supabase Auth, Postgres, RLS, Storage, and generated TypeScript database types.

The working tree may contain uncommitted changes. Before starting a new task, each agent must run:

```bash
git status --short --branch
```

Do not revert, overwrite, or reformat unrelated changes.

## Directory Ownership

| Area | Primary Owner | Notes |
|---|---|---|
| `supabase/migrations/**` | Claude | Schema, RLS, RPC, triggers, seed data shape. |
| `lib/db/types.ts` | Claude first, Codex verifies | Claude may hand-edit during design. Codex regenerates from the real database during integration. |
| `lib/domain/**` | Claude | Business rules, validation, domain service signatures, state transitions. |
| `lib/payments/**` | Claude | Payment/refund/settlement abstractions and state logic. |
| `lib/security/**` | Claude | Idempotency, audit, rate-limit policy, permission helpers. |
| `lib/notifications/**` | Shared by contract | Claude defines backend event shape. Codex integrates UI surfaces. |
| `app/**` | Codex | Pages, layouts, route handlers, server actions used only as thin adapters. |
| `components/**` | Codex | Marketing, workspace, admin, and UI components. |
| `tests/**` | Codex primary | Claude may add focused domain tests if they do not require unavailable services. |
| `docs/api/**` | Claude primary | Codex reviews and extends with integration notes. |
| `docs/deployment/**` | Codex | Tencent Cloud, Nginx, PM2, production environment notes. |
| `docs/reviews/**` | Shared | Review reports must clearly state author and scope. |

## Boundary Rules

### 1. Page Files Must Stay Thin

`app/**/page.tsx` and `app/**/route.ts` files should not contain business logic. They may:

- read route params and search params,
- create the Supabase client,
- call a `lib/domain/**` service,
- convert domain results into UI props or HTTP responses,
- redirect or render errors.

They must not:

- directly implement state transitions,
- directly encode permission rules,
- directly insert/update multiple related tables,
- duplicate Zod validation already owned by `lib/domain/**`,
- perform payment, refund, delivery, dispute, or settlement rules inline.

If a page currently contains business logic, Claude should first extract it into `lib/domain/**`. Codex then adjusts the page to call the service.

### 2. Schema and Types Have One Source of Truth

Claude owns:

- migrations,
- enum/table/column naming,
- RLS/RPC behavior,
- initial `lib/db/types.ts` edits when the sandbox cannot generate types.

Codex owns integration correction:

```bash
pnpm exec supabase gen types typescript --local > lib/db/types.ts
pnpm typecheck
pnpm verify
```

If generated types differ from Claude's hand-written types, Codex must report the drift and keep the generated result unless there is a clear schema bug.

### 3. Contracts Before UI Integration

For every new or changed domain service, Claude must provide a contract under `docs/api/` before Codex builds UI against it.

Each contract must include:

- purpose,
- owner,
- affected files,
- service signatures,
- route handler expectations if any,
- request/response examples,
- permissions and RLS assumptions,
- state transitions,
- failure modes,
- integration checklist.

Use `docs/api/contract-template.md` as the starting point.

### 4. Small Branches, Small Pull Requests

Avoid one long-lived `feature/backend-api` branch. Prefer small branches:

```text
claude/domain-demand-actions
claude/order-state-machine
claude/delivery-dispute-rpc
codex/ui-demand-publish-flow
codex/ui-seller-workspace
codex/production-domain-cutover
```

Recommended flow:

1. Branch from latest shared baseline.
2. Make one coherent change.
3. Commit with a narrow message.
4. Push or hand off the patch.
5. Rebase before merge if another agent landed changes.
6. Let Codex run integration checks before production deployment.

### 5. Commit Message Convention

Use concise conventional prefixes:

```text
docs: define agent collaboration rules
feat(domain): extract demand submission service
feat(ui): add seller product dashboard
fix(auth): align callback redirect URL
test(e2e): cover demand publish flow
deploy: update Tencent Cloud bootstrap notes
```

Do not mix unrelated ownership areas in one commit unless the change is an intentional integration commit.

## Handoff Checklist

Claude handoff to Codex must include:

- branch or patch name,
- changed migrations,
- changed domain services,
- changed `lib/db/types.ts`,
- contract doc path under `docs/api/**`,
- required environment variables,
- known unverified assumptions,
- static checks run,
- checks Claude could not run.

Codex handoff to Claude must include:

- integration errors with exact command output,
- type drift from generated Supabase types,
- UI/API mismatch found during manual or E2E testing,
- production constraints from Tencent Cloud or Supabase,
- exact file references and minimal reproduction steps.

## Review Checklist

Before Codex integrates Claude's branch:

- [ ] No page file owns business state transitions.
- [ ] `lib/domain/**` exposes stable service signatures.
- [ ] `docs/api/**` describes every changed service and route.
- [ ] RLS policies match the user roles in the contract.
- [ ] Generated `lib/db/types.ts` matches migrations.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes or failures are documented.
- [ ] `pnpm build` passes.
- [ ] Critical flows are manually checked in the browser or covered by E2E.

Before production deployment:

- [ ] `NEXT_PUBLIC_APP_URL` is `https://www.mshcode.com`.
- [ ] Supabase Auth Site URL and Redirect URLs use the production domain.
- [ ] ICP footer is present on public pages.
- [ ] Server process is restarted with current environment.
- [ ] Public domain returns HTTP 200.
- [ ] Auth-protected pages redirect unauthenticated users to `/login`.

## Conflict Resolution

If both agents need the same file:

1. Decide whether the file belongs to UI, API adapter, or domain logic.
2. Move shared business logic into `lib/domain/**`.
3. Keep `app/**` as a caller.
4. Document the contract under `docs/api/**`.
5. Let the primary owner make the structural change first.

When in doubt, prefer a smaller extraction over a broad rewrite.
