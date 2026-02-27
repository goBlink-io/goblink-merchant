# goBlink Merchant — Full Platform Plan

**Status:** DRAFT v2.0 — All decisions locked in  
**Date:** 2026-02-27  
**Codename:** goBlink Merchant  
**URL:** merchant.goblink.io  
**Tagline:** "Accept crypto from anyone. Get paid in anything."

---

## Table of Contents

1. [Vision](#1-vision)
2. [Architecture Overview](#2-architecture-overview)
3. [Smart Wallet System](#3-smart-wallet-system)
4. [Merchant Dashboard](#4-merchant-dashboard)
5. [Payment Collection Methods](#5-payment-collection-methods)
6. [Offramp & Withdrawal System](#6-offramp--withdrawal-system)
7. [Analytics & Reporting](#7-analytics--reporting)
8. [Tax & Compliance](#8-tax--compliance)
9. [Refund System](#9-refund-system)
10. [Supported Currencies & Tokens](#10-supported-currencies--tokens)
11. [Plugin Integrations](#11-plugin-integrations)
12. [API Design](#12-api-design)
13. [Data Model](#13-data-model)
14. [Security](#14-security)
15. [Build Phases](#15-build-phases)
16. [Competitive Positioning](#16-competitive-positioning)

---

## 1. Vision

goBlink Merchant is a non-custodial crypto payment processing platform. Merchants accept payments in any token on any chain. They control their own funds via a smart wallet. They withdraw to fiat via integrated offramps — or hold crypto. goBlink never touches the money.

**The Stripe of crypto, without the custody.**

### Core Principles
- **Non-custodial always.** Merchant owns keys. We own nothing.
- **Zero crypto knowledge required.** Merchant sees dollars, not wei.
- **One integration, every chain.** 26+ chains, 65+ tokens, one dashboard.
- **Fiat-first UX.** Prices in fiat, settlement in fiat (or crypto — merchant's choice).
- **Plugin ecosystem.** WooCommerce first, then Shopify, Magento, standalone.

### Revenue Model
| Source | Fee | Notes |
|--------|-----|-------|
| Payment processing | 0.05–0.35% | Tiered by volume (same as consumer goBlink) |
| Offramp facilitation | 0% markup | We route through 1Click; offramp provider charges their own fee |
| Premium features | $0 (for now) | Analytics, invoicing, etc. included free to drive adoption |
| White-label | TBD | Custom branding for enterprise — Phase 4+ |

---

## 2. Architecture Overview

```
                                    ┌─────────────────────────┐
                                    │   merchant.goblink.io   │
                                    │   (Next.js Dashboard)   │
                                    └────────────┬────────────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              │                  │                  │
                    ┌─────────▼──────┐  ┌───────▼────────┐  ┌─────▼──────────┐
                    │  goblink.io    │  │   Supabase     │  │  Smart Wallet  │
                    │  REST API      │  │   (Postgres)   │  │  Infrastructure│
                    │  (payments,    │  │   (merchants,  │  │  (Base L2)     │
                    │   quotes,      │  │    orders,     │  │                │
                    │   status)      │  │    analytics)  │  │                │
                    └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
                            │                   │                   │
                     ┌──────▼──────┐     ┌──────▼──────┐    ┌──────▼──────┐
                     │  1Click /   │     │  Supabase   │    │  ERC-4337   │
                     │  NEAR       │     │  Auth +     │    │  Account    │
                     │  Intents    │     │  Realtime   │    │  Abstraction│
                     └─────────────┘     └─────────────┘    └─────────────┘
```

### Stack (✅ All Locked In)
| Layer | Technology | Decision Notes |
|-------|-----------|----------------|
| Dashboard frontend | Next.js + TypeScript + Tailwind | Same stack as goblink.io |
| Auth | Supabase Auth (email/password + Google + passkey) | |
| Database | Supabase Postgres (RLS per merchant) | |
| API | Next.js API routes + Supabase Edge Functions | |
| Smart Wallets | **ZeroDev SDK** — ERC-4337 Kernel accounts on Base | Counterfactual deployment ($0 until first tx). Passkey signer, session keys, paymasters built in. ~$0.01-0.05/wallet when deployed. |
| Payments | goblink.io existing API (1Click protocol) | |
| Realtime | Supabase Realtime (live payment notifications) | |
| Email | **Resend** — from noreply@goblink.io / invoices@goblink.io | Free tier: 3,000/mo. Pro $20/mo at 50K. M365 stays for personal inbox (admin@goblink.io). |
| Forex | **Open Exchange Rates** — cached aggressively | Free tier: 1,000 req/mo. Paid $12/mo for real-time when needed. |
| Hosting | Vercel (dashboard) + Supabase (backend) | |
| Mobile | **PWA** (next-pwa) | Native app Phase 4+ if adoption demands it |

### Why Base as Default Smart Wallet Chain?
- Cheapest EVM L2 for deployment + transactions (~$0.001/tx)
- Native USDC (Circle-issued, not bridged — one of 30 chains with Circle-native USDC)
- Coinbase ecosystem = natural offramp path globally
- ZeroDev SDK fully supports Base
- goBlink already supports Base as a destination chain
- ERC-4337 EntryPoint deployed and active

### Chain Options (Custom Setup tier)
Base is the default. Custom Setup merchants can choose:

| Chain | Native USDC | ERC-4337 | Avg Tx Cost | Smart Wallet? |
|-------|------------|----------|-------------|---------------|
| **Base** (default) | ✅ | ✅ | ~$0.001 | ✅ ZeroDev |
| Arbitrum | ✅ | ✅ | ~$0.01 | ✅ ZeroDev |
| Optimism | ✅ | ✅ | ~$0.002 | ✅ ZeroDev |
| Polygon | ✅ | ✅ | ~$0.005 | ✅ ZeroDev |
| Ethereum | ✅ | ✅ | ~$0.50-5 | ✅ ZeroDev (expensive) |
| Solana | ✅ | ❌ | ~$0.001 | ❌ Deposit address only |
| NEAR | ✅ | ❌ | ~$0.001 | ❌ Deposit address only |
| Sui | ✅ | ❌ | ~$0.001 | ❌ Deposit address only |

EVM chains get full smart wallet. Non-EVM chains use standard deposit addresses.

---

## 3. Smart Wallet System & Onboarding Tiers

### Core Principle
**goBlink never has custody.** We are a software provider (like Uniswap). No KYC on our end. Exchanges handle their own compliance. Fully permissionless.

### Four Onboarding Tiers

```
How do you want to receive payments?

◉ Quick Start (Recommended)
  → goBlink Smart Wallet on Base. No crypto experience needed.
  → Passkey setup, 30 seconds, done.

○ Bring Your Own Exchange (BYOE)
  → Coinbase, Kraken, Shakepay, Newton, Binance...
  → Paste your deposit address. Payments arrive automatically.

○ Bring Your Own Wallet (BYOW)
  → MetaMask, Phantom, Sui Wallet, NEAR Wallet...
  → Connect or paste address. Any chain.

○ Custom Setup
  → Pick your chain, token, and wallet type.
  → For crypto-native merchants who know exactly what they want.
```

All four tiers use the same backend — just different `settlement_chain`, `settlement_token`, and `wallet_address` on the merchant record.

### Three Wallet Modes

| Mode | For Who | How It Works |
|------|---------|-------------|
| **goBlink Smart Wallet** | Merchants with no crypto experience | ZeroDev ERC-4337 wallet on Base, passkey-controlled. Funds accumulate, merchant withdraws when ready. |
| **Exchange Account (BYOE)** | Merchants with Coinbase/Kraken/etc. | Merchant enters exchange deposit address. Payments route directly there. Exchange handles offramp to fiat. |
| **Custom Wallet (BYOW/Custom)** | Crypto-native merchants | Merchant enters any wallet address on any chain. Full control, no intermediary. |

### BYOE — Supported Exchanges

| Exchange | Best Chain | Token | Countries |
|----------|-----------|-------|-----------|
| Coinbase | Base | USDC | US, CA, UK, EU, 100+ |
| Kraken | Arbitrum | USDC | US, CA, UK, EU, 100+ |
| Shakepay | Ethereum | ETH | CA |
| Newton | Polygon | USDC | CA |
| Robinhood | Base | USDC | US |
| Binance | Polygon | USDC/USDT | Global (varies) |
| Bybit | Arbitrum | USDC | Global |
| Crypto.com | Polygon | USDC | Global |
| Gemini | Ethereum | USDC | US, CA, UK, EU |

For each exchange, we store the optimal chain/token to minimize fees. Merchant just picks their exchange and pastes deposit address — we handle routing.

### Smart Wallet — Technical Details (Quick Start tier)

**Provider:** ZeroDev SDK (✅ Locked In)
- ERC-4337 Kernel smart accounts (audited, lightweight)
- Native passkey/WebAuthn signer
- Session keys built in (needed for auto-settlement)
- Gas sponsorship via paymasters (merchant pays $0 for wallet creation)
- TypeScript SDK — fits our stack
- ~30% less gas than Safe for deployment

**Counterfactual Deployment:** Wallet address is generated at signup but contract isn't deployed until first payment arrives. Creation cost = $0 until first real transaction.

**Cost per wallet:** ~$0.01-0.05 on Base (gas + ZeroDev overhead). Recouped on first payment's processing fee.

**ZeroDev Platform Cost:**
| Merchants | Wallet Creation | Monthly Platform |
|-----------|----------------|-----------------|
| 100 | $1-5 | ~$25-50/mo |
| 1,000 | $10-50 | ~$50-100/mo |
| 10,000 | $100-500 | ~$100-200/mo |

**Signup Flow (Quick Start):**
1. Merchant signs up at merchant.goblink.io (email + password)
2. Selects "Quick Start"
3. Prompted: "Set up your payment wallet" → taps fingerprint/Face ID
4. Behind the scenes: WebAuthn passkey created → used as owner of new ERC-4337 smart wallet on Base (counterfactual — not deployed yet)
5. Wallet address generated and stored
6. Merchant sees: "Your wallet is ready. Funds will arrive here automatically."

**Technical Flow:**
```
Passkey (WebAuthn) → P256 signature
      ↓
ZeroDev Kernel Smart Account (Base L2)
  - Owner: passkey public key
  - Modules: social recovery, spending limits, auto-settlement
      ↓
USDC arrives via goBlink (1Click)
      ↓
Merchant withdraws via dashboard (passkey confirmation)
```

**Key Components:**
- **ZeroDev SDK** for wallet deployment + UserOperations
- **Passkey signer** via WebAuthn (no private key management)
- **Social recovery module** — merchant can add backup email/phone to recover wallet if device is lost
- **Session keys** — scoped keys for auto-settlement (max amount per tx/day, pre-approved addresses only, revocable)
- **Spending limits** — optional daily/weekly withdrawal caps for security
- **Paymaster** — goBlink sponsors gas for wallet creation and first few transactions

### Wallet Features
| Feature | Description |
|---------|-------------|
| Passkey-controlled | Face ID / fingerprint / Windows Hello — no seed phrase |
| Social recovery | Backup via email + trusted contact |
| Multi-device | Add passkeys from multiple devices |
| USDC settlement | All payments settle to USDC on Base by default |
| Custom settlement | Merchant can choose to receive in any supported token/chain |
| Balance display | Shows balance in fiat (USD/CAD/EUR) prominently, crypto amount secondary |
| Auto-sweep | Optional: auto-withdraw to offramp when balance exceeds threshold |

### Advanced: Multi-Chain Wallet (Phase 3+)
For merchants who want to receive on specific chains (e.g., SOL on Solana), we can generate chain-native wallets. But v1 routes everything through the Base smart wallet via goBlink cross-chain transfers. Keeps it simple.

---

## 4. Merchant Dashboard

### 4.1 Onboarding Flow

```
Step 1: Sign Up
  → Email + password (or Google OAuth)
  → Business name, country, store currency (USD/CAD/EUR/etc.)

Step 2: Choose Wallet Setup
  → ◉ Quick Start (Recommended)
      → Tap fingerprint/Face ID → passkey created
      → Smart wallet address generated (counterfactual — deployed on first payment)
      → "Your wallet is ready."
  → ○ Bring Your Own Exchange (BYOE)
      → Select exchange (Coinbase, Kraken, Shakepay, Newton...)
      → Paste deposit address
      → We auto-detect optimal chain/token for that exchange
  → ○ Bring Your Own Wallet (BYOW)
      → Connect MetaMask/Phantom/etc. or paste address
      → We detect chain from address format
  → ○ Custom Setup
      → Pick chain, token, wallet type manually

Step 3: Connect Store (optional)
  → "Install our WooCommerce plugin" (with API key)
  → Or "Use payment links" (no store needed)
  → Or "Use invoicing" (no store needed)

Step 4: Done
  → Dashboard opens
  → First payment guide shown
  → Settlement configured automatically based on Step 2
```

### 4.2 Dashboard Pages

#### Home (Overview)
- **Balance card** — Current wallet balance in fiat (e.g., "$1,234.56 USD") with crypto amount below
- **Today's revenue** — Sum of confirmed payments today
- **Pending payments** — Payments in progress (awaiting confirmation)
- **Quick actions** — "Create Invoice", "Generate Payment Link", "Withdraw Funds"
- **Recent payments** — Last 10 transactions with status badges
- **Revenue chart** — 7-day / 30-day / 90-day line chart
- **Live indicator** — Real-time dot showing "Store connected" or "Awaiting first payment"

#### Payments
- **Filterable list** — Status (all/pending/confirmed/failed/refunded), date range, amount range, token, chain, customer, order ID
- **Search** — By order ID, customer wallet, tx hash, payment ID
- **Bulk actions** — Export selected, mark as reviewed
- **Click into payment →**
  - Full details: timestamps, chains, tokens, amounts (fiat + crypto), tx hashes with explorer links
  - Customer info: wallet address, source chain/token
  - Order info: WooCommerce order ID (if connected), items, shipping
  - Actions: Full refund, Partial refund, Add note
  - Status timeline: Created → Customer paid → Processing → Confirmed → Settled

#### Invoicing
- **Create invoice** — Recipient email, line items (description + amount), due date, memo, currency
- **Invoice templates** — Save recurring invoice templates
- **Auto-numbering** — INV-001, INV-002, etc.
- **Email delivery** — Sends professional invoice email with "Pay Now" button → payment link
- **Status tracking** — Draft / Sent / Viewed / Paid / Overdue / Cancelled
- **Recurring invoices** (Phase 3) — Monthly/weekly auto-send
- **PDF export** — Download any invoice as branded PDF

#### Payment Links
- **Generate link** — Amount, token, chain, memo, expiry
- **QR code** — Auto-generated for each link (POS use case)
- **Link management** — Active / Expired / Used list
- **Bulk create** — CSV upload for batch link generation
- **Shortened URLs** — goblink.io/pay/{id}

#### Balances & Wallet
- **Current balance** — Fiat display prominent, crypto breakdown below
- **Balance history** — Chart showing balance over time
- **Transaction log** — Every in/out with timestamps
- **Wallet address** — Copy button, QR code
- **Receive manually** — QR + address for direct deposits
- **Withdraw button** → Withdrawal flow (see Section 6)

#### Analytics (see Section 7)

#### Tax & Reports (see Section 8)

#### Settings
- **Business profile** — Name, logo, country, timezone, currency
- **Payment preferences** —
  - Settlement token (USDC default, or any supported token)
  - Settlement chain (Base default, or any supported chain)
  - Accepted tokens (all by default, or whitelist specific tokens)
  - Minimum payment amount
  - Payment confirmation threshold (1 confirmation default)
- **Offramp configuration** — Provider, deposit address, auto-sweep settings
- **Notifications** —
  - Email alerts: payment received, payment failed, refund issued, withdrawal complete
  - Webhook URL: POST to merchant's server on status changes
  - Realtime: dashboard push notifications
- **Branding** —
  - Logo upload (shown on hosted checkout page + invoices)
  - Brand color (accent color for hosted pages)
  - Custom "Thank you" message
- **Security** —
  - Passkey management (add/remove devices)
  - Social recovery contacts
  - Spending limits / withdrawal limits
  - IP allowlist for API access
  - 2FA for sensitive actions (withdrawal, settings changes)
- **API** —
  - API key generation (live + test)
  - Webhook secret
  - API usage / rate limit stats
- **Team** (Phase 3) —
  - Invite team members by email
  - Roles: Owner, Admin, Viewer
  - Activity log per team member
- **Integrations** —
  - WooCommerce: API key + installation guide
  - Shopify: App install link (Phase 2)
  - Zapier: Webhook triggers (Phase 3)

---

## 5. Payment Collection Methods

### 5.1 Plugin Checkout (WooCommerce, Shopify)

Customer flow:
1. Customer checks out → selects "Pay with Crypto (goBlink)"
2. Redirected to `goblink.io/pay/{id}?return_url={merchant_site}`
3. Picks source chain/token, connects wallet, signs tx
4. Redirected back to merchant store with order confirmed
5. Merchant receives USDC (or configured token) in their smart wallet

Technical flow:
```
WooCommerce → POST /api/merchant/payments/create
  Body: { merchantId, apiKey, amount, currency, orderId, returnUrl, metadata }
  Response: { paymentId, paymentUrl, depositAddress }

→ Redirect customer to paymentUrl

→ Customer pays (handled by goblink.io)

→ Webhook POST to merchant's server:
  { event: "payment.confirmed", paymentId, orderId, amount, txHash, ... }

→ WooCommerce marks order as paid
```

### 5.2 Payment Links

For businesses without an online store — freelancers, service providers, in-person sales.
- Created from dashboard or API
- Shareable URL + QR code
- Pre-filled or open amount
- Expiry configurable (1 hour to 30 days)

### 5.3 Invoicing

Full invoice lifecycle:
```
Create Invoice → Send Email → Customer Views → Customer Pays → Invoice Marked Paid
                                    ↓
                            Payment Link Embedded
                            in Invoice Email/Page
```

Invoice fields:
- Recipient: name, email, company (optional)
- Line items: description, quantity, unit price, tax rate
- Subtotal, tax, total
- Due date
- Memo / notes
- Payment terms (Net 15, Net 30, Due on receipt)
- Currency (USD, CAD, EUR, GBP, etc.)

Invoice page (hosted at `goblink.io/invoice/{id}`):
- Professional, branded with merchant's logo + colors
- Shows line items, total, due date
- "Pay Now" button → opens goBlink payment flow
- Status: Paid / Unpaid / Overdue
- PDF download

### 5.4 POS Mode (Point of Sale)

For physical retail / in-person services:
- Dashboard has a "POS" tab — enter amount, optional description
- Generates QR code instantly
- Customer scans with any wallet app, or opens on phone
- Real-time confirmation sound/visual when payment confirms
- Receipt auto-generated (email to customer if captured)
- Works on tablet or phone browser — no app needed

### 5.5 Embeddable Widget

Existing `goblink.io/embed` iframe for custom websites:
- Pre-configured with merchant's wallet + preferred settlement
- Drops into any HTML page
- postMessage callbacks for payment events

### 5.6 API-Only (Headless)

For developers building custom checkout:
- Full REST API with API key auth
- Create payment → get deposit address → poll or webhook for status
- SDK available in JS/TS (@goblink/sdk)
- Webhook events for all state transitions

### 5.7 Telegram Bot Payments

Existing @goBlinkBot extended for merchants:
- Merchant generates payment request in bot → sends to customer
- Customer pays in-chat
- Merchant notified in dashboard

### 5.8 Email Payment Requests

- Merchant enters customer email + amount in dashboard
- Professional email sent with "Pay Now" button
- One-click payment flow
- Lighter than full invoice (no line items)

---

## 6. Offramp & Withdrawal System

### 6.1 The Flow

```
Merchant clicks "Withdraw" in dashboard
        ↓
Select amount (all / custom amount)
        ↓
Select destination:
  ├─ External crypto wallet (any chain/token)
  ├─ Offramp provider (→ fiat to bank)
  └─ Another goBlink merchant (internal transfer)
        ↓
Confirm with passkey (Face ID / fingerprint)
        ↓
goBlink executes:
  1. Transfers USDC from merchant's Base wallet
  2. Routes through 1Click to destination chain/token
  3. Delivers to offramp provider's deposit address
        ↓
Merchant sees fiat in bank account (offramp timing varies)
```

### 6.2 Offramp Provider Registry

We maintain a registry of supported offramp providers per country. Each entry defines:
```json
{
  "provider": "shakepay",
  "country": "CA",
  "currency": "CAD",
  "acceptsChain": "ethereum",
  "acceptsToken": "ETH",
  "depositType": "address",
  "estimatedTime": "1-2 business days",
  "kycRequired": true,
  "website": "https://shakepay.com",
  "setupInstructions": "1. Create Shakepay account\n2. Complete KYC\n3. Copy your ETH deposit address\n4. Paste in goBlink settings"
}
```

### 6.3 Supported Offramp Providers (Launch)

| Country | Provider | Receives | Pays Out | Est. Time |
|---------|----------|----------|----------|-----------|
| 🇨🇦 Canada | Shakepay | ETH on Ethereum | CAD (e-Transfer) | 1-2 days |
| 🇨🇦 Canada | Newton | USDC on multiple | CAD (e-Transfer) | 1-2 days |
| 🇨🇦 Canada | Coinbase | USDC on Base | CAD (bank wire) | 2-3 days |
| 🇺🇸 USA | Coinbase | USDC on Base | USD (ACH) | 1-3 days |
| 🇺🇸 USA | Kraken | USDC on multiple | USD (ACH/wire) | 1-3 days |
| 🇺🇸 USA | Robinhood | USDC on Ethereum | USD (bank) | 1-2 days |
| 🇬🇧 UK | Coinbase | USDC on Base | GBP (Faster Payments) | 1-2 days |
| 🇪🇺 EU | Coinbase | USDC on Base | EUR (SEPA) | 1-2 days |
| 🇪🇺 EU | Kraken | USDC on multiple | EUR (SEPA) | 1-3 days |
| 🌍 Global | MoonPay (offramp API) | Various | Local bank | 2-5 days |
| 🌍 Global | Transak (offramp API) | Various | Local bank | 2-5 days |

### 6.4 Aggregated Offramp (Phase 2+)

Instead of individual provider integrations, use **Onramper's Offramper** product:
- Single API integration → access to 30+ offramp providers
- Best price routing across providers
- Global coverage (160+ countries)
- KYC handled by offramp providers (not us)
- Widget embeddable in our dashboard

This is the scaling play. Manual provider entries for v1, Onramper for v2+.

### 6.5 Withdrawal to Custom Wallet

Not every withdrawal is to fiat. Merchant can also:
- Send to any external wallet on any supported chain
- Choose destination token (USDC on Base → SOL on Solana, etc.)
- Same goBlink cross-chain routing used for payments
- Use case: merchant wants to hold ETH, or pay their own suppliers in crypto

### 6.6 Auto-Settlement

Optional feature: auto-withdraw when balance exceeds threshold.

```
Settings:
  Auto-settle: ON
  Threshold: $500
  Destination: Shakepay (ETH on Ethereum)
  
→ When wallet balance > $500 → auto-initiate withdrawal
→ Merchant gets email: "Auto-settlement: $523.40 sent to Shakepay"
```

Requires merchant to grant a **session key** to the goBlink contract for auto-withdrawal. Session key has:
- Maximum amount per tx
- Maximum amount per day
- Can only send to pre-approved addresses
- Revocable anytime from dashboard

---

## 7. Analytics & Reporting

### 7.1 Analytics Dashboard

**Overview Cards:**
- Total revenue (all time / period)
- Revenue today
- Number of payments (total / period)
- Average payment size
- Conversion rate (payments initiated vs. completed)
- Top source chain (where customers are paying from)

**Charts:**
- **Revenue over time** — Line chart, daily/weekly/monthly granularity, compare periods
- **Payments by status** — Pie chart (confirmed / pending / failed / refunded)
- **Revenue by chain** — Bar chart showing which chains drive the most volume
- **Revenue by token** — What tokens are customers paying with?
- **Customer geography** — Not IP-based (privacy), but chain preference as proxy
- **Hourly heatmap** — When do payments come in? (helps POS merchants with staffing)

**Tables:**
- **Top customers** — By wallet address, total spend, number of transactions
- **Payment funnel** — Created → Deposited → Confirmed → Settled (with drop-off %)
- **Failed payments** — Why they failed (expired, underpaid, chain error)

### 7.2 Real-Time Dashboard

- Live payment feed (WebSocket via Supabase Realtime)
- Sound notification on new payment (configurable)
- Desktop push notification (browser Notification API)
- "Open for business" status indicator

---

## 8. Tax & Compliance

### 8.1 Transaction Export

Downloadable reports in multiple formats:

**CSV Export (primary):**
```csv
Date,Order ID,Payment ID,Amount (Fiat),Currency,Amount (Crypto),Token,Chain,TX Hash,Fee,Fee (Fiat),Status,Customer Wallet,Refund Amount,Refund Date
2026-03-15,WC-1234,pay_abc123,49.99,USD,49.99,USDC,base,0xabc...,0.17,0.17,confirmed,0x742d...,0,
2026-03-15,INV-005,pay_def456,150.00,USD,0.0612,ETH,ethereum,0xdef...,0.53,0.53,confirmed,0x891f...,50.00,2026-03-18
```

**PDF Report:**
- Branded header with merchant logo + business name
- Summary: total revenue, total fees, net revenue, number of transactions
- Detailed table of all transactions
- Signature line for accountant

**Formats available:**
- CSV (QuickBooks, Xero, Wave compatible)
- PDF (print-ready)
- JSON (developer/API use)
- QBO (QuickBooks Online direct import — Phase 3)

### 8.2 Tax Summary

Auto-generated summaries:

- **Revenue by period** — Monthly and annual totals
- **Revenue by currency** — Breakdown by fiat currency (USD, CAD, EUR)
- **Fee summary** — Total fees paid, deductible as business expense
- **Cost basis report** — For merchants holding crypto: acquisition price vs. current value
- **Capital gains helper** — If merchant received ETH at $3,200 and it's now $3,500, show unrealized gain
- **Refund summary** — Total refunds issued, net revenue after refunds

### 8.3 Jurisdiction Awareness

- Merchant sets their country in settings
- Tax export formatted for that jurisdiction's requirements
- Canada: GST/HST tracking, CRA-compatible format
- USA: 1099-K thresholds awareness, IRS-compatible
- EU: VAT handling support
- We display guidance, not tax advice ("Consult your accountant")

### 8.4 Accounting Integrations (Phase 3)

- **QuickBooks Online** — Auto-sync payments as income entries
- **Xero** — Same
- **Zapier** — "When payment confirmed → Create row in Google Sheet"

---

## 9. Refund System

### 9.1 How Refunds Work

Refund = reverse goBlink transfer from merchant's wallet back to customer's wallet.

```
Merchant clicks "Refund" on a payment
        ↓
Enter amount (full order amount pre-filled, or custom for partial)
        ↓
Confirm with passkey
        ↓
goBlink executes:
  1. Deducts USDC from merchant's smart wallet
  2. Routes through 1Click to customer's original chain/token
  3. Delivers to customer's wallet address (captured during payment)
        ↓
Payment status → "Refunded" or "Partially Refunded"
Order status → "Refunded" in WooCommerce (via webhook)
```

### 9.2 Refund Details

| Aspect | Handling |
|--------|----------|
| Full refund | Original fiat amount converted to customer's original token at current rate |
| Partial refund | Merchant enters fiat amount; converted at current rate |
| Refund fee | Merchant absorbs the goBlink transfer fee (0.05–0.35%) |
| Customer wallet | Automatically captured during initial payment — no manual entry needed |
| Cross-chain | Customer paid with SOL on Solana? Refund goes back as SOL on Solana |
| Time limit | No limit (merchant's discretion) — but warn after 30 days that rates may have changed significantly |
| Price difference | Refund is denominated in fiat. If customer paid 0.03 ETH ($100) and ETH dropped, refund is still $100 worth of ETH (0.035 ETH). Merchant takes the price risk on stablecoins; customer takes it on volatile tokens. |
| Multiple partial refunds | Supported. Total refunds cannot exceed original payment amount. |
| Refund to different wallet | Not supported v1. Refund goes to original payment wallet only. |

### 9.3 Refund in WooCommerce

When a merchant clicks "Refund" in the WooCommerce admin:
1. WooCommerce calls our gateway's `process_refund()` method
2. Plugin calls `POST /api/merchant/refunds/create` with payment ID + amount
3. Merchant approves via passkey (redirect or popup)
4. Refund executes via goBlink
5. WooCommerce order updated to "Refunded" / "Partially Refunded"
6. Order notes updated with refund tx hash

---

## 10. Supported Currencies & Tokens

### 10.1 Fiat Currencies (Store Pricing)

Merchants price goods in fiat. We support the most common WooCommerce store currencies:

| Currency | Code | Symbol | Notes |
|----------|------|--------|-------|
| US Dollar | USD | $ | Default |
| Canadian Dollar | CAD | C$ | |
| Euro | EUR | € | |
| British Pound | GBP | £ | |
| Australian Dollar | AUD | A$ | |
| Japanese Yen | JPY | ¥ | |
| Swiss Franc | CHF | Fr | |
| Swedish Krona | SEK | kr | |
| Norwegian Krone | NOK | kr | |
| Danish Krone | DKK | kr | |
| New Zealand Dollar | NZD | NZ$ | |
| Singapore Dollar | SGD | S$ | |
| Hong Kong Dollar | HKD | HK$ | |
| South Korean Won | KRW | ₩ | |
| Mexican Peso | MXN | $ | |
| Brazilian Real | BRL | R$ | |
| Indian Rupee | INR | ₹ | |
| Turkish Lira | TRY | ₺ | |
| Polish Zloty | PLN | zł | |
| South African Rand | ZAR | R | |

### 10.2 Crypto Tokens (Payment)

All 65+ tokens currently supported by goBlink. Customer can pay with **any** of them. The 1Click protocol handles the conversion.

**Settlement always hits the merchant's wallet as their configured token** (default USDC on Base).

**Flow:**
```
Customer pays 0.5 SOL on Solana ($100)
        ↓
1Click converts SOL → USDC cross-chain
        ↓  
Merchant receives 99.65 USDC on Base ($99.65)
  (0.35% goBlink fee deducted)
        ↓
Merchant sees: "+$99.65 from Order #1234"
```

### 10.3 Price Feed

For non-stablecoin to fiat conversion, we need real-time prices.

**Source:** goBlink's existing `/api/tokens/prices` endpoint (DexScreener-based).

**At checkout:**
1. WooCommerce sends order total in fiat (e.g., $49.99 USD)
2. goBlink knows the merchant receives USDC (1:1 with USD)
3. Amount requested = $49.99 USDC
4. Customer picks their source token → 1Click quotes the exact amount needed
5. Customer signs for that exact amount
6. Merchant receives $49.99 USDC (minus fee)

**For non-USD stores:**
1. Store total is €42.50 EUR
2. goBlink converts EUR → USD using forex rate (CoinGecko or ExchangeRate API)
3. Requests $46.75 USDC equivalent
4. Merchant receives USDC; offramp converts to EUR

---

## 11. Plugin Integrations

### 11.1 WooCommerce Plugin

**File:** `goblink-for-woocommerce.php`  
**WordPress.org slug:** `goblink-for-woocommerce`  
**License:** GPL-2.0-or-later

#### Structure
```
goblink-for-woocommerce/
├── goblink-for-woocommerce.php          # Bootstrap + headers
├── readme.txt                            # WordPress.org listing
├── uninstall.php                         # Cleanup
├── assets/
│   ├── js/
│   │   └── goblink-blocks.js            # Block checkout integration
│   ├── css/
│   │   └── goblink-checkout.css         # Minimal checkout styles
│   ├── images/
│   │   ├── goblink-icon.svg             # Checkout icon
│   │   ├── icon-128x128.png             # WP.org icon
│   │   └── banner-772x250.png           # WP.org banner
├── includes/
│   ├── class-goblink-gateway.php        # WC_Payment_Gateway subclass
│   ├── class-goblink-blocks.php         # Block checkout registration
│   ├── class-goblink-api-client.php     # HTTP client for merchant API
│   ├── class-goblink-webhook.php        # Incoming webhook handler
│   ├── class-goblink-status-checker.php # WP-Cron polling fallback
│   └── class-goblink-refund.php         # Refund processing
├── templates/
│   └── checkout-description.php         # Payment method description
└── languages/
    └── goblink-for-woocommerce.pot      # i18n
```

#### Settings
| Field | Type | Default |
|-------|------|---------|
| Enable/Disable | checkbox | yes |
| Title | text | "Pay with Crypto" |
| Description | textarea | "Pay with any cryptocurrency on 26+ blockchains." |
| API Key | password | — (generated from merchant.goblink.io) |
| Order Status After Payment | select | "Processing" |
| Debug Logging | checkbox | no |

That's it. **6 fields.** Everything else (wallet, settlement, branding) is configured in the merchant dashboard. The plugin is just a thin bridge.

#### Block-Based Checkout Support

WooCommerce is migrating to block-based checkout (Gutenberg). We support both:

**Classic checkout:** Standard `WC_Payment_Gateway` → `process_payment()` → redirect.

**Block checkout:** Register via `Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType`:
- Server-side: `class-goblink-blocks.php` registers the payment method
- Client-side: `goblink-blocks.js` renders the payment option in the block editor
- Both use the same `process_payment()` backend

#### HPOS Compatible
All order data accessed via `$order->get_meta()` / `$order->update_meta_data()`. No `update_post_meta()` calls. Declared compatible via:
```php
add_action('before_woocommerce_init', function() {
    if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});
```

### 11.2 Shopify App (Phase 2)

- Shopify Payments extension or custom payment app
- Same merchant API backend
- OAuth for Shopify store connection
- Webhook-driven order updates

### 11.3 Magento Extension (Phase 3)

### 11.4 Standalone Checkout (No Plugin)

For custom sites — just use the API:
```bash
curl -X POST https://merchant.goblink.io/api/v1/payments \
  -H "Authorization: Bearer gb_live_abc123" \
  -d '{"amount": "49.99", "currency": "USD", "orderId": "ORD-1234", "returnUrl": "https://mysite.com/thanks"}'
```

---

## 12. API Design

### 12.1 Authentication

```
Authorization: Bearer gb_live_{api_key}
```

Two key types:
- `gb_live_*` — Production (real payments)
- `gb_test_*` — Test mode (simulated payments, no real funds)

### 12.2 Endpoints

**Payments:**
```
POST   /api/v1/payments              # Create a payment
GET    /api/v1/payments/:id          # Get payment details
GET    /api/v1/payments              # List payments (filterable)
POST   /api/v1/payments/:id/refund   # Initiate refund
```

**Invoices:**
```
POST   /api/v1/invoices              # Create invoice
GET    /api/v1/invoices/:id          # Get invoice
GET    /api/v1/invoices              # List invoices
PATCH  /api/v1/invoices/:id          # Update invoice (draft only)
POST   /api/v1/invoices/:id/send     # Send invoice email
DELETE /api/v1/invoices/:id          # Cancel invoice
```

**Wallet:**
```
GET    /api/v1/wallet/balance        # Current balance
GET    /api/v1/wallet/transactions   # Transaction history
POST   /api/v1/wallet/withdraw       # Initiate withdrawal (requires passkey)
```

**Webhooks:**
```
POST   /api/v1/webhooks              # Register webhook URL
GET    /api/v1/webhooks              # List registered webhooks
DELETE /api/v1/webhooks/:id          # Remove webhook
```

**Merchant:**
```
GET    /api/v1/merchant              # Get merchant profile
PATCH  /api/v1/merchant              # Update merchant settings
GET    /api/v1/merchant/analytics    # Analytics summary
GET    /api/v1/merchant/export       # Export transactions (CSV/PDF/JSON)
```

### 12.3 Webhook Events

```json
{
  "event": "payment.confirmed",
  "paymentId": "pay_abc123",
  "merchantId": "mer_xyz",
  "timestamp": "2026-03-15T14:30:00Z",
  "data": {
    "amount": "49.99",
    "currency": "USD",
    "cryptoAmount": "49.99",
    "cryptoToken": "USDC",
    "cryptoChain": "base",
    "orderId": "WC-1234",
    "txHash": "0xabc...",
    "customerWallet": "0x742d...",
    "customerChain": "solana",
    "fee": "0.17",
    "netAmount": "49.82"
  }
}
```

**Event types:**
| Event | Trigger |
|-------|---------|
| `payment.created` | Payment initiated |
| `payment.processing` | Customer deposited, awaiting confirmation |
| `payment.confirmed` | Payment confirmed on-chain, funds in wallet |
| `payment.failed` | Payment failed or expired |
| `payment.refunded` | Full refund completed |
| `payment.partially_refunded` | Partial refund completed |
| `invoice.paid` | Invoice payment received |
| `invoice.overdue` | Invoice past due date |
| `withdrawal.completed` | Withdrawal to offramp/external wallet complete |
| `withdrawal.failed` | Withdrawal failed |

### 12.4 Webhook Security

- **Signature verification:** Each webhook includes `X-GoBlink-Signature` header
- HMAC-SHA256 of request body using merchant's webhook secret
- Replay protection: `X-GoBlink-Timestamp` header, reject if > 5 min old
- Retry: 3 attempts with exponential backoff (1s, 10s, 60s)

---

## 13. Data Model

### 13.1 Supabase Tables

```sql
-- Merchants
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  business_name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  logo_url TEXT,
  brand_color TEXT DEFAULT '#2563EB',
  wallet_address TEXT,  -- Smart wallet address on Base
  settlement_token TEXT NOT NULL DEFAULT 'USDC',
  settlement_chain TEXT NOT NULL DEFAULT 'base',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  key_hash TEXT NOT NULL,  -- bcrypt hash of API key
  key_prefix TEXT NOT NULL, -- "gb_live_" or "gb_test_" + first 8 chars for display
  label TEXT DEFAULT 'Default',
  is_test BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  external_order_id TEXT,  -- WooCommerce/Shopify order ID
  amount NUMERIC(18,2) NOT NULL,  -- Fiat amount
  currency TEXT NOT NULL DEFAULT 'USD',
  crypto_amount TEXT,  -- Crypto amount received
  crypto_token TEXT,   -- Token received
  crypto_chain TEXT,   -- Chain received on
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | processing | confirmed | failed | expired | refunded | partially_refunded
  payment_url TEXT,
  deposit_address TEXT,
  customer_wallet TEXT,
  customer_chain TEXT,
  customer_token TEXT,
  send_tx_hash TEXT,
  fulfillment_tx_hash TEXT,
  fee_amount NUMERIC(18,6),
  fee_currency TEXT,
  net_amount NUMERIC(18,2),
  return_url TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refunds
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) NOT NULL,
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,  -- Fiat amount refunded
  currency TEXT NOT NULL,
  crypto_amount TEXT,
  crypto_token TEXT,
  crypto_chain TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | processing | completed | failed
  tx_hash TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  invoice_number TEXT NOT NULL,  -- Auto-generated: INV-001
  recipient_name TEXT,
  recipient_email TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
    -- [{ description, quantity, unit_price, tax_rate }]
  subtotal NUMERIC(18,2) NOT NULL,
  tax_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft',
    -- draft | sent | viewed | paid | overdue | cancelled
  due_date DATE,
  memo TEXT,
  payment_terms TEXT,  -- 'due_on_receipt', 'net_15', 'net_30'
  payment_id UUID REFERENCES payments(id),  -- linked when paid
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Offramp Configurations
CREATE TABLE offramp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  provider TEXT NOT NULL,  -- 'shakepay', 'coinbase', 'kraken', etc.
  deposit_address TEXT NOT NULL,
  deposit_chain TEXT NOT NULL,
  deposit_token TEXT NOT NULL,
  label TEXT,  -- "My Shakepay"
  is_default BOOLEAN DEFAULT false,
  auto_settle BOOLEAN DEFAULT false,
  auto_settle_threshold NUMERIC(18,2),  -- USD amount
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Withdrawals
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  offramp_config_id UUID REFERENCES offramp_configs(id),
  amount NUMERIC(18,2) NOT NULL,  -- Fiat equivalent
  crypto_amount TEXT NOT NULL,
  source_token TEXT NOT NULL DEFAULT 'USDC',
  source_chain TEXT NOT NULL DEFAULT 'base',
  destination_address TEXT NOT NULL,
  destination_token TEXT NOT NULL,
  destination_chain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | processing | completed | failed
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook Endpoints
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,  -- For HMAC signing
  events TEXT[] NOT NULL DEFAULT ARRAY['payment.confirmed'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook Deliveries (for debugging)
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id UUID REFERENCES webhook_endpoints(id) NOT NULL,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Every table has merchant_id-based row level security
```

### 13.2 Indexes
```sql
CREATE INDEX idx_payments_merchant_status ON payments(merchant_id, status);
CREATE INDEX idx_payments_merchant_created ON payments(merchant_id, created_at DESC);
CREATE INDEX idx_payments_external_order ON payments(merchant_id, external_order_id);
CREATE INDEX idx_payments_deposit_address ON payments(deposit_address);
CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_invoices_merchant_status ON invoices(merchant_id, status);
CREATE INDEX idx_withdrawals_merchant ON withdrawals(merchant_id, created_at DESC);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

---

## 14. Security

### 14.1 Non-Custodial Architecture

- goBlink never holds private keys
- Merchant's smart wallet is controlled by their passkey
- Session keys (for auto-settlement) are scoped and revocable
- All withdrawals require passkey confirmation (except auto-settle within limits)

### 14.2 API Security

- API keys hashed with bcrypt (only prefix stored for display)
- Rate limiting: 100 req/min per API key
- IP allowlist (optional, configurable per merchant)
- All endpoints over HTTPS
- CORS restricted to merchant's configured domains

### 14.3 Webhook Security

- HMAC-SHA256 signature verification
- Timestamp validation (reject > 5 min old)
- Unique event IDs for idempotency
- TLS-only delivery

### 14.4 Dashboard Security

- Supabase Auth with email verification
- Optional 2FA (TOTP) for sensitive actions
- Passkey for wallet operations (hardware-bound, phishing-resistant)
- Session management: 30-day refresh tokens, 1-hour access tokens
- RLS on all database tables (merchant can only see their own data)
- CSP headers hardened
- Audit log for sensitive actions (settings changes, withdrawals, team changes)

### 14.5 Smart Wallet Security

- ERC-4337 with P256 (WebAuthn) signature verification
- Social recovery via time-locked guardian system
- Spending limits configurable per session key
- Auto-settle session keys scoped to pre-approved addresses only
- Wallet upgradeable but requires passkey + time delay

---

## 15. Build Phases

### Phase 1: Foundation (3-4 weeks)
**Goal:** Merchant can sign up, receive payments via WooCommerce, and see them in a dashboard.

| Week | Deliverables |
|------|-------------|
| Week 1 | Merchant auth (Supabase), dashboard shell, API key generation, DB schema |
| Week 2 | Payment creation API, webhook system, payment status tracking, merchant dashboard (home + payments list) |
| Week 3 | WooCommerce plugin (redirect mode, block checkout, HPOS compatible), return URL on /pay/{id}, payment detail view |
| Week 4 | Settings page, basic analytics (revenue chart, payment counts), testing on staging WooCommerce store |

**What's NOT in Phase 1:**
- Smart wallet (merchants use their existing wallet address)
- Offramp
- Invoicing
- Refunds
- Tax export
- Multi-currency beyond USD

### Phase 2: Smart Wallet + Refunds + Multi-Currency (3-4 weeks)
**Goal:** Non-crypto merchants can onboard. Refunds work. International stores supported.

| Week | Deliverables |
|------|-------------|
| Week 5 | Smart wallet deployment (ERC-4337 on Base), passkey integration, wallet balance display |
| Week 6 | Refund flow (full + partial), WooCommerce refund integration, refund from dashboard |
| Week 7 | Multi-fiat currency support (20 currencies), forex rate integration, non-USD store checkout flow |
| Week 8 | Payment links from dashboard, QR generation, POS mode, email payment requests |

### Phase 3: Offramp + Invoicing + Analytics (3-4 weeks)
**Goal:** Merchants can cash out to fiat. Full business tools.

| Week | Deliverables |
|------|-------------|
| Week 9 | Offramp provider registry, withdrawal flow, manual provider setup (Shakepay, Coinbase, Kraken) |
| Week 10 | Auto-settlement, session key management, withdrawal history |
| Week 11 | Invoicing (create, send, track, pay), PDF generation, invoice templates |
| Week 12 | Full analytics dashboard, tax export (CSV/PDF), date range reports |

### Phase 4: Scale + Ecosystem (Ongoing)
- Shopify app
- Onramper integration (aggregated offramp)
- Recurring invoices
- Team management + roles
- White-label option
- Magento extension
- QuickBooks/Xero integration
- WordPress.org submission
- goblink.io/merchant marketing landing page

---

## 16. Competitive Positioning

### Landscape

| Feature | goBlink Merchant | Stripe | BitPay | NOWPayments | BTCPay Server |
|---------|-----------------|--------|--------|-------------|---------------|
| Crypto payments | ✅ 26 chains | ❌ | ✅ 16 coins | ✅ 300+ coins | ✅ BTC + Lightning |
| Fiat payments | ❌ | ✅ | ❌ | ❌ | ❌ |
| Non-custodial | ✅ | ❌ | ❌ | ✅ | ✅ |
| Smart wallet | ✅ (passkey) | N/A | ❌ | ❌ | ❌ |
| Cross-chain | ✅ | N/A | Limited | Limited | ❌ |
| No API key needed | ❌ (need account) | ❌ | ❌ | ❌ | ✅ |
| Self-hosted | ❌ | ❌ | ❌ | ❌ | ✅ |
| Offramp built-in | ✅ | N/A (is fiat) | ✅ (custodial) | ❌ | ❌ |
| Invoicing | ✅ | ✅ | ❌ | ❌ | ✅ |
| WooCommerce | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shopify | Phase 2 | ✅ | ✅ | ✅ | ❌ |
| Processing fee | 0.05–0.35% | 2.9% + 30¢ | 1% | 0.4–0.5% | Free |
| Setup time | 2 minutes | 5 minutes | 10+ min | 5 minutes | 30+ min |

### The Pitch

**To crypto-savvy merchants:**
"Cheapest fees in the industry. Non-custodial. Every chain. You keep your keys."

**To crypto-curious merchants:**
"Accept crypto like you accept credit cards. No wallet needed — we create one for you. Cash out to your bank anytime."

**To developers:**
"Clean API, typed SDK, webhook events, block checkout support. Built by developers, for developers."

---

## Decisions Log (All Locked In ✅)

| # | Decision | Choice | Notes |
|---|----------|--------|-------|
| 1 | Smart wallet provider | **ZeroDev SDK** | Kernel accounts, passkey signer, session keys, paymasters. Counterfactual deployment. |
| 2 | Forex rates | **Open Exchange Rates** | Free tier (1K req/mo), cached aggressively. Paid $12/mo when needed. |
| 3 | Email | **Resend** | Free 3K/mo. Sends from noreply@goblink.io. M365 stays for personal inbox. |
| 4 | Test mode | **Mock API responses (v1)** | Full simulation deferred. Discuss more during build. |
| 5 | Merchant KYC | **Permissionless** | We're a software provider like Uniswap. Exchanges handle their own KYC. |
| 6 | Domain | **merchant.goblink.io** | Subdomain, standalone app. |
| 7 | Mobile | **PWA** | next-pwa package. Native app Phase 4+ if adoption demands. |
| 8 | Default chain | **Base** | Cheapest L2, native USDC, Coinbase ecosystem. Other chains available via Custom Setup. |
| 9 | Onboarding | **4 tiers** | Quick Start (default), BYOE, BYOW, Custom Setup. |
| 10 | Custody | **Never** | Non-custodial always. goBlink is infrastructure, not a vault. |
| 11 | License | **GPL-2.0** (WooCommerce plugin) | Required for WordPress.org. Platform itself is proprietary. |
| 12 | Distribution | **WordPress.org + direct download** | WordPress.org for discovery, goblink.io for direct. |
