# goBlink Merchant — Feature Roadmap

**Last updated:** 2026-02-28
**Status:** Phase A building

---

## Phase A: Foundation for Adoption ✅ BUILDING
*Get merchants onboarded and informed*

**A1. Onboarding Wizard** 🔨
- Post-signup guided flow: 4 tiers (Quick Start / BYOE / BYOW / Custom)
- Wallet/settlement config, business details, API key generation
- Redirect logic: force onboarding if not completed

**A2. Email Notifications (Resend)** 🔨
- Resend SDK, send from noreply@goblink.io
- 6 templates: welcome, payment received, payment failed, ticket reply, withdrawal complete, weekly summary
- Notification preferences (toggle per type in settings)
- Migration: notification_preferences JSONB on merchants

---

## Phase B: Email System Upgrade
*Branded comms, admin control*

**B1. Branded Email Verification**
- Disable Supabase default auth emails
- Custom verification flow via Resend with goBlink-branded template
- Confirmation link → Supabase verify endpoint

**B2. Admin-Editable Email Templates**
- `email_templates` table: type, subject, body_html, body_text, variables JSONB, updated_at
- Seed with all templates from Phase A
- Admin page `/admin/templates`: list, edit, live preview
- Variable insertion helper (click to insert {{business_name}}, {{amount}}, etc.)
- All email sends read from DB templates instead of hardcoded

**B3. Custom SMTP for Supabase Auth**
- Configure Resend as Supabase custom SMTP
- All auth emails (verification, password reset, magic link) go through Resend with our branding

---

## Phase C: Developer Experience
*Let developers actually integrate*

**C1. Test Mode**
- Wire up gb_test_ API keys with mock payment flow
- Test payments: create → auto-confirm after 5s (no real funds)
- Test webhook deliveries
- Dashboard: test vs live toggle/badge
- Test checkout page simulating full flow

**C2. Webhook Delivery Logs**
- Merchant page: /dashboard/webhooks
- All delivery attempts: event type, status code, response body, timestamp
- Expandable row for full payload
- Retry button for failed deliveries
- Filter by event type, status

---

## Phase D: Revenue Features
*New payment collection methods*

**D1. Invoicing**
- Create invoice: line items, recipient email, due date, memo, payment terms
- Auto-numbering (INV-001, INV-002...)
- Send via Resend with "Pay Now" button → payment link
- Status tracking: Draft → Sent → Viewed → Paid → Overdue
- Invoice detail page, PDF export
- Dashboard page: /dashboard/invoices

**D2. QR Codes + POS Mode**
- Payment links auto-generate QR code
- POS tab: enter amount + description → instant QR
- Full-screen QR display (tablet-friendly)
- Real-time confirmation sound/visual
- Print receipt option

---

## Phase E: Polish & Trust
*Make it feel premium*

**E1. Notification Center**
- Bell icon in dashboard header with unread count
- Dropdown: recent notifications (payments, tickets, webhooks, system)
- Supabase Realtime for live updates
- Click → navigate to relevant page
- Mark as read / mark all
- Migration: notifications table

**E2. Branded Checkout**
- /pay/[id] pulls merchant logo_url + brand_color
- Merchant business name prominent
- "Powered by goBlink" footer
- Preview in settings

---

## Phase F: Compliance & Security
*Enterprise readiness*

**F1. Activity/Audit Log**
- Log all sensitive actions: settings changes, API key ops, withdrawals, team changes
- Admin: view any merchant's audit log
- Merchant: /dashboard/activity
- Migration: audit_logs table

**F2. CSV/PDF Export**
- Transaction export: date range, format selector (CSV/PDF/JSON)
- Tax summary: revenue by period, fee totals, refund totals
- Branded PDF reports
- Download button on payments page + dedicated export page

---

## Phase G: Merchant SDK + Integration Kit
*Make integration a 60-second task for any developer*

**G1. `@goblink/merchant-sdk` npm package**
- `/core` — Node.js: `createPayment()`, `getPayment()`, `listPayments()`, `verifyWebhook()`
- `/react` — `<PayWithCrypto />`, `<InvoiceButton />`, `useGoBlink()` hook
- `/next` — Pre-wired Next.js App Router API route handlers (drop-in, zero config)
- `/express` — Middleware for webhook HMAC verification
- `/types` — Shared TypeScript types
- Published to npm as `@goblink/merchant-sdk`
- Test mode: `gb_test_` keys auto-confirm after 5s, webhooks fire normally

