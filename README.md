# HRMS

Multi-tenant, role-based HR Management System with an Admin Portal and an Employee Self-Service Portal.

This repository implements the MVP scope defined in the functional specification: organization setup, authentication,
roles & permissions, Employee Master with documents, leave policy/application/approval/balances, web check-in/check-out,
attendance history & regularization, standard reports with Excel export, notifications, and audit logs.

## Stack

- **Backend**: NestJS, TypeScript, PostgreSQL (Prisma ORM), Redis + BullMQ for background jobs, JWT auth.
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS.
- **Infra**: Docker Compose for local Postgres + Redis.

## Structure

```
backend/    NestJS API (see backend/README.md)
frontend/   Next.js Admin Portal + Employee Portal (see frontend/README.md)
docker-compose.yml   Local Postgres + Redis
```

## Getting started

```bash
docker compose up -d          # start Postgres + Redis
cd backend && cp .env.example .env && npm install
npx prisma migrate dev        # create schema
npm run seed                  # seed default org, roles, admin user
npm run start:dev             # http://localhost:3001

cd ../frontend && cp .env.example .env.local && npm install
npm run dev                   # http://localhost:3000
```

Default seeded login (after `npm run seed`): `admin@hrms.local` / `Admin@12345`.

## CI/CD & Deployment

See [`SECURITY.md`](./SECURITY.md) for the full branching model, CI gates, deployment flow, and rollback procedure.
Short version:

- `develop` → staging, auto-deploys on every push (Railway + Vercel native Git integration).
- `main` → production, protected. CI (`.github/workflows/ci.yml`) must pass, then a human approves the deploy via a
  GitHub Environment before `.github/workflows/deploy-production.yml` triggers the Railway/Vercel deploy hooks.
- CodeQL, Dependency Review, and Dependabot run automatically for security coverage beyond `npm audit`.

**One-time setup on Railway:**
1. New Project → Deploy from GitHub repo → root directory `backend`.
2. Add PostgreSQL and Redis services in the same project.
3. Env vars on the backend service: `DATABASE_URL` (reference Postgres), `REDIS_URL` (reference Redis),
   `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (random, distinct per environment — `openssl rand -hex 32`),
   `CORS_ORIGIN` (your Vercel URL), `NODE_ENV=production`.
4. Create a **Deploy Hook** for the production environment/branch (Railway → Settings → Deploy Triggers) and disable
   auto-deploy on `main` — production should only deploy via the gated GitHub Actions workflow. Leave auto-deploy
   enabled for `develop` (staging).
5. Store the hook URL as the `RAILWAY_DEPLOY_HOOK` secret in the `production` GitHub Environment.
6. Seed the deployed database once via Railway's shell: `npm run seed`.

**One-time setup on Vercel:**
1. Import the repo → root directory `frontend`.
2. Env var: `NEXT_PUBLIC_API_URL=https://<railway-backend-url>/api`.
3. Create a Deploy Hook for `main` (Project Settings → Git → Deploy Hooks), disable auto-deploy for `main`, keep it
   enabled for `develop`.
4. Store the hook URL as `VERCEL_DEPLOY_HOOK` in the `production` GitHub Environment.

**Known limitation:** uploaded documents and report exports are written to local disk and are not persisted across
Railway redeploys. Swapping in S3-compatible object storage (already called out as a future phase) removes this.

## Development phases

This repo currently implements Phase 1-4 of the specification's roadmap (Core Platform, Leave Management,
Attendance, Reports & Exports) plus baseline Notifications and Audit Logs. Custom Module Builder, Custom Form
Builder, Approval/Workflow Builder UI, and advanced features (mobile, biometric, payroll, etc.) are future phases.
