# goBlink Merchant Security Audit Report

**Date:** 2026-03-06
**Scope:** Full codebase security audit (Next.js 15 + Supabase + 1Click settlement)
**Auditor:** Claude Opus 4.6 (automated static analysis)
**Branch:** `feature/1click-settlement`

---

## Executive Summary

The goBlink Merchant platform demonstrates **solid foundational security practices**: RLS is enabled on all tables, API keys are bcrypt-hashed, HMAC-SHA256 webhook signing is implemented, CRON_SECRET protects cron endpoints, and a Content Security Policy is configured. The code uses parameterized queries via the Supabase client (no raw SQL), and sensitive env vars are properly excluded from the client bundle.

However, this audit identified **4 critical**, **7 high**, **6 medium**, and **4 low** severity findings (21 total). The critical issues center around: (1) webhook secrets stored in plaintext in the database, (2) CRON_SECRET validated with a non-constant-time string comparison vulnerable to timing attacks, (3) the public quote endpoint allowing unauthenticated real deposit submission (money movement), and (4) the simulate endpoint being accessible without authentication.

---

## CRITICAL Findings

### C1: Webhook secrets stored in plaintext in database

**File:** `src/app/api/v1/internal/webhooks/route.ts:46-58`
**Also:** `src/lib/webhooks.ts:117-120` (secret read back as plaintext)
**Also:** `supabase/migrations/00001_initial_schema.sql:143` and `supabase/migrations/00009_webhooks.sql:8`

**Description:** Webhook signing secrets are stored as plaintext in the `webhook_endpoints.secret` column. If the database is compromised (SQL injection elsewhere, leaked backup, Supabase dashboard access by unauthorized party), all webhook secrets are immediately exposed. An attacker could forge webhook deliveries to merchant endpoints, making them believe payments were confirmed when they weren't.

This is a payment platform -- forged `payment.confirmed` webhooks could trick merchants into shipping goods for unpaid orders.

**Suggested fix:** Store webhook secrets hashed (like API keys). Only show the secret once at creation time. For signing, use a derived key approach: store a `secret_id` and derive the signing key from a server-side master key + secret_id, so the signing key is never stored.

Alternatively, encrypt secrets at rest using an application-level encryption key (`WEBHOOK_SECRET_ENCRYPTION_KEY` env var), decrypting only when signing.

---

### C2: CRON_SECRET comparison vulnerable to timing attack

**File:** `src/app/api/cron/settle-payments/route.ts:24`
**Also:** `src/app/api/cron/retry-webhooks/route.ts:17`
**Also:** `src/app/api/cron/refresh-rates/route.ts:15`
**Also:** `src/app/api/checkout/[id]/complete/route.ts:158`

**Description:** All cron endpoints validate `CRON_SECRET` using JavaScript's `!==` operator:
```typescript
if (authHeader !== `Bearer ${cronSecret}`) {
```
This is vulnerable to timing attacks. An attacker can progressively guess the secret by measuring response times, since `!==` short-circuits on the first differing character.

The settle-payments cron controls payment confirmation (real money movement). If CRON_SECRET is compromised, an attacker could confirm payments that were never actually paid, or fail legitimate payments.

**Suggested fix:** Use `crypto.timingSafeEqual`:
```typescript
import crypto from "crypto";
const expected = Buffer.from(`Bearer ${cronSecret}`);
const actual = Buffer.from(authHeader || "");
if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
  return apiError("Unauthorized", 401);
}
```

---

### C3: Quote endpoint allows unauthenticated real deposit submission (money movement)

**File:** `src/app/api/checkout/quote/route.ts:59-81`

