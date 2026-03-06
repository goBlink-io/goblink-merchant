/**
 * Mobile detection and wallet deep-link generators.
 */

export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

interface WalletDeepLink {
  name: string;
  icon: string; // single letter/initials fallback
  url: string;
  color: string;
}

function getCurrentDappUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function getWalletDeepLinks(): WalletDeepLink[] {
  const dappUrl = getCurrentDappUrl();
  const stripped = stripProtocol(dappUrl);
  const encoded = encodeURIComponent(dappUrl);

  return [
    {
      name: "MetaMask",
      icon: "M",
      url: `https://metamask.app.link/dapp/${stripped}`,
      color: "#F6851B",
    },
    {
      name: "Coinbase Wallet",
      icon: "C",
      url: `https://go.cb-w.com/dapp?cb_url=${encoded}`,
      color: "#0052FF",
    },
    {
      name: "Rainbow",
      icon: "R",
      url: `https://rnbwapp.com/dapp?url=${encoded}`,
      color: "#001E59",
    },
    {
      name: "Trust Wallet",
      icon: "T",
      url: `trust://browser_enable?coin_id=60&url=${encoded}`,
      color: "#0500FF",
    },
    {
      name: "Phantom",
      icon: "P",
      url: `https://phantom.app/ul/browse/${encoded}`,
      color: "#AB9FF2",
    },
  ];
}
