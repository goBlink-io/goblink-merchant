import type { KBEntry } from "./types";

export const knowledgeBase: KBEntry[] = [
  // ─── GETTING STARTED ─────────────────────────────────────────────

  {
    id: "gs-welcome",
    category: "getting-started",
    keywords: ["get started", "getting started", "new", "begin", "start", "onboarding", "setup", "set up", "first time", "how to use"],
    question: "How do I get started with goBlink?",
    answer:
      "Welcome to goBlink! Here's how to get up and running:\n\n1. **Sign up** at merchant.goblink.io with your email or Google account\n2. **Set up your business profile** — add your business name, country, and preferred currency\n3. **Choose your wallet setup** — Quick Start (recommended), Bring Your Own Exchange, Bring Your Own Wallet, or Custom\n4. **Generate an API key** in Settings → API to connect your store\n5. **Create your first payment** or install our WooCommerce plugin\n\nYou're ready to accept crypto payments!",
    followUp: ["gs-api-key", "gs-first-payment", "gs-wallet-setup"],
  },
  {
    id: "gs-first-payment",
    category: "getting-started",
    keywords: ["first payment", "test payment", "try payment", "create payment", "accept payment", "receive payment"],
    question: "How do I create my first payment?",
    answer:
      "There are several ways to create a payment:\n\n1. **Payment Link** — Go to Payment Links, create a link with an amount, and share it with your customer\n2. **API** — Use `POST /api/v1/payments` with your API key to create payments programmatically\n3. **WooCommerce** — Install our plugin and payments are created automatically at checkout\n\nFor testing, use a **test API key** (prefixed `gb_test_`) — no real crypto needed.\n\nOnce a customer pays, you'll see the payment appear in your dashboard in real time.",
    followUp: ["gs-api-key", "int-woo-setup", "pay-statuses"],
    action: "link_to_payment_links",
  },
  {
    id: "gs-api-key",
    category: "getting-started",
    keywords: ["api key", "api keys", "generate key", "create key", "live key", "test key", "gb_live", "gb_test", "api access", "api token"],
    question: "How do I generate an API key?",
    answer:
      "To generate an API key:\n\n1. Go to **Settings → API**\n2. Click **Generate New Key**\n3. Choose **Live** (`gb_live_`) for production or **Test** (`gb_test_`) for testing\n4. Copy the key immediately — it's only shown once!\n\nYou currently have **{{api_key_count}} active API key(s)**.\n\n**Important:** Keep your API keys secret. Never expose them in client-side code or public repos.",
    followUp: ["sec-api-safety", "gs-first-payment", "int-api-usage"],
    action: "link_to_settings",
  },
  {
    id: "gs-wallet-setup",
    category: "getting-started",
    keywords: ["wallet setup", "choose wallet", "quick start", "bring your own", "byoe", "byow", "custom setup", "onboarding tier", "wallet option"],
    question: "What are the wallet setup options?",
    answer:
      "goBlink offers four wallet setup tiers:\n\n1. **Quick Start** (Recommended) — A goBlink Smart Wallet on Base. No crypto experience needed. Passkey setup takes 30 seconds.\n2. **Bring Your Own Exchange (BYOE)** — Connect Coinbase, Kraken, Shakepay, or other exchanges. Payments arrive at your exchange deposit address.\n3. **Bring Your Own Wallet (BYOW)** — Use MetaMask, Phantom, or any wallet. Connect or paste your address.\n4. **Custom Setup** — Pick your chain, token, and wallet type. For crypto-native merchants.\n\nAll tiers use the same payment backend — only the settlement destination differs.",
    followUp: ["wal-settlement", "wal-smart-wallet", "wal-change-wallet"],
  },
  {
    id: "gs-webhook-setup",
    category: "getting-started",
    keywords: ["webhook", "webhooks", "webhook setup", "webhook url", "webhook endpoint", "register webhook", "add webhook", "webhook config", "notification url"],
    question: "How do I set up webhooks?",
    answer:
      "Webhooks notify your server when payment events happen.\n\n1. Go to **Settings → Webhooks**\n2. Click **Add Endpoint**\n3. Enter your webhook URL (must be HTTPS)\n4. Select the events you want to receive\n5. Copy your **webhook secret** to verify signatures\n\nYou have **{{webhook_count}} webhook endpoint(s)** configured.\n\nAll webhook deliveries are signed with **HMAC-SHA256** so you can verify they're genuine. Failed deliveries are retried up to 3 times.",
    followUp: ["int-webhook-verify", "ts-webhook-not-firing", "int-api-usage"],
    action: "link_to_settings",
  },

  // ─── PAYMENTS ─────────────────────────────────────────────────────

  {
    id: "pay-statuses",
    category: "payments",
    keywords: ["payment status", "payment statuses", "status meaning", "pending", "confirmed", "processing", "failed", "expired", "what does status mean"],
    question: "What do the payment statuses mean?",
    answer:
      "Here's what each payment status means:\n\n- **Pending** — Payment created, waiting for customer to pay\n- **Processing** — Customer's transaction detected, awaiting blockchain confirmation\n- **Confirmed** — Payment confirmed on-chain and settled to your wallet\n- **Failed** — Transaction failed (insufficient funds, network error, etc.)\n- **Expired** — Customer didn't pay within the time window\n- **Refunded** — Full refund issued to customer\n- **Partially Refunded** — Partial refund issued; remainder kept\n\nMost payments go from Pending → Processing → Confirmed in a few minutes.",
    followUp: ["pay-how-long", "pay-failed-why", "ts-payment-stuck"],
  },
  {
    id: "pay-how-long",
    category: "payments",
    keywords: ["how long", "payment time", "how fast", "confirmation time", "waiting", "slow payment", "when will payment arrive", "payment speed"],
    question: "How long do payments take?",
    answer:
      "Payment speed depends on the blockchain the customer pays on:\n\n| Chain | Typical Time |\n|-------|--------------|\n| Solana | 1-5 seconds |\n| Base / Optimism | 2-10 seconds |\n| Polygon | 5-15 seconds |\n| Arbitrum | 5-15 seconds |\n| Ethereum | 1-3 minutes |\n| Bitcoin | 10-60 minutes |\n\nCross-chain swaps (e.g., SOL → USDC on Base) add a few extra seconds for routing. Most payments complete in under 30 seconds.",
    followUp: ["pay-statuses", "ts-payment-stuck", "pay-find-payment"],
  },
  {
    id: "pay-failed-why",
    category: "payments",
    keywords: ["payment failed", "why failed", "payment error", "payment declined", "transaction failed", "failed payment reason"],
    question: "Why did my payment fail?",
    answer:
      "Payments can fail for several reasons:\n\n- **Expired** — Customer didn't complete payment within the time window (usually 30 minutes)\n- **Insufficient funds** — Customer's wallet didn't have enough tokens\n- **Network congestion** — The blockchain was too congested to process the transaction\n- **Slippage** — Token price moved too much during the swap\n- **Wrong token/chain** — Customer sent tokens to the wrong address or chain\n\nCheck your recent failed payments below for specific details.",
    followUp: ["pay-statuses", "ts-payment-stuck", "pay-refund"],
    action: "check_errors",
  },
  {
    id: "pay-find-payment",
    category: "payments",
    keywords: ["find payment", "search payment", "look up payment", "order id", "transaction hash", "tx hash", "payment id", "locate payment", "where is payment"],
    question: "How do I find a specific payment?",
    answer:
      "You can find any payment in your **Payments** page:\n\n1. Go to **Payments** in the sidebar\n2. Use the **search bar** to search by:\n   - Payment ID\n   - Order ID (from your store)\n   - Transaction hash (blockchain tx)\n3. Use **filters** to narrow by status, date range, or amount\n\nClick on any payment to see its full details, status timeline, and transaction info.",
    followUp: ["pay-statuses", "pay-export"],
    action: "link_to_payments",
  },
  {
    id: "pay-refund",
    category: "payments",
    keywords: ["refund", "refund payment", "issue refund", "partial refund", "full refund", "money back", "return payment", "send back"],
    question: "How do I refund a payment?",
    answer:
      "To refund a payment:\n\n1. Go to **Payments** and click on the payment you want to refund\n2. Click the **Refund** button\n3. Choose **Full refund** or enter a **partial amount**\n4. Confirm with your passkey\n\nThe refund is sent back to the customer's original wallet in their original token. Refund processing fees (0.05–0.35%) are absorbed by you.\n\n**Note:** Multiple partial refunds are supported, but total refunds can't exceed the original payment amount.",
    followUp: ["pay-statuses", "fee-processing", "pay-find-payment"],
    action: "link_to_payments",
  },
  {
    id: "pay-export",
    category: "payments",
    keywords: ["export", "download", "csv", "report", "transaction history", "payment history", "tax report", "accounting"],
    question: "How do I export my payment history?",
    answer:
      "To export your payment data:\n\n1. Go to **Payments**\n2. Apply any filters you need (date range, status, etc.)\n3. Click the **Export** button\n4. Choose your format: **CSV** (for QuickBooks/Xero), **PDF** (for printing), or **JSON** (for developers)\n\nExports include all payment details: dates, amounts (fiat + crypto), fees, statuses, transaction hashes, and more. Great for tax reporting and accounting.",
    followUp: ["pay-find-payment", "fee-processing"],
    action: "link_to_payments",
  },
  {
    id: "pay-recent",
    category: "payments",
    keywords: ["recent payments", "latest payments", "my payments", "payment summary", "payment overview", "today payments", "show payments"],
    question: "Show me my recent payments",
    answer: "Let me pull up your recent payment activity...",
    followUp: ["pay-statuses", "pay-find-payment", "pay-failed-why"],
    action: "check_payments",
  },
  {
    id: "pay-link",
    category: "payments",
    keywords: ["payment link", "payment links", "create link", "share link", "pay link", "generate link", "shareable", "qr code"],
    question: "How do I create a payment link?",
    answer:
      "Payment links are the easiest way to accept payments without a store:\n\n1. Go to **Payment Links** in the sidebar\n2. Click **Create Link**\n3. Enter the amount, currency, and optional description\n4. Share the generated link or QR code with your customer\n\nCustomers click the link, choose their payment method, and pay. You get notified instantly. Links can have custom expiry times (1 hour to 30 days).",
    followUp: ["gs-first-payment", "pay-how-long"],
    action: "link_to_payment_links",
  },

  // ─── WALLET & SETTLEMENT ─────────────────────────────────────────

  {
    id: "wal-balance",
    category: "wallet",
    keywords: ["balance", "my balance", "wallet balance", "how much", "funds", "money", "check balance", "available balance"],
    question: "What's my wallet balance?",
    answer: "Let me check your wallet balance...",
    followUp: ["wal-withdraw", "wal-settlement", "pay-recent"],
    action: "check_wallet",
  },
  {
    id: "wal-settlement",
    category: "wallet",
    keywords: ["settlement", "settlement token", "settlement chain", "receive token", "what token", "usdc", "which chain", "where do funds go", "settlement currency"],
    question: "What is my settlement token and chain?",
    answer:
      "Your current settlement configuration:\n\n- **Token:** {{settlement_token}}\n- **Chain:** {{settlement_chain}}\n- **Wallet:** `{{wallet_address}}`\n\nAll payments are automatically converted and settled in your chosen token on your chosen chain. You can change this anytime in **Settings → Payment Preferences**.",
    followUp: ["wal-change-token", "wal-change-wallet", "set-payment-prefs"],
    action: "link_to_settings",
  },
  {
    id: "wal-withdraw",
    category: "wallet",
    keywords: ["withdraw", "withdrawal", "cash out", "withdraw funds", "offramp", "fiat", "bank account", "send to bank", "payout"],
    question: "How do I withdraw my funds?",
    answer:
      "To withdraw funds from your goBlink wallet:\n\n1. Go to your **Dashboard** and click **Withdraw**\n2. Enter the amount (or select \"Withdraw All\")\n3. Choose your destination:\n   - **Exchange** (Coinbase, Kraken, etc.) → converts to fiat\n   - **External wallet** (any chain/token)\n   - **Another goBlink merchant** (internal transfer)\n4. Confirm with your **passkey** (Face ID / fingerprint)\n\nFor fiat withdrawals, connect an exchange account in Settings → Offramp. The exchange handles the final conversion to your bank.",
    followUp: ["wal-balance", "wal-auto-settle", "fee-processing"],
  },
  {
    id: "wal-smart-wallet",
    category: "wallet",
    keywords: ["smart wallet", "goblink wallet", "erc-4337", "passkey wallet", "base wallet", "counterfactual"],
    question: "What is a goBlink Smart Wallet?",
    answer:
      "A goBlink Smart Wallet is an **ERC-4337 smart contract wallet** on Base:\n\n- **Passkey-controlled** — Use Face ID, fingerprint, or Windows Hello. No seed phrase!\n- **Non-custodial** — You own your wallet. goBlink never has access to your funds.\n- **Counterfactual** — The wallet address is generated at signup, but the contract isn't deployed until your first payment arrives ($0 creation cost).\n- **Social recovery** — Add backup contacts to recover your wallet if you lose your device\n- **Gas-free setup** — goBlink sponsors the gas for wallet creation\n\nFunds accumulate in your smart wallet and you withdraw whenever you're ready.",
    followUp: ["wal-withdraw", "sec-passkey", "wal-settlement"],
  },
  {
    id: "wal-change-wallet",
    category: "wallet",
    keywords: ["change wallet", "update wallet", "new wallet address", "switch wallet", "different wallet", "update address"],
    question: "How do I change my wallet address?",
    answer:
      "To change your wallet address:\n\n1. Go to **Settings → Payment Preferences**\n2. Update your **wallet address** field\n3. Verify the new address is correct (double-check the chain!)\n4. Save changes\n\n**Warning:** Changing your wallet address means future payments will go to the new address. In-progress payments will still settle to the old address. Make sure you control the new address before updating.",
    followUp: ["wal-settlement", "set-payment-prefs"],
    action: "link_to_settings",
  },
  {
    id: "wal-change-token",
    category: "wallet",
    keywords: ["change token", "change settlement token", "switch token", "different token", "change chain", "switch chain"],
    question: "How do I change my settlement token or chain?",
    answer:
      "To change what token/chain you receive payments in:\n\n1. Go to **Settings → Payment Preferences**\n2. Update **Settlement Token** (e.g., USDC, ETH, SOL)\n3. Update **Settlement Chain** (e.g., Base, Ethereum, Solana)\n4. Save changes\n\nFuture payments will settle in your new token/chain. In-progress payments use the old configuration.\n\n**Default:** USDC on Base (lowest fees, fastest settlement).",
    followUp: ["wal-settlement", "fee-processing"],
    action: "link_to_settings",
  },
  {
    id: "wal-auto-settle",
    category: "wallet",
    keywords: ["auto settle", "auto settlement", "automatic withdrawal", "auto sweep", "threshold", "auto withdraw"],
    question: "What is auto-settlement?",
    answer:
      "Auto-settlement automatically withdraws your funds when your balance exceeds a threshold you set:\n\n1. Go to **Settings → Offramp**\n2. Enable **Auto-Settlement**\n3. Set your **threshold** (e.g., $500)\n4. Choose your **destination** (exchange or wallet)\n5. Approve a **session key** (passkey confirmation)\n\nWhen your balance exceeds the threshold, funds are automatically sent to your destination. You'll get an email notification each time.\n\nThe session key has safety limits: max amount per transaction, max per day, and can only send to your pre-approved address. Revoke it anytime.",
    followUp: ["wal-withdraw", "wal-settlement"],
    action: "link_to_settings",
  },
  {
    id: "wal-where-funds",
    category: "wallet",
    keywords: ["where are my funds", "where is my money", "missing funds", "payment not received", "funds not showing", "not seeing balance"],
    question: "Where are my funds?",
    answer:
      "If you're not seeing your funds, check these things:\n\n1. **Payment status** — Go to Payments and check if the payment is still processing. Cross-chain payments can take a few minutes.\n2. **Wallet address** — Make sure your settlement wallet address is correct in Settings\n3. **Settlement chain** — Funds arrive on your configured chain ({{settlement_chain}}). Check the right chain in your wallet.\n4. **Block explorer** — Click the transaction hash in the payment details to verify on-chain\n\nIf everything looks correct and funds are still missing, create a support ticket and we'll investigate.",
    followUp: ["pay-statuses", "pay-how-long", "wal-balance"],
    action: "check_wallet",
  },

  // ─── FEES ─────────────────────────────────────────────────────────

  {
    id: "fee-processing",
    category: "fees",
    keywords: ["fees", "processing fee", "how much fee", "cost", "pricing", "fee structure", "transaction fee", "percentage", "commission"],
    question: "What are goBlink's processing fees?",
    answer:
      "goBlink charges a simple processing fee based on your monthly volume:\n\n| Monthly Volume | Fee |\n|---------------|-----|\n| $0 – $10,000 | 0.35% |\n| $10,000 – $50,000 | 0.25% |\n| $50,000 – $250,000 | 0.15% |\n| $250,000+ | 0.05% |\n\n**No monthly fees. No setup fees. No hidden charges.**\n\nFees are deducted automatically from each payment before settlement. For example, on a $100 payment at the 0.35% tier, you receive $99.65.\n\nOfframp providers (Coinbase, Kraken, etc.) charge their own separate fees for converting crypto to fiat.",
    followUp: ["fee-calculated", "fee-tiers", "wal-withdraw"],
  },
  {
    id: "fee-calculated",
    category: "fees",
    keywords: ["how calculated", "fee calculation", "fee example", "fee deducted", "net amount", "after fees", "how fees work"],
    question: "How are fees calculated?",
    answer:
      "Fees are calculated on the **fiat amount** of each payment:\n\n**Example:** Customer pays $100 worth of SOL\n1. goBlink routes the payment through 1Click protocol\n2. Fee: $100 × 0.35% = **$0.35**\n3. You receive: **$99.65** in your settlement token ({{settlement_token}})\n\nThe fee is deducted before settlement — you always see the net amount in your wallet. Your fee tier is based on your rolling 30-day payment volume.",
    followUp: ["fee-processing", "fee-tiers"],
  },
  {
    id: "fee-tiers",
    category: "fees",
    keywords: ["fee tier", "volume tier", "volume discount", "lower fees", "reduce fees", "fee level", "tier upgrade"],
    question: "How do fee tiers work?",
    answer:
      "Your fee tier is based on your **rolling 30-day payment volume**:\n\n- **Starter** (0–$10K/mo): 0.35%\n- **Growth** ($10K–$50K/mo): 0.25%\n- **Scale** ($50K–$250K/mo): 0.15%\n- **Enterprise** ($250K+/mo): 0.05%\n\nTiers update automatically — no need to request an upgrade. As your volume grows, your fees decrease. The tier applies to all payments for the current billing period.\n\nThere are **no minimum fees** and **no monthly minimums**.",
    followUp: ["fee-processing", "fee-calculated"],
  },
  {
    id: "fee-refund",
    category: "fees",
    keywords: ["refund fee", "fee on refund", "refund cost", "refund charges"],
    question: "Are there fees on refunds?",
    answer:
      "Yes, refunds incur the same processing fee (0.05–0.35%) because they require a blockchain transaction to send funds back to the customer.\n\n**Important:** The original payment's processing fee is **not** refunded. So if you received $99.65 from a $100 payment and issue a full refund, you'll send $100 worth of tokens back and absorb the fees on both the payment and refund.\n\nThis is standard in crypto payment processing since blockchain transactions always have a cost.",
    followUp: ["pay-refund", "fee-processing"],
  },

  // ─── SETTINGS ─────────────────────────────────────────────────────

  {
    id: "set-business",
    category: "settings",
    keywords: ["business name", "change name", "update profile", "business profile", "company name", "store name", "edit profile"],
    question: "How do I change my business name?",
    answer:
      "Your current business name is **{{business_name}}**.\n\nTo update it:\n1. Go to **Settings → Business Profile**\n2. Edit the **Business Name** field\n3. Click **Save**\n\nYour business name appears on payment pages, invoices, and receipts that your customers see.",
    followUp: ["set-currency", "set-branding"],
    action: "link_to_settings",
  },
  {
    id: "set-currency",
    category: "settings",
    keywords: ["currency", "change currency", "display currency", "fiat currency", "usd", "cad", "eur", "gbp", "store currency"],
    question: "How do I change my display currency?",
    answer:
      "Your current display currency is **{{currency}}**.\n\nTo change it:\n1. Go to **Settings → Business Profile**\n2. Update the **Currency** dropdown\n3. Click **Save**\n\nThis changes how amounts are displayed in your dashboard and on customer-facing pages. It doesn't affect settlement — that's controlled separately in Payment Preferences.",
    followUp: ["wal-settlement", "set-business"],
    action: "link_to_settings",
  },
  {
    id: "set-payment-prefs",
    category: "settings",
    keywords: ["payment preferences", "payment settings", "accepted tokens", "minimum payment", "confirmation threshold", "payment config"],
    question: "What payment preferences can I configure?",
    answer:
      "In **Settings → Payment Preferences** you can configure:\n\n- **Settlement Token** — What token you receive (default: USDC)\n- **Settlement Chain** — Which blockchain (default: Base)\n- **Accepted Tokens** — All tokens by default, or whitelist specific ones\n- **Minimum Payment Amount** — Reject payments below a threshold\n- **Confirmation Threshold** — How many blockchain confirmations to wait (default: 1)\n\nThese settings apply to all new payments. In-progress payments use the settings from when they were created.",
    followUp: ["wal-settlement", "wal-change-token"],
    action: "link_to_settings",
  },
  {
    id: "set-branding",
    category: "settings",
    keywords: ["branding", "logo", "brand color", "customize", "white label", "checkout branding", "thank you message", "appearance"],
    question: "Can I customize my branding?",
    answer:
      "Yes! In **Settings → Branding** you can customize:\n\n- **Logo** — Upload your company logo (shown on checkout pages and invoices)\n- **Brand Color** — Set an accent color for your hosted payment pages\n- **Thank You Message** — Custom message shown after successful payment\n\nThese customizations appear on all customer-facing pages: payment links, invoices, and the hosted checkout page.",
    followUp: ["set-business", "set-payment-prefs"],
    action: "link_to_settings",
  },
  {
    id: "set-notifications",
    category: "settings",
    keywords: ["notifications", "email alerts", "email notifications", "alert settings", "notification preferences", "email settings"],
    question: "How do I configure notifications?",
    answer:
      "In **Settings → Notifications** you can set up:\n\n- **Email alerts** — Get notified for: payment received, payment failed, refund issued, withdrawal complete\n- **Webhook notifications** — POST to your server on payment events\n- **Dashboard push** — Real-time browser notifications\n\nAll email notifications come from noreply@goblink.io. Make sure to add it to your safe sender list.",
    followUp: ["gs-webhook-setup", "ts-webhook-not-firing"],
    action: "link_to_settings",
  },

  // ─── INTEGRATIONS ─────────────────────────────────────────────────

  {
    id: "int-woo-setup",
    category: "integrations",
    keywords: ["woocommerce", "woo", "wordpress", "plugin", "woocommerce setup", "install plugin", "woo plugin", "wordpress plugin"],
    question: "How do I set up WooCommerce?",
    answer:
      "To integrate goBlink with WooCommerce:\n\n1. **Install the plugin** — Download from your dashboard or the WordPress plugin directory\n2. **Activate** the plugin in WordPress → Plugins\n3. **Configure** — Go to WooCommerce → Settings → Payments → goBlink\n4. Enter your **API Key** (from Settings → API in your goBlink dashboard)\n5. Choose **Test Mode** or **Live Mode**\n6. **Save** and you're ready!\n\nCustomers will see \"Pay with Crypto (goBlink)\" at checkout. When they pay, your WooCommerce order is automatically marked as paid via webhook.\n\n**Minimum Requirements:** WordPress 5.8+, WooCommerce 7.0+, PHP 7.4+",
    followUp: ["gs-api-key", "gs-webhook-setup", "int-api-usage"],
  },
  {
    id: "int-shopify",
    category: "integrations",
    keywords: ["shopify", "shopify integration", "shopify plugin", "shopify app"],
    question: "Is there a Shopify integration?",
    answer:
      "Shopify integration is **coming soon** (Phase 2). We're currently building the Shopify app and it will be available in the Shopify App Store.\n\nIn the meantime, you can use our **API** or **Payment Links** to accept crypto payments for your Shopify store. Create payment links and share them with customers, or use our API to build a custom checkout flow.\n\nWant to be notified when Shopify support launches? Create a ticket and we'll add you to the waitlist!",
    followUp: ["int-woo-setup", "int-api-usage", "pay-link"],
    action: "create_ticket",
  },
  {
    id: "int-api-usage",
    category: "integrations",
    keywords: ["api", "api usage", "api docs", "api documentation", "rest api", "api endpoint", "api reference", "api guide", "developer", "developer docs"],
    question: "How do I use the goBlink API?",
    answer:
      "The goBlink REST API lets you create and manage payments programmatically.\n\n**Authentication:** Include your API key in the `x-api-key` header:\n```\nx-api-key: gb_live_your_key_here\n```\n\n**Key Endpoints:**\n- `POST /api/v1/payments` — Create a payment\n- `GET /api/v1/payments/:id` — Get payment details\n- `GET /api/v1/payments` — List all payments\n- `POST /api/v1/payments/:id/refund` — Initiate a refund\n- `GET /api/v1/merchant` — Get your profile\n- `PATCH /api/v1/merchant` — Update settings\n\n**Example — Create a payment:**\n```json\nPOST /api/v1/payments\n{\n  \"amount\": 49.99,\n  \"currency\": \"USD\",\n  \"order_id\": \"ORDER-123\",\n  \"return_url\": \"https://yoursite.com/thanks\"\n}\n```\n\nResponse includes a `payment_url` to redirect your customer to.",
    followUp: ["gs-api-key", "gs-webhook-setup", "int-webhook-verify"],
  },
  {
    id: "int-webhook-verify",
    category: "integrations",
    keywords: ["verify webhook", "webhook signature", "hmac", "webhook verification", "webhook secret", "validate webhook", "webhook security"],
    question: "How do I verify webhook signatures?",
    answer:
      "Every webhook delivery includes an `x-goblink-signature` header signed with HMAC-SHA256.\n\n**To verify:**\n1. Get your webhook secret from **Settings → Webhooks**\n2. Compute HMAC-SHA256 of the raw request body using your secret\n3. Compare with the `x-goblink-signature` header\n\n```javascript\nconst crypto = require('crypto');\n\nfunction verifyWebhook(body, signature, secret) {\n  const expected = crypto\n    .createHmac('sha256', secret)\n    .update(body)\n    .digest('hex');\n  return crypto.timingSafeEqual(\n    Buffer.from(signature),\n    Buffer.from(expected)\n  );\n}\n```\n\n**Always verify signatures** to ensure webhooks are genuinely from goBlink and haven't been tampered with.",
    followUp: ["gs-webhook-setup", "ts-webhook-not-firing", "sec-api-safety"],
  },
  {
    id: "int-embed",
    category: "integrations",
    keywords: ["embed", "widget", "iframe", "embeddable", "embed widget", "payment widget", "custom website"],
    question: "Can I embed a payment widget on my website?",
    answer:
      "Yes! goBlink offers an embeddable payment widget for custom websites:\n\n```html\n<iframe\n  src=\"https://goblink.io/embed?merchant=YOUR_ID\"\n  width=\"400\"\n  height=\"600\"\n  frameborder=\"0\"\n></iframe>\n```\n\nThe widget is pre-configured with your settlement preferences. It supports `postMessage` callbacks for payment events so you can react to successful payments in your page.\n\nFor more control, use the **API** to build a fully custom checkout experience.",
    followUp: ["int-api-usage", "pay-link"],
  },

  // ─── SECURITY ─────────────────────────────────────────────────────

  {
    id: "sec-api-safety",
    category: "security",
    keywords: ["api key security", "api key safe", "protect api key", "secure api key", "key leaked", "compromised key", "revoke key"],
    question: "How do I keep my API keys safe?",
    answer:
      "Best practices for API key security:\n\n- **Never expose in client-side code** — API keys should only be used server-side\n- **Don't commit to git** — Use environment variables (.env files)\n- **Use test keys for development** — `gb_test_` keys don't process real payments\n- **Rotate regularly** — Generate new keys and revoke old ones periodically\n- **Use IP allowlisting** — Restrict API access to your server IPs in Settings → Security\n\n**If a key is compromised:** Immediately go to **Settings → API**, revoke the key, and generate a new one. Active payments won't be affected.\n\nYou have **{{api_key_count}} active key(s)**.",
    followUp: ["gs-api-key", "sec-2fa"],
    action: "link_to_settings",
  },
  {
    id: "sec-passkey",
    category: "security",
    keywords: ["passkey", "passkeys", "face id", "fingerprint", "webauthn", "biometric", "windows hello", "device key"],
    question: "What are passkeys and how do they work?",
    answer:
      "Passkeys are a modern, passwordless authentication method:\n\n- **How they work:** Your device generates a unique cryptographic key pair. The private key stays on your device and is unlocked with Face ID, fingerprint, or Windows Hello.\n- **Why they're secure:** No password to steal, phishing-resistant, tied to your specific device\n- **Multi-device:** Add passkeys from multiple devices (phone + laptop) for convenience\n- **Wallet control:** Your goBlink Smart Wallet is controlled by your passkey — only you can authorize transactions\n\nYou can manage your passkeys in **Settings → Security → Passkey Management**.",
    followUp: ["sec-2fa", "wal-smart-wallet", "sec-recovery"],
    action: "link_to_settings",
  },
  {
    id: "sec-2fa",
    category: "security",
    keywords: ["2fa", "two factor", "two-factor", "mfa", "multi factor", "extra security", "authenticator", "security layer"],
    question: "Does goBlink support 2FA?",
    answer:
      "goBlink uses **passkeys** as the primary security mechanism, which are inherently multi-factor (something you have + something you are).\n\nFor sensitive actions like withdrawals and settings changes, you're always prompted to confirm with your passkey (biometric verification).\n\nAdditional 2FA methods (TOTP authenticator apps) are planned for a future update. If you'd like to be notified when it's available, create a support ticket.",
    followUp: ["sec-passkey", "sec-api-safety"],
  },
  {
    id: "sec-recovery",
    category: "security",
    keywords: ["recovery", "lost device", "lost phone", "recover wallet", "social recovery", "backup", "reset account"],
    question: "What if I lose my device?",
    answer:
      "If you lose your device, you have several recovery options:\n\n1. **Multi-device passkeys** — If you registered passkeys on multiple devices, use another device to log in\n2. **Social recovery** — If you set up recovery contacts in Settings → Security, they can help you regain access\n3. **Email recovery** — Reset your account password via email (this restores dashboard access, but wallet access requires a passkey)\n\n**Prevention tip:** Add passkeys from at least 2 devices (e.g., phone + laptop) and set up social recovery contacts. Do this in **Settings → Security**.",
    followUp: ["sec-passkey", "sec-2fa"],
    action: "link_to_settings",
  },
  {
    id: "sec-non-custodial",
    category: "security",
    keywords: ["non-custodial", "custody", "who holds funds", "is it safe", "trust", "can you access", "security model"],
    question: "Is goBlink non-custodial? Can you access my funds?",
    answer:
      "**goBlink is 100% non-custodial.** We never have access to your funds.\n\n- Your wallet is controlled by **your passkey** — only you can authorize transactions\n- We are a **software provider** (like Uniswap), not a financial institution\n- There is **no KYC** on our end — exchanges handle their own compliance\n- We cannot freeze, seize, or move your funds under any circumstances\n- All smart wallet code is **audited** and open for verification\n\nYour keys, your crypto. Always.",
    followUp: ["wal-smart-wallet", "sec-passkey"],
  },

  // ─── TROUBLESHOOTING ──────────────────────────────────────────────

  {
    id: "ts-payment-stuck",
    category: "troubleshooting",
    keywords: ["payment stuck", "stuck pending", "stuck processing", "not confirming", "payment taking long", "transaction stuck", "hung payment"],
    question: "My payment is stuck in pending/processing",
    answer:
      "If a payment is stuck, here's what to check:\n\n**Stuck in Pending:**\n- The customer may not have completed the payment yet\n- The payment may have expired (check the expiry time in payment details)\n- Ask the customer to check their wallet for a pending transaction\n\n**Stuck in Processing:**\n- The blockchain transaction is waiting for confirmations\n- Network congestion can cause delays (especially on Ethereum)\n- Cross-chain swaps may take 1-5 minutes\n- Check the transaction hash on a block explorer for status\n\nIf a payment has been stuck for more than **15 minutes**, create a support ticket with the payment ID and we'll investigate.",
    followUp: ["pay-statuses", "pay-how-long", "pay-find-payment"],
    action: "check_errors",
  },
  {
    id: "ts-webhook-not-firing",
    category: "troubleshooting",
    keywords: ["webhook not firing", "webhook not working", "no webhook", "webhook failed", "missing webhook", "webhook delivery failed", "webhook error", "not receiving webhook"],
    question: "My webhooks aren't firing",
    answer:
      "If you're not receiving webhooks, check these common issues:\n\n1. **Endpoint URL** — Make sure it's HTTPS and publicly accessible (not localhost)\n2. **Server responding** — Your endpoint must return a 2xx status code within 30 seconds\n3. **Firewall/CORS** — Ensure your server accepts POST requests from external sources\n4. **Failed deliveries** — Check Settings → Webhooks for delivery logs and error messages\n5. **Events selected** — Make sure you've subscribed to the right events\n\nWebhooks are retried up to **3 times** with exponential backoff if delivery fails.\n\nYou have **{{webhook_count}} endpoint(s)** configured.",
    followUp: ["gs-webhook-setup", "int-webhook-verify"],
    action: "check_webhooks",
  },
  {
    id: "ts-checkout-not-loading",
    category: "troubleshooting",
    keywords: ["checkout not loading", "payment page broken", "checkout error", "page not loading", "checkout blank", "payment page error", "customer can't pay"],
    question: "The checkout page isn't loading",
    answer:
      "If the checkout/payment page isn't loading for customers:\n\n1. **Check the payment URL** — Make sure it hasn't expired\n2. **Browser compatibility** — Supported: Chrome, Firefox, Safari, Edge (latest versions)\n3. **Ad blockers** — Some ad blockers interfere with crypto wallet connections. Ask the customer to disable theirs.\n4. **Network issues** — RPC endpoints may be temporarily down. Try refreshing.\n5. **API key** — If using the API, make sure you're using a valid live key (not test)\n\nIf the issue persists, create a support ticket with:\n- The payment URL or payment ID\n- The browser and device the customer is using\n- Any error messages shown",
    followUp: ["gs-api-key", "pay-statuses"],
    action: "create_ticket",
  },
  {
    id: "ts-wrong-amount",
    category: "troubleshooting",
    keywords: ["wrong amount", "incorrect amount", "amount mismatch", "underpaid", "overpaid", "short payment", "excess payment"],
    question: "The customer paid the wrong amount",
    answer:
      "Payment amount mismatches are handled differently depending on the situation:\n\n**Underpaid:**\n- goBlink detects underpayment automatically\n- The payment status will show as **Failed** with reason \"underpaid\"\n- The customer's funds are returned to their wallet\n- Create a new payment for the correct amount\n\n**Overpaid:**\n- The payment processes at the **original amount**\n- Excess funds are returned to the customer's wallet automatically\n\n**Price slippage:**\n- Token price changes during the swap can cause slight differences\n- goBlink accounts for this with a slippage tolerance (usually 1-2%)\n- The merchant always receives the expected fiat-equivalent amount",
    followUp: ["pay-refund", "pay-statuses"],
  },
  {
    id: "ts-errors-recent",
    category: "troubleshooting",
    keywords: ["errors", "recent errors", "my errors", "what went wrong", "show errors", "error log", "failure log"],
    question: "Show me my recent errors",
    answer: "Let me check your recent payment errors...",
    followUp: ["pay-failed-why", "ts-payment-stuck"],
    action: "check_errors",
  },
  {
    id: "ts-slow-dashboard",
    category: "troubleshooting",
    keywords: ["dashboard slow", "slow loading", "performance", "lag", "dashboard not loading", "page slow"],
    question: "The dashboard is loading slowly",
    answer:
      "If the dashboard feels slow, try these steps:\n\n1. **Clear browser cache** — Old cached assets can cause issues\n2. **Check your internet** — Slow connections affect real-time data\n3. **Reduce date range** — Large date ranges in payments/analytics load more data\n4. **Try a different browser** — Chrome or Firefox tend to perform best\n5. **Disable extensions** — Some browser extensions can interfere\n\nIf performance issues persist after these steps, create a support ticket and include:\n- Your browser and version\n- Approximate time the slowness started\n- Which pages are most affected",
    followUp: ["ts-checkout-not-loading"],
    action: "create_ticket",
  },
  {
    id: "ts-account-locked",
    category: "troubleshooting",
    keywords: ["account locked", "can't login", "can't log in", "login error", "access denied", "locked out", "password reset", "forgot password"],
    question: "I can't log in to my account",
    answer:
      "If you're having trouble logging in:\n\n1. **Password reset** — Click \"Forgot password\" on the login page to receive a reset email\n2. **Google login** — If you signed up with Google, use the \"Continue with Google\" button\n3. **Check email** — Make sure you're using the same email you registered with\n4. **Browser cookies** — Clear cookies or try an incognito/private window\n5. **Passkey issues** — If your passkey isn't working, try removing and re-adding it in your device settings\n\nIf none of these work, contact us via email at support@goblink.io or create a ticket from a different account.",
    followUp: ["sec-passkey", "sec-recovery"],
  },

  // ─── GENERAL / MISC ───────────────────────────────────────────────

  {
    id: "gen-support",
    category: "troubleshooting",
    keywords: ["support", "help", "contact", "talk to human", "real person", "agent", "customer support", "email support", "support ticket"],
    question: "How do I contact support?",
    answer:
      "You have several support options:\n\n1. **This chatbot** — I can answer most questions instantly!\n2. **Support tickets** — Create a ticket in the **Support** page for complex issues. You have **{{open_tickets}} open ticket(s)**.\n3. **Email** — Reach us at support@goblink.io\n\nFor urgent issues, create a ticket with **High** or **Urgent** priority and we'll respond faster.\n\nWant to create a ticket now?",
    followUp: ["gen-ticket-status"],
    action: "create_ticket",
  },
  {
    id: "gen-ticket-status",
    category: "troubleshooting",
    keywords: ["ticket status", "my tickets", "open tickets", "ticket update", "check ticket", "ticket progress"],
    question: "What's the status of my support tickets?",
    answer:
      "You have **{{open_tickets}} open support ticket(s)**.\n\nTo view your tickets:\n1. Go to **Support** in the sidebar\n2. See all your tickets with current status\n3. Click on any ticket to view the conversation and updates\n\nTicket statuses:\n- **Open** — Submitted, awaiting review\n- **In Progress** — Being investigated by our team\n- **Waiting on You** — We need more info from you\n- **Resolved** — Issue has been fixed\n- **Closed** — Ticket is closed",
    followUp: ["gen-support"],
    action: "link_to_support",
  },
  {
    id: "gen-chains",
    category: "payments",
    keywords: ["supported chains", "which chains", "what chains", "blockchain support", "supported networks", "available chains", "chains list"],
    question: "What blockchains does goBlink support?",
    answer:
      "goBlink supports **26+ blockchains** including:\n\n**EVM Chains:** Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, BSC, and more\n**Non-EVM:** Solana, NEAR, Sui, Aptos, TON, Tron, Starknet, Bitcoin\n\nCustomers can pay from **any supported chain** with **any supported token**. goBlink handles cross-chain routing automatically through the 1Click protocol.\n\nFor settlement, EVM chains get full smart wallet support. Non-EVM chains use standard deposit addresses.",
    followUp: ["wal-settlement", "pay-how-long"],
  },
  {
    id: "gen-tokens",
    category: "payments",
    keywords: ["supported tokens", "which tokens", "what tokens", "token list", "accept token", "accept bitcoin", "accept eth", "accept usdc"],
    question: "What tokens can customers pay with?",
    answer:
      "Customers can pay with **65+ tokens** across all supported chains. Popular tokens include:\n\n**Stablecoins:** USDC, USDT, DAI, PYUSD\n**Major:** ETH, BTC, SOL, NEAR, SUI, APT, AVAX, MATIC\n**DeFi:** UNI, AAVE, LINK, CRV\n**Meme:** DOGE, SHIB\n\nRegardless of what token the customer pays with, you receive your configured settlement token (default: **{{settlement_token}}** on **{{settlement_chain}}**).\n\nYou can whitelist specific tokens in **Settings → Payment Preferences** if you want to limit accepted tokens.",
    followUp: ["set-payment-prefs", "gen-chains"],
    action: "link_to_settings",
  },
  {
    id: "gen-countries",
    category: "getting-started",
    keywords: ["countries", "available countries", "supported countries", "country", "international", "global", "where available"],
    question: "What countries is goBlink available in?",
    answer:
      "goBlink is available **globally**. Since we're non-custodial and permissionless, there are no country restrictions for accepting payments.\n\n**For fiat withdrawals (offramp),** availability depends on the exchange you use:\n- **USA:** Coinbase, Kraken, Robinhood\n- **Canada:** Shakepay, Newton, Coinbase\n- **UK/EU:** Coinbase, Kraken\n- **Global:** MoonPay, Transak\n\nYou can always withdraw to any crypto wallet regardless of your country.",
    followUp: ["wal-withdraw", "gs-wallet-setup"],
  },
  {
    id: "gen-what-is-goblink",
    category: "getting-started",
    keywords: ["what is goblink", "about goblink", "how does goblink work", "explain goblink", "tell me about", "overview"],
    question: "What is goBlink?",
    answer:
      "**goBlink** is a non-custodial crypto payment processing platform — the \"Stripe of crypto.\"\n\n**How it works:**\n1. You create a merchant account and set up your wallet\n2. Customers pay with any crypto on any blockchain\n3. goBlink routes the payment and settles to your wallet in your preferred token\n4. You withdraw to fiat via an exchange, or hold crypto\n\n**Key features:**\n- Accept **65+ tokens** on **26+ chains**\n- **Non-custodial** — you control your funds\n- Fees from **0.05% to 0.35%** (volume-based)\n- WooCommerce plugin, payment links, invoicing, API\n- Real-time dashboard with analytics\n\nNo crypto knowledge required. Prices in fiat, settlement flexible.",
    followUp: ["gs-welcome", "fee-processing", "gs-wallet-setup"],
  },
  {
    id: "gen-test-mode",
    category: "getting-started",
    keywords: ["test mode", "testing", "sandbox", "test environment", "test payment", "gb_test", "development", "staging"],
    question: "How do I test payments without real crypto?",
    answer:
      "Use **Test Mode** to test your integration without real crypto:\n\n1. Generate a **Test API Key** (`gb_test_` prefix) in Settings → API\n2. Use the test key in your API calls or WooCommerce plugin\n3. Create payments as normal — they'll use a test environment\n4. Test webhooks fire to your endpoints just like production\n\nTest payments don't move real funds and don't incur fees. Switch to your **Live API Key** (`gb_live_`) when you're ready for production.\n\n**Tip:** Always test your webhook handling in test mode before going live.",
    followUp: ["gs-api-key", "gs-webhook-setup", "gs-first-payment"],
  },
];