**Description:** When `dryRun` is explicitly set to `false`, this **public, unauthenticated** endpoint calls `submitDeposit()` which creates a real, non-dry 1Click swap order:
```typescript
const isDry = dryRun !== false;  // Only dry if dryRun is NOT explicitly false
// ...
: await submitDeposit({ originAsset, destinationAsset, amount, recipient, refundTo, ... });
```
Any caller can supply arbitrary `recipient`, `refundTo`, `originAsset`, `destinationAsset`, and `amount` values to initiate real token swaps through goBlink's 1Click account. This could be used to route funds to an attacker-controlled wallet or abuse the platform's swap infrastructure.

**Suggested fix:** Either remove `submitDeposit` from this endpoint entirely (keep it dry-run only), or require API key authentication and validate that `recipient` matches the authenticated merchant's wallet address.

---

### C4: Simulate endpoint has no authentication -- anyone can confirm test payments

**File:** `src/app/api/checkout/[id]/simulate/route.ts:17-134`

**Description:** The `/api/checkout/[id]/simulate` endpoint is **completely unauthenticated**. While it checks `is_test` on the payment (line 44), any external attacker who obtains or guesses a test payment UUID can call this endpoint to instantly confirm it. Test payment IDs are UUIDs (hard to guess), but they are returned in API responses and visible in URLs.

More critically, the simulate endpoint uses CORS (`withCors`) suggesting it's intended to be callable from the browser. But there is no session check -- anyone on the internet can call it.

If test/live mode isolation has any bugs, or if a merchant accidentally creates a test payment for a real order, this is exploitable.

**Suggested fix:** Require session authentication. Verify the calling user owns the merchant associated with the payment:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return apiError("Unauthorized", 401);
// Verify user owns the merchant
```

---

## HIGH Priority Findings

### H1: Webhook URL has no SSRF protection

**File:** `src/lib/webhooks.ts:51` and `src/lib/webhooks.ts:177`
**Also:** `src/app/api/v1/internal/webhooks/route.ts:49-58`

**Description:** When a merchant registers a webhook URL, there is zero validation on the URL. The server will make HTTP POST requests to any URL, including:
- `http://169.254.169.254/latest/meta-data/` (cloud metadata -- AWS/GCP/Azure instance credentials)
- `http://localhost:5432/` (internal database)
- `http://10.0.0.1/admin` (internal network)
- `file:///etc/passwd` (local files, if fetch supports it)

This is a Server-Side Request Forgery (SSRF) vulnerability. On Vercel's infrastructure, the metadata endpoint may not be directly exploitable, but internal service discovery and port scanning are possible.

**Suggested fix:** Validate webhook URLs:
```typescript
function isAllowedWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    // Block private IPs, localhost, metadata endpoints
    const hostname = parsed.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return false;
    if (hostname.startsWith("169.254.") || hostname.startsWith("10.")) return false;
    if (hostname.startsWith("172.") || hostname.startsWith("192.168.")) return false;
    if (hostname === "metadata.google.internal") return false;
    return true;
  } catch { return false; }
}
```

---

### H2: Rate limiting fails open -- DDoS and abuse vector

**File:** `src/lib/rate-limit.ts:43-45` and `src/lib/rate-limit.ts:68-70`

**Description:** When the rate limit RPC call fails (database down, connection timeout), the system **allows the request through** (fail-open):
```typescript
if (error || !data || data.length === 0) {
  console.error("[rate-limit] RPC error:", error?.message);
  return { allowed: true, remaining: config.max };  // FAIL OPEN
}
```
This means during any database outage or high-load situation, rate limiting is completely bypassed. An attacker could trigger rate limit failures (e.g., by overwhelming the database) and then abuse the now-unprotected endpoints.

For a payment platform, this is especially dangerous on `checkout-complete` and `checkout-quote` -- an attacker could spam payment completions or quote requests without limit.

**Suggested fix:** Fail closed for critical endpoints. Return 503 Service Unavailable when rate limiting is unavailable:
```typescript
if (error || !data || data.length === 0) {
  console.error("[rate-limit] RPC error:", error?.message);
  // Fail closed for payment-critical endpoints
  return { allowed: false, remaining: 0, response: NextResponse.json(
    { error: { message: "Service temporarily unavailable" } },
    { status: 503 }
  )};
}
```

