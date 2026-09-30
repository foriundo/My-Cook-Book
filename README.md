# My Cook Book

A lightweight cookbook MVP built with Next.js, TypeScript, Tailwind CSS, Prisma, SQLite, and Auth.js.

## Setup

1. Install dependencies:
   npm install
2. Copy the env template:
   cp .env.example .env
3. Generate the Prisma client and apply the SQLite schema:
   npx prisma generate
   npx prisma migrate dev --name init
4. Start the app:
   npm run dev
5. Open http://localhost:3000

## Features covered

- Auth via email/password credentials
- Recipe creation and listing
- Servings scaling and unit conversion
- Ingredient parser utility and video embed parser
- Vitest coverage for scaling and video helpers

## Switching to Postgres

1. Change the Prisma datasource provider in `prisma/schema.prisma` to `postgresql`.
2. Update `DATABASE_URL` in `.env` to your Postgres connection string.
3. Run:
   npx prisma migrate dev

## Scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — ESLint validation
- `npm run test` — Vitest suite
