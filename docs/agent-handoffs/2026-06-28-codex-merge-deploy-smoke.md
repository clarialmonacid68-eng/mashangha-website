# Codex Merge / Deployment Smoke Record

Date: 2026-06-28
Branch: `codex/boundary-merge-smoke`
Source branch: `claude/domain-page-boundary`
Base: `origin/main`
Merge commit: `9d30fd7 merge: integrate boundary cleanup branch`
Executor: Codex

## Summary

Created an integration branch from `origin/main` and merged `claude/domain-page-boundary` with `--allow-unrelated-histories`.

Reason: `origin/main` and the boundary-cleanup branch do not share Git history. A direct fast-forward or normal merge is not possible. The integration branch keeps `main` untouched while allowing real merged-tree verification.

## Git Findings

- `origin/main` root history starts at static prototype commit `830b089`.
- `claude/domain-page-boundary` root history starts at local baseline commit `ddb0ce0`.
- `git merge-base origin/main claude/domain-page-boundary` returns no merge base.
- A temporary merge simulation in `/tmp/mahcod-merge-smoke` completed without conflicts.
- The real integration branch merge completed without conflicts.

## Automated Checks

Pre-merge on `claude/domain-page-boundary`:

- `rg -n "\.(from|rpc)\(" app --glob '!node_modules'`: no matches
- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test`: 25 files passed, 8 skipped; 109 tests passed, 33 skipped
- `pnpm build`: pass after rerunning outside the sandbox because Turbopack cannot bind ports inside the sandbox

Merged tree on `codex/boundary-merge-smoke`:

- `rg -n "\.(from|rpc)\(" app --glob '!node_modules'`: no matches
- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test`: 25 files passed, 8 skipped; 109 tests passed, 33 skipped
- `pnpm build`: pass; 42 static pages generated

## Local Production Smoke

Started `next start -p 3001` using local Supabase Docker services:

- `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3001`
- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `PAYMENT_PROVIDER=mock`
- `ORDER_FILE_MAX_BYTES=52428800`
- Local Supabase anon/service keys were injected only as process environment variables and were not written to the repository.

HTTP smoke results:

| Route | Status |
| --- | --- |
| `/` | 200 |
| `/rules/service` | 200 |
| `/rules/trading` | 200 |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200 |
| `/login` | 200 |
| `/register` | 200 |
| `/demands` | 200 |
| `/developers` | 200 |
| `/products` | 200 |
| `/workspace/settings` | 307 |
| `/admin` | 307 |

The `307` responses are expected for unauthenticated workspace/admin routes.

## Local Environment Notes

- `pnpm exec supabase status` and `pnpm exec supabase db reset` are blocked by a broken local Supabase CLI profile:
  - `/Users/yangchao/.supabase/profile` is a zero-byte file.
  - CLI error: `failed to read profile: Config File "config" Not Found in "[]"`.
- Local Supabase Docker services are running.
- The local DB initially missed `public.products`; applying only `supabase/migrations/202606170007_products.sql` to the local Docker database fixed `/products` smoke.

## Remote HTTP Probe

No server files were changed in this step.

Observed current remote responses:

| URL | Status |
| --- | --- |
| `http://82.157.139.80` | 404 |
| `https://www.mshcode.com` | 200 |
| `https://www.mshcode.com/robots.txt` | 200 |

Interpretation: the production domain virtual host is serving the Next.js app, while the bare IP default host is not mapped to the app root.

## Not Completed In This Step

- Did not push to `main`.
- Did not deploy the integration branch to Tencent Cloud.
- Did not run authenticated browser E2E against the production domain.
- Did not repair the global Supabase CLI profile.

## Recommended Next Step

1. Push `codex/boundary-merge-smoke`.
2. Open a PR from `codex/boundary-merge-smoke` to `main`, or explicitly approve direct update of `main`.
3. Deploy the merged commit to Tencent Cloud.
4. Run the authenticated smoke checklist in `docs/deployment/boundary-branch-smoke-test.md`.