---

### H3: No rate limiting on API key-authenticated routes

**File:** `src/app/api/v1/payments/route.ts` (entire file)
**Also:** `src/app/api/v1/payments/[id]/route.ts`
**Also:** `src/app/api/v1/payments/[id]/refund/route.ts`
**Also:** All `src/app/api/v1/webhooks/` routes

**Description:** Rate limiting is only applied to checkout (`/api/checkout/*`) routes. The API key-authenticated routes under `/api/v1/payments` and `/api/v1/webhooks` have **no rate limiting at all**. A compromised or leaked API key could be used to:
- Create thousands of payments per second
- Spam the payment listing endpoint
- Enumerate all payment data rapidly

**Suggested fix:** Add rate limiting to all `/api/v1/*` routes, keyed by API key ID rather than IP:
```typescript
const rl = await checkRateLimit(request, `api-v1:${auth.keyId}`);
```

---

### H4: `checkout/[id]/complete` POST is completely unauthenticated

**File:** `src/app/api/checkout/[id]/complete/route.ts:22-142`

**Description:** The POST endpoint that transitions a payment from `pending` to `processing` requires no authentication. Anyone who knows a payment ID can call this endpoint to:
1. Set arbitrary `sendTxHash`, `payerAddress`, `payerChain` values
2. Transition the payment to `processing` status
3. Inject arbitrary `customFields` into payment metadata

While the payment still needs cron settlement to actually confirm, an attacker could:
- Flood payments with fake processing data
- Set fake `sendTxHash` values that make it harder to track real transactions
- Inject arbitrary data into payment metadata via `customFields`

The idempotency guard (`eq("status", "pending")`) prevents re-processing, but doesn't prevent the initial attack.

**Suggested fix:** This is partially by design (checkout pages need to call this), but consider:
1. Require the customer to prove knowledge of a checkout-specific token/nonce generated at payment creation
2. Validate that `sendTxHash` is a valid transaction hash format
3. Validate `customFields` against the merchant's `custom_checkout_fields` schema

---

### H5: CSP allows `unsafe-eval` -- XSS escalation vector

**File:** `next.config.ts:6`

