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