**G2. `npx create-goblink-app` CLI**
- Detects framework (Next.js, Express, Nuxt, plain Node)
- Prompts: API key, webhook URL, currency, return URL
- Generates: API routes, webhook handler, .env entries, example `<PayWithCrypto />` usage
- Full integration scaffolded in under 60 seconds

**G3. Integration Docs**
- Hosted at docs.goblink.io/merchant (or merchant.goblink.io/docs)
- Per-framework guides: Next.js, Express, plain Node
- Copy-paste API route + webhook handler examples
- Webhook event reference
- Test mode walkthrough

*Priority beta testers: Shade (Voidspace + GenerateIdeas.app) — both Next.js App Router + Supabase*

---

## Phase H: WooCommerce Plugin
*Largest e-commerce platform by install base*

**H1. Core Plugin**
- PHP, extends `WC_Payment_Gateway`
- Implements `process_payment()` — creates goBlink payment, redirects customer to `/pay/{id}`
- Return URL handling — confirms order on `payment.confirmed` webhook
- HPOS (High-Performance Order Storage) compatible
- Block checkout support (WooCommerce Blocks)
- Settings: API key, webhook secret, accepted tokens, test mode toggle

**H2. Webhook Handler**
- Listens for `payment.confirmed`, `payment.failed`, `payment.expired`
- Verifies HMAC-SHA256 signature
- Updates WooCommerce order status accordingly
- Auto-refund trigger on `refund.created`

**H3. Distribution**
- GPL-2.0 license (required for WordPress.org)
- Submit to WordPress.org plugin directory
- Direct download from goblink.io/woocommerce as fallback
- Separate repo: github.com/Urban-Blazer/goblink-woocommerce

---

## Phase I: On/Offramp Research & Integration
*Let merchants cash out to fiat. Let customers buy crypto to pay.*

**I1. Research Sprint (before building anything)**

Key providers to evaluate:

| Provider | Type | Coverage | Notes |
|---|---|---|---|
| **Onramper** | Aggregator (30+ providers) | 160+ countries | Single API → best rate routing. Already in PLAN.md as scaling play. Likely our primary choice. |
| **Transak** | Direct | 136 tokens, 64 countries | Simple widget integration. Good KYC handling. Popular with Web3 devs. |
| **MoonPay** | Direct | 160+ countries | One API for both on + offramp. Strong brand trust. Higher fees. |
| **Ramp Network** | Direct | 150+ countries | Low fees, good UX. No markup on rates (unlike MoonPay). |
| **Coinbase Onramp** | Direct | US-heavy | Free to integrate. ACH support. Best for US merchants cashing out. |
| **Shakepay** | Direct | Canada only | Best for CAD offramp. No API — manual withdrawal via Shakepay account. |
| **Stripe Crypto Offramp** | Direct | US only | Stripe integration for USDC → USD. Familiar to merchants already using Stripe. |
| **1Click (NEAR Intents)** | Cross-chain settlement | 26+ chains | Already integrated. Can route to exchange addresses for manual offramp. |

**Research questions to answer:**
- Which providers support Canadian merchants (FIPPA-adjacent, Shakepay partnership)?
- Onramper aggregator vs direct Transak — fee comparison at our volume tier
- KYC handled by provider or do we need to collect?
- Can we embed their widget inside our dashboard or do we redirect?
- Which support USDC on Base (our primary settlement token)?
- Stripe Crypto Offramp viability for merchants already on Stripe

**I2. Offramp Integration (merchant withdrawal)**
- Merchant hits "Withdraw" in dashboard → chooses provider → redirected to hosted widget
- Provider handles KYC, bank rails, FX conversion
- We receive webhook on completion, update withdrawal record
- v1: manual provider selection per merchant
- v2: Onramper aggregator (best rate auto-routing)

**I3. Onramp Integration (customer buy crypto to pay)**
- On checkout page (`/pay/[id]`): "Don't have crypto? Buy it here" button
- Opens Transak or Ramp widget → customer buys USDC → funds arrive at deposit address
- Seamless flow: buy → pay → done (no wallet required for customer)
- This is the **Web2 merchant unlock** — customers don't need existing crypto

*Decision: Research first (I1), then build I2 (offramp) before I3 (onramp). Merchants getting paid out matters more than customer onramp UX.*