**Description:** The Content Security Policy includes `'unsafe-eval'` in `script-src`:
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```
This significantly weakens the CSP, as any XSS vulnerability can use `eval()` to execute arbitrary code. The comment says "Wallet SDKs need unsafe-inline/eval for injected scripts" -- this is common but should be narrowed.

**Suggested fix:** Audit which wallet SDKs require `unsafe-eval`. Consider using nonce-based CSP (`'nonce-xxx'`) instead of `'unsafe-inline'`, and restrict `'unsafe-eval'` to only the paths that need it (e.g., `/pay/*` checkout pages).

---

### H6: Settlement initiation has no idempotency guard -- double-settlement risk

**File:** `src/lib/settlement.ts:88-97`

**Description:** The `initiateSettlement` function updates the payment with settlement metadata using:
```typescript
.eq("id", paymentId);  // No .eq("settlement_status", "none") guard
```
If called twice for the same payment (retry, race condition, or duplicate webhook trigger), it will overwrite the deposit address from the first settlement with a new one. The first settlement's funds would be sent to the old deposit address while the DB now points to the new one -- potentially causing funds to be lost or untrackable.

**Suggested fix:** Add `.eq("settlement_status", "none")` to the update query and check affected row count:
```typescript
.eq("id", paymentId)
.eq("settlement_status", "none")
```

---

### H7: Settlement fee/amount not validated against 1Click actual received amount

**File:** `src/app/api/cron/settlement-status/route.ts:45-47`
**Also:** `src/app/api/cron/settle-payments/route.ts:57-59`

**Description:** Both settlement crons compute fees from the original `payment.amount` stored in the database, without checking the actual amount received from 1Click:
```typescript
const amount = Number(payment.amount);  // Original requested amount
const feeAmount = Math.round(amount * FEE_RATE * 100) / 100;
```
Combined with the 1% default slippage tolerance (`src/lib/oneclick.ts:45`), the recorded `net_amount` could be higher than what was actually received. On a $10,000 payment with max slippage, the merchant sees $9,900 settled but only $9,801 was actually received.

**Suggested fix:** Read `amount_out` from the 1Click execution status response and use it for fee calculation. Log a warning when actual vs expected differs by more than a threshold.

---

## MEDIUM Priority Findings

### M1: Refund endpoint has no idempotency guard on payment status update

**File:** `src/app/api/v1/internal/refunds/route.ts:119-122`

**Description:** The refund endpoint updates payment status without an idempotency guard:
```typescript
await serviceClient
  .from("payments")
  .update({ status: newStatus })
  .eq("id", payment_id);
  // Missing: .eq("status", "confirmed") or similar guard
```
If two concurrent refund requests race, both could pass the validation check and create duplicate refund records, potentially refunding more than the payment amount. The `totalRefunded` check at line 86 is not atomic with the insert.

**Suggested fix:** Use a database transaction or add a status guard:
```typescript
.eq("id", payment_id)
.in("status", ["confirmed", "partially_refunded"])
```
Better yet, use a Supabase RPC function that atomically checks + inserts within a transaction.

---

### M2: Webhook signature does not enforce timestamp freshness (no replay protection)

**File:** `src/lib/webhooks.ts:41-42`

**Description:** The webhook delivery includes a timestamp in the signature (`${timestamp}.${payload}`), but goBlink's own signing code never validates the timestamp on the receiving end. More importantly, the **verification documentation** at `src/app/api/v1/webhooks/verify/route.ts:152` says:
```
"5. Optionally reject requests where the timestamp is more than 5 minutes old"
```
The word "optionally" is dangerous guidance. Without timestamp validation, captured webhooks can be replayed indefinitely. A `payment.confirmed` webhook replayed months later could trick a merchant's system.

**Suggested fix:** Change documentation to make timestamp validation **mandatory**, not optional. Also add a nonce/delivery ID to each webhook payload for deduplication.

---

### M3: `proxy.ts` middleware is exported but may not be wired as Next.js middleware

**File:** `src/proxy.ts:58-71`

**Description:** The file exports a `proxy` function and a `config` with a `matcher`, but Next.js middleware must be in a file called `middleware.ts` at the project root (or `src/middleware.ts`). This file is at `src/proxy.ts` -- an unconventional location. If this isn't properly imported and re-exported from the actual middleware entry point, the admin route protection and session management may not be active.

No `src/middleware.ts` or root `middleware.ts` was found in the project. If this file is not actually executing as middleware, then:
- Dashboard routes (`/dashboard/*`) are unprotected
- Admin routes (`/admin/*`) have no admin check at the middleware level (only at the API route level)

**Suggested fix:** Verify this middleware is actually running. Create `src/middleware.ts` that imports and re-exports from `proxy.ts`:
```typescript
export { proxy as middleware, config } from "./proxy";
```

---

### M4: Webhook secret returned in API response after creation

**File:** `src/app/api/v1/internal/webhooks/route.ts:75-85`

**Description:** When creating a webhook, the plaintext secret is returned in the response:
```typescript
return apiSuccess({
  id: webhook.id,
  url: webhook.url,
  secret: webhook.secret,  // Plaintext secret in response
  ...
});
```
This is necessary for the merchant to configure their webhook receiver. However, the secret is also stored in the database in plaintext (see C1). If the webhook listing endpoint also returns secrets, that's an additional exposure point.

**Suggested fix:** Return the secret only on creation. For listing endpoints, mask or omit the secret entirely.

---

### M5: No validation on `expiresInMinutes` -- merchants can create immortal payments

**File:** `src/app/api/v1/payments/route.ts:31-70`

**Description:** The `expiresInMinutes` parameter has no upper bound. A merchant (or attacker with a leaked API key) could create payments that never expire by setting `expiresInMinutes` to an absurdly large value. This creates stale database entries and could be used for resource exhaustion.

**Suggested fix:** Enforce a maximum expiration window:
```typescript
const maxMinutes = 24 * 60; // 24 hours
const minutes = Math.min(Math.max(expiresInMinutes || 60, 1), maxMinutes);
```

---

### M6: Fee calculation uses floating-point arithmetic -- potential rounding errors

**File:** `src/app/api/cron/settle-payments/route.ts:57-59`

**Description:** Fee calculation uses JavaScript floating-point:
```typescript
const amount = Number(payment.amount);
const feeAmount = Math.round(amount * FEE_RATE * 100) / 100;
const netAmount = Math.round((amount - feeAmount) * 100) / 100;
```
While `Math.round` mitigates most issues, floating-point multiplication can produce surprising results (e.g., `0.1 + 0.2 !== 0.3`). For a payment platform handling real money, this could lead to tiny discrepancies that accumulate.

**Suggested fix:** Use integer arithmetic (cents) or a decimal library like `decimal.js`:
```typescript
const amountCents = Math.round(Number(payment.amount) * 100);
const feeCents = Math.round(amountCents * FEE_RATE);
const netCents = amountCents - feeCents;
const feeAmount = feeCents / 100;
const netAmount = netCents / 100;
```

---

## LOW Priority / Code Quality

### L1: API key validation scans all keys with matching prefix -- O(n) bcrypt comparisons

**File:** `src/lib/api-auth.ts:36-48`

**Description:** The `validateApiKey` function fetches all API keys matching a prefix pattern and then iterates through them, calling `bcrypt.compare` for each. While the prefix filtering reduces the candidate set, bcrypt is intentionally slow (~100ms per comparison). With many merchants, this could cause latency spikes on every API request.

**Suggested fix:** Store a truncated hash (e.g., SHA-256 of the key) as a lookup column. Use this for O(1) candidate lookup, then confirm with bcrypt:
```typescript
// On key creation:
const lookupHash = crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
// On validation:
const lookupHash = crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
const { data: keys } = await supabase.from("api_keys").select("*").eq("lookup_hash", lookupHash);
```

---

### L2: `audit_logs` table has no INSERT policy for RLS -- audit writes require service client

**File:** `supabase/migrations/00002_security_hardening.sql:24-27`

**Description:** The `audit_logs` table has RLS enabled and a SELECT policy for merchants to view their own logs, but no INSERT policy. This means audit log writes from the client-side Supabase client would be silently blocked by RLS. Currently, all audit writes use the service client (`getServiceClient`), so this works, but it's fragile -- if any future code uses the session client for audit logging, the writes will silently fail.

**Suggested fix:** Either add an INSERT policy or add a comment documenting that audit writes are service-client-only by design.

---

### L3: Error messages leak internal details

**File:** `src/app/api/v1/payments/route.ts:95`
**Also:** `src/app/api/v1/internal/refunds/route.ts:113`
**Also:** `src/app/api/v1/internal/webhooks/route.ts:62`

**Description:** Error messages include raw Supabase error messages:
```typescript
return apiError(`Failed to create payment: ${insertError?.message}`, 500);
```
These messages can leak database schema details, column names, and constraint information to API consumers.

**Suggested fix:** Return generic error messages to the client and log the detailed error server-side:
```typescript
console.error("[payments] Insert failed:", insertError?.message);
return apiError("Failed to create payment", 500);
```

---

### L4: `rate_limits` table has no RLS -- publicly accessible

**File:** `supabase/migrations/00002_security_hardening.sql:33-37`

**Description:** The `rate_limits` table does not have RLS enabled. While this table is only accessed via the `check_rate_limit` RPC function (which runs as `SECURITY INVOKER`), the table itself is accessible to any authenticated Supabase user who discovers it. An attacker could read rate limit keys (which contain IP addresses) or delete entries to bypass rate limiting.

**Suggested fix:**
```sql
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- No user-facing policies needed -- only accessed via service client
```

---

## Positive Observations

These areas are implemented well:

1. **API key hashing** -- bcrypt with salt, key_prefix for display, full key never stored (`src/lib/api-auth.ts:94`)
2. **RLS on all major tables** -- merchants, payments, refunds, invoices, webhooks all properly scoped to `auth.uid()` via merchant lookup (`supabase/migrations/00001_initial_schema.sql:183-306`)
3. **Idempotency guards** on payment status transitions -- `.eq("status", "processing")` and `.eq("status", "pending")` guards on updates (`src/app/api/cron/settle-payments/route.ts:72`, `src/app/api/checkout/[id]/complete/route.ts:106`)
4. **Comprehensive audit logging** -- all security-relevant actions logged with actor, IP, and metadata (`src/lib/audit.ts`)
5. **Security headers** -- HSTS, X-Frame-Options DENY, CSP, nosniff, Permissions-Policy all configured (`next.config.ts:37-62`)
6. **Proper CORS** -- origin allowlist, not wildcard (`src/lib/cors.ts`)
7. **Input validation** -- UUID regex checks, amount validation, JSON parse error handling throughout checkout routes
8. **IP allowlisting** for API keys (`src/lib/api-auth.ts:49-55`)
9. **.gitignore** properly excludes `.env*` files (`/.gitignore:33-35`)
10. **No raw SQL** -- all queries via Supabase client (parameterized by design)

---

## Summary Table

| # | Severity | Finding | File |
|---|----------|---------|------|
| C1 | CRITICAL | Webhook secrets stored plaintext in DB | `webhooks/route.ts:46`, `00001_initial_schema.sql:143` |
| C2 | CRITICAL | CRON_SECRET timing attack vulnerability | `settle-payments/route.ts:24`, all cron routes |
| C3 | CRITICAL | Quote endpoint allows real deposits unauthenticated | `checkout/quote/route.ts:59` |
| C4 | CRITICAL | Simulate endpoint unauthenticated | `simulate/route.ts:17` |
| H1 | HIGH | Webhook URLs -- no SSRF protection | `webhooks.ts:51`, `webhooks/route.ts:49` |
| H2 | HIGH | Rate limiting fails open | `rate-limit.ts:43-45` |
| H3 | HIGH | No rate limiting on API routes | `v1/payments/route.ts` |
| H4 | HIGH | Complete endpoint unauthenticated | `complete/route.ts:22` |
| H5 | HIGH | CSP allows unsafe-eval | `next.config.ts:6` |
| H6 | HIGH | Settlement initiation no idempotency guard | `settlement.ts:97` |
| H7 | HIGH | Settlement amount not validated vs actual | `settlement-status/route.ts:45` |
| M1 | MEDIUM | Refund race condition | `refunds/route.ts:119` |
| M2 | MEDIUM | No webhook replay protection | `webhooks.ts:41` |
| M3 | MEDIUM | Middleware may not be wired | `proxy.ts:58` |
| M4 | MEDIUM | Webhook secret in API response | `webhooks/route.ts:79` |
| M5 | MEDIUM | No max payment expiration | `v1/payments/route.ts:68` |
| M6 | MEDIUM | Floating-point fee math | `settle-payments/route.ts:57` |
| L1 | LOW | O(n) bcrypt key validation | `api-auth.ts:36` |
| L2 | LOW | No audit_logs INSERT policy | `00002_security_hardening.sql:24` |
| L3 | LOW | Error messages leak internals | `v1/payments/route.ts:95` |
| L4 | LOW | rate_limits table no RLS | `00002_security_hardening.sql:33` |

---

*Report generated by automated static analysis. Manual penetration testing and dynamic analysis are recommended to validate these findings and discover runtime-specific vulnerabilities.*
