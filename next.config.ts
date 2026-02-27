import type { NextConfig } from "next";

const ContentSecurityPolicy = [
  "default-src 'self'",
  // Wallet SDKs need unsafe-inline/eval for injected scripts
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Connect to Supabase, WalletConnect, 1Click, various RPC endpoints
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.walletconnect.com",
    "wss://*.walletconnect.com",
    "https://*.walletconnect.org",
    "wss://*.walletconnect.org",
    "https://1click.chaindefuser.com",
    "https://*.infura.io",
    "https://*.alchemy.com",
    "https://fullnode.mainnet.sui.io",
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com",
    "https://*.trongrid.io",
    "https://tonapi.io",
  ].join(" "),
  // Allow wallet popup iframes
  "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org",
  // Images from self, data URIs, and any HTTPS source (token logos, etc.)
  "img-src 'self' data: https:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.replace(/\n/g, ""),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
