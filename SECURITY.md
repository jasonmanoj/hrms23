# Security & Release Process

## Branching model

- **`main`** — production. Protected: no direct pushes, requires an approved PR with all
  required status checks green (lint, typecheck, build, migration validation, CodeQL,
  dependency review).
- **`develop`** — staging. Auto-deploys on every push so changes can be verified against a
  real environment before being promoted to `main`.
- **Feature branches** (`feature/*`, `fix/*`) — branch off `develop`, PR back into `develop`.
  Short-lived; delete after merge.

Promotion flow: `feature/* → develop (staging, auto-deploy) → main (production, gated)`.

## CI (every push and PR)

`.github/workflows/ci.yml` runs on the backend and frontend independently:
- Install with `npm ci` (locked, reproducible dependency resolution)
- Lint (no auto-fix — must already be clean)
- Type-check
- Build
- Backend only: Prisma migrations are applied against a throwaway Postgres in the runner,
  so a broken migration fails CI instead of failing in production
- Dependency audit (reported, non-blocking — see "Why audit doesn't hard-block" below)

`.github/workflows/codeql.yml` runs GitHub's semantic static analysis (SAST) against the
TypeScript/JavaScript source on every push/PR plus a weekly scheduled scan, so newly
disclosed vulnerability patterns get caught even against unchanged code.

`.github/workflows/dependency-review.yml` runs on every PR and fails it if the PR's
dependency *diff* introduces a new high-severity vulnerability. This is different from
`npm audit` — it's scoped to what the PR actually changes, so it doesn't get noisy from
pre-existing, unrelated findings.

### Why `npm audit` doesn't hard-block CI

A large share of findings in any Node project are in **build-time-only tooling**
(bundlers, CLIs) that never run in the deployed process, and fixes are often only
available via a major version bump the team hasn't reviewed yet. Hard-blocking on every
`npm audit` finding produces a pipeline that's red for reasons unrelated to the change
being shipped, which trains people to ignore it. Instead:
- CodeQL and Dependency Review are the **blocking** security gates (semantic analysis of
  actual code, and net-new risk introduced by a PR).
- Dependabot (`.github/dependabot.yml`) opens a PR automatically when a fix becomes
  available for an existing dependency, so upgrades happen on a schedule and go through
  the same CI + review gate as any other change — not as an emergency hotfix.

## Deployment

- **Staging**: Railway and Vercel auto-deploy `develop` on every push (native Git
  integration on each platform). Fast feedback loop, no approval needed.
- **Production**: `.github/workflows/deploy-production.yml` waits for CI to succeed on
  `main`, then requires a human approval via the `production` GitHub Environment
  (Settings → Environments → `production` → Required reviewers) before it calls the
  Railway and Vercel deploy hooks. Nothing reaches production without both a green
  pipeline and an explicit approval.

## Rollback

- **Application code**: `git revert <commit>` on `main` (never `reset --force` on a
  shared branch) → CI runs → approve the production deploy. Preserves history and audit
  trail instead of rewriting it.
- **Vercel**: every deployment is immutable and listed in the dashboard; use "Promote to
  Production" on any prior deployment for an instant rollback (seconds, no rebuild).
- **Railway**: the Deployments tab keeps deployment history; redeploying a prior
  deployment restarts the service on that build.
- **Database migrations**: Prisma migrations are forward-only by default. Prefer additive
  migrations (new nullable column, new table) that don't require a matching rollback. For
  anything destructive (dropping/renaming a column, changing a type), take a manual
  `pg_dump` backup immediately before applying it in production, and write the down-path
  as a follow-up migration rather than relying on `prisma migrate resolve`.

## Secrets

- Never committed. Local dev uses `.env` / `.env.local` (gitignored); production secrets
  live only in Railway/Vercel's own environment variable stores and in the `production`
  GitHub Environment's secrets (for the deploy hook URLs only — nothing more sensitive
  than that touches GitHub Actions).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` must be distinct, random values per
  environment (staging and production must not share secrets) — see `backend/.env.example`.

## Reporting a vulnerability

Open a private security advisory on this repository (Security tab → Report a
vulnerability) rather than a public issue.
