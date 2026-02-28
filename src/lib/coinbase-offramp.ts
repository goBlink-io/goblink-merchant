import { SignJWT, importPKCS8 } from "jose";

// ---------------------------------------------------------------------------
// Coinbase Offramp — CDP session token + URL generation
// ---------------------------------------------------------------------------

const CDP_API_KEY = process.env.COINBASE_CDP_API_KEY || "";
const CDP_API_SECRET = process.env.COINBASE_CDP_API_SECRET || "";

/**
 * Generate a JWT signed with the CDP API secret for Coinbase session auth.
 * The JWT is used to obtain a session token from Coinbase's auth endpoint.
 */
export async function generateSessionToken(merchantId: string): Promise<string> {
  if (!CDP_API_KEY || !CDP_API_SECRET) {
    throw new Error("Coinbase CDP API credentials not configured");
  }

  const now = Math.floor(Date.now() / 1000);

  // Import the PEM-encoded private key
  const privateKey = await importPKCS8(CDP_API_SECRET, "ES256");

  const jwt = await new SignJWT({
    sub: CDP_API_KEY,
    iss: "cdp",
    aud: ["retail_rest_api_proxy"],
    uris: [],
  })
    .setProtectedHeader({ alg: "ES256", kid: CDP_API_KEY, nonce: crypto.randomUUID(), typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 120) // 2 minute expiry
    .setNotBefore(now)
    .sign(privateKey);

  // Call Coinbase's session token endpoint
  const res = await fetch("https://api.developer.coinbase.com/onramp/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      referrer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      partner_user_id: merchantId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Coinbase session token failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.token as string;
}

/**
 * Build the Coinbase Offramp URL with required parameters.
 */
export function generateOfframpUrl(params: {
  sessionToken: string;
  merchantId: string;
  walletAddress: string;
  chain?: string;
  redirectUrl: string;
}): string {
  const { sessionToken, merchantId, walletAddress, chain, redirectUrl } = params;

  // Map goBlink chain names to Coinbase chain identifiers
  const chainMap: Record<string, string> = {
    base: "base",
    ethereum: "ethereum",
    solana: "solana",
    polygon: "polygon",
  };

  const coinbaseChain = chainMap[chain || "base"] || "base";

  const url = new URL("https://pay.coinbase.com/v3/sell/input");

  url.searchParams.set("sessionToken", sessionToken);
  url.searchParams.set("partnerUserRef", merchantId);
  url.searchParams.set("redirectUrl", redirectUrl);
  url.searchParams.set("defaultAsset", "USDC");
  url.searchParams.set("defaultNetwork", coinbaseChain);
  url.searchParams.set("fiatCurrency", "USD");

  // Pass the merchant's wallet address as the source
  const addresses = JSON.stringify({
    [walletAddress]: [coinbaseChain],
  });
  url.searchParams.set("addresses", addresses);

  return url.toString();
}

/**
 * Get transaction status from Coinbase for a given merchant.
 */
export async function getTransactionStatus(
  merchantId: string
): Promise<{ transactions: Array<{ status: string; amount: string; currency: string }> }> {
  if (!CDP_API_KEY || !CDP_API_SECRET) {
    throw new Error("Coinbase CDP API credentials not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(CDP_API_SECRET, "ES256");

  const jwt = await new SignJWT({
    sub: CDP_API_KEY,
    iss: "cdp",
  })
    .setProtectedHeader({ alg: "ES256", kid: CDP_API_KEY, nonce: crypto.randomUUID(), typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 120)
    .setNotBefore(now)
    .sign(privateKey);

  const res = await fetch(
    `https://api.developer.coinbase.com/onramp/v1/sell/user/${merchantId}/transactions`,
    {
      headers: { Authorization: `Bearer ${jwt}` },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Coinbase status check failed: ${res.status} ${err}`);
  }

  return res.json();
}
