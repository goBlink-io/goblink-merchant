# goblink-merchant

## What This Is
goBlink Merchant — Non-custodial crypto payment processing platform.
Dashboard at merchant.goblink.io. Read PLAN.md for the full spec.

## Stack
- Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + Realtime + RLS)
- pnpm as package manager
- Deploy target: Vercel

## Build Rules
- Use App Router (app/ directory), NOT pages/
- TypeScript strict mode
- All DB access through Supabase client (no raw pg)
- RLS on every table — merchant_id scoped
- API routes in app/api/v1/
- Use server components by default, 'use client' only when needed
- Geist Sans + Geist Mono fonts (next/font/google)
- Brand colors: Blue #2563EB → Violet #7C3AED, zinc neutrals
- Dark mode by default (like consumer goBlink)
- NEVER use process.exit() — kills Vercel build worker
- No in-memory caches — use HTTP cache headers or Supabase

## Phase 1 Scope (BUILD THIS)
1. Project scaffold (Next.js + Tailwind + shadcn/ui + Supabase)
2. Supabase migration with ALL tables from PLAN.md Section 13 (merchants, payments, api_keys, refunds, invoices, offramp_configs, withdrawals, webhook_endpoints, webhook_deliveries) + RLS policies + indexes
3. Auth flow (Supabase Auth — email/password + Google OAuth) with middleware protection
4. Dashboard layout: sidebar nav, responsive, dark mode
5. Dashboard pages:
   - Home/Overview (balance card, today's revenue, recent payments, quick actions)
   - Payments list (filterable by status, date, search by order ID/tx hash)
   - Payment detail view (full info, status timeline)
   - Settings (business profile, payment preferences, API keys, webhook config)
6. API routes:
   - POST /api/v1/payments (create payment)
   - GET /api/v1/payments/:id (get payment)
   - GET /api/v1/payments (list payments)
   - POST /api/v1/payments/:id/refund (initiate refund — placeholder)
   - GET /api/v1/merchant (get merchant profile)
   - PATCH /api/v1/merchant (update settings)
   - POST /api/v1/webhooks (register webhook)
   - GET /api/v1/webhooks (list webhooks)
   - DELETE /api/v1/webhooks/:id (remove webhook)
7. API key generation (gb_live_ / gb_test_ prefixed, bcrypt hashed)
8. Webhook dispatch system (HMAC-SHA256 signed, with retry logic)
9. Middleware: API key auth for /api/v1/* routes, Supabase session auth for dashboard
10. Proper .env.example with all required vars
11. README.md with setup instructions

## What NOT to Build (Phase 2+)
- Smart wallet / ZeroDev integration
- Offramp / withdrawal flow
- Invoicing
- WooCommerce plugin (separate repo)
- Payment links / QR codes
- POS mode
- Team management
- Resend email integration
