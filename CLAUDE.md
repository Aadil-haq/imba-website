# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this app is

Basketball league management platform for the Irving Masjid Basketball Association (IMBA). It handles teams, players, game scheduling, statistics, standings, and player registration with Stripe payments.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # prisma generate + next build
npm run lint         # ESLint

npx prisma studio          # Browse/edit DB in browser
npx prisma migrate dev     # Create + apply a migration
npx prisma db push         # Push schema changes without migration (dev only)
npx prisma generate        # Regenerate Prisma client after schema changes
npx prisma db seed         # Seed database (prisma/seed.ts)
```

No test suite exists in this project.

## Environment variables

Required in `.env.local`:
```
DATABASE_URL="file:./dev.db"          # or a Turso libsql:// URL
TURSO_DATABASE_URL=...                # if using Turso cloud
TURSO_AUTH_TOKEN=...                  # if using Turso cloud
ADMIN_SECRET="imba-admin-2025"
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=...
REGISTRATION_FEE=8000                 # in cents
```

## Architecture

**Stack:** Next.js App Router, React 19, Tailwind CSS 4, Prisma 7 + LibSQL adapter, SQLite (local) / Turso (production), Stripe, Vercel Blob.

**Database (`lib/db.ts`):** Prisma client wrapped in a global singleton using the LibSQL adapter. Converts `libsql://` URLs to `https://` for the HTTP client. The schema lives in `prisma/schema.prisma`.

**Core models:** `Team`, `Player`, `Game`, `PlayerGameStat`, `Season`, `Registration`, `Announcement`, `AdminUser`, `SiteSetting`.

**Multi-season / multi-league:** Games and teams carry a `season` string (e.g. `"Fall 2024"`) and a `league` field (`"mens"` / `"coed"`). Most public pages accept `?season=` and `?league=` query params to filter. The `Season` model tracks which season is currently active. Season-specific team participation is tracked via the `SeasonTeam` join table.

**Admin authentication (`lib/auth.ts`):** Two mechanisms checked in order — HttpOnly cookie `imba_admin=true`, then `Authorization: Bearer <ADMIN_SECRET>` header. All `/api/admin/*` routes call `isAdminRequest(req)` before mutating data. Admin login sets the cookie via `POST /api/admin/login`.

**API conventions:** All routes are in `app/api/`. Admin mutation routes are under `app/api/admin/`. Public read routes (games, standings, stats, teams) are thin — they query Prisma and return JSON. Stats aggregation happens inside `app/api/stats/route.ts` by grouping `PlayerGameStat` records per player.

**Standings logic:** Computed on the fly in `app/api/standings/route.ts` by counting wins/losses from `Game` records filtered by season and league, then sorted by win percentage.

**Payments:** Stripe Checkout. `POST /api/stripe/checkout` creates a session; `POST /api/stripe/webhook` listens for `checkout.session.completed` and marks the `Registration` as paid.

**Logo uploads:** `POST /api/admin/upload-logo` streams the file to Vercel Blob and returns a URL stored on the `Team` record.

**Admin UI pages:** Live under `app/admin/`. They are plain client components that call the `/api/admin/*` endpoints directly — no server actions, no tRPC.
