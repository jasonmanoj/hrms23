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

## Deployment

**Backend → Railway:**
1. New Project → Deploy from GitHub repo → root directory `backend`, branch as needed.
2. Add PostgreSQL and Redis services in the same Railway project.
3. On the backend service, set env vars: `DATABASE_URL` (reference the Postgres service), `REDIS_URL` (reference the
   Redis service), `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (random values, e.g. `openssl rand -hex 32`),
   `CORS_ORIGIN` (your frontend URL), `NODE_ENV=production`.
4. `railway.json` in `backend/` pins the build/start commands and a `/api/health` healthcheck so Railway knows when
   the instance is actually ready (migrations run automatically via `start:prod`).
5. Seed the deployed database once via Railway's shell: `npm run seed`.

**Frontend → Vercel:**
1. Import the repo → root directory `frontend`.
2. Env var: `NEXT_PUBLIC_API_URL=https://<railway-backend-url>/api`.
3. Deploy, then set `CORS_ORIGIN` on the Railway backend to the resulting Vercel URL.

Once both are wired to the same branch, every push auto-deploys both sides — no local run required to see changes.

**Known limitation:** uploaded documents and report exports are written to local disk and are not persisted across
Railway redeploys. Swapping in S3-compatible object storage (already called out as a future phase) removes this.

## Development phases

This repo currently implements Phase 1-4 of the specification's roadmap (Core Platform, Leave Management,
Attendance, Reports & Exports) plus baseline Notifications and Audit Logs. Custom Module Builder, Custom Form
Builder, Approval/Workflow Builder UI, and advanced features (mobile, biometric, payroll, etc.) are future phases.
