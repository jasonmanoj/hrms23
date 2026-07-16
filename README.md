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

## Development phases

This repo currently implements Phase 1-4 of the specification's roadmap (Core Platform, Leave Management,
Attendance, Reports & Exports) plus baseline Notifications and Audit Logs. Custom Module Builder, Custom Form
Builder, Approval/Workflow Builder UI, and advanced features (mobile, biometric, payroll, etc.) are future phases.
