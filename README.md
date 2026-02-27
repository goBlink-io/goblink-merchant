# goBlink Merchant

Non-custodial crypto payment processing platform. Accept crypto from anyone. Get paid in anything.

**Dashboard:** [merchant.goblink.io](https://merchant.goblink.io)

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Radix UI
- **Database:** Supabase (Postgres + Auth + Realtime + RLS)
- **Deployment:** Vercel

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Supabase project ([supabase.com](https://supabase.com))

### 1. Clone and install

```bash
git clone <repo-url>
cd goblink-merchant
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon (public) key
- `SUPABASE_SERVICE_ROLE_KEY` — Your Supabase service role key (server-side only)

### 3. Run database migrations

Apply the migration in `supabase/migrations/00001_initial_schema.sql` to your Supabase project:

- **Option A:** Use the Supabase CLI: `supabase db push`
- **Option B:** Copy the SQL into the Supabase SQL Editor and run it

This creates all tables (merchants, payments, api_keys, refunds, invoices, offramp_configs, withdrawals, webhook_endpoints, webhook_deliveries), RLS policies, indexes, and triggers.

### 4. Configure Supabase Auth

In your Supabase dashboard:

1. **Email/Password:** Enabled by default
2. **Google OAuth:** Settings > Authentication > Providers > Google > Enable and add your OAuth credentials
3. **Redirect URLs:** Add `http://localhost:3000/auth/callback` to the allowed redirect URLs

### 5. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login + Signup pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── auth/callback/   # OAuth callback handler
│   ├── (dashboard)/         # Dashboard layout + pages
│   │   └── dashboard/
│   │       ├── page.tsx         # Overview
│   │       ├── payments/        # Payments list + detail
│   │       └── settings/        # Settings (profile, API keys, webhooks)
│   └── api/v1/              # Public API routes
│       ├── payments/        # CRUD + refund
│       ├── merchant/        # Profile + settings
│       └── webhooks/        # Register + list + delete
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── dashboard/           # Dashboard-specific components
├── lib/
│   ├── supabase/            # Supabase clients (browser, server, middleware)
│   ├── api-auth.ts          # API key validation
│   ├── api-response.ts      # Response helpers
│   ├── webhooks.ts          # Webhook dispatch (HMAC-SHA256, retry)
│   ├── service-client.ts    # Service role client
│   └── utils.ts             # Shared utilities
└── middleware.ts             # Auth middleware
```

## API Reference

All API routes require authentication via API key:

```
Authorization: Bearer gb_live_xxxxx
```

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payments` | Create a payment |
| GET | `/api/v1/payments` | List payments |
| GET | `/api/v1/payments/:id` | Get payment details |
| POST | `/api/v1/payments/:id/refund` | Initiate refund |

### Merchant

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/merchant` | Get merchant profile |
| PATCH | `/api/v1/merchant` | Update settings |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/webhooks` | Register webhook endpoint |
| GET | `/api/v1/webhooks` | List webhook endpoints |
| DELETE | `/api/v1/webhooks/:id` | Remove webhook endpoint |

### Webhook Events

Webhook payloads are signed with HMAC-SHA256. Verify using the `X-GoBlink-Signature` header.

Events: `payment.created`, `payment.processing`, `payment.confirmed`, `payment.failed`, `payment.refunded`, `payment.partially_refunded`

## API Key Format

- **Live keys:** `gb_live_` prefix — processes real payments
- **Test keys:** `gb_test_` prefix — simulated, no real funds

Keys are bcrypt-hashed. Only the prefix is stored for display.
