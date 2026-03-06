import { getServiceClient } from "@/lib/service-client";

/**
 * Supported fiat currencies with symbols and names.
 */
export const SUPPORTED_CURRENCIES: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  USD: { symbol: "$", name: "US Dollar", decimals: 2 },
  EUR: { symbol: "\u20AC", name: "Euro", decimals: 2 },
  GBP: { symbol: "\u00A3", name: "British Pound", decimals: 2 },
  CAD: { symbol: "CA$", name: "Canadian Dollar", decimals: 2 },
  AUD: { symbol: "A$", name: "Australian Dollar", decimals: 2 },
  JPY: { symbol: "\u00A5", name: "Japanese Yen", decimals: 0 },
  CHF: { symbol: "CHF", name: "Swiss Franc", decimals: 2 },
  CNY: { symbol: "\u00A5", name: "Chinese Yuan", decimals: 2 },
  INR: { symbol: "\u20B9", name: "Indian Rupee", decimals: 2 },
  KRW: { symbol: "\u20A9", name: "South Korean Won", decimals: 0 },
  BRL: { symbol: "R$", name: "Brazilian Real", decimals: 2 },
  MXN: { symbol: "MX$", name: "Mexican Peso", decimals: 2 },
  SGD: { symbol: "S$", name: "Singapore Dollar", decimals: 2 },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar", decimals: 2 },
  NOK: { symbol: "kr", name: "Norwegian Krone", decimals: 2 },
  SEK: { symbol: "kr", name: "Swedish Krona", decimals: 2 },
  DKK: { symbol: "kr", name: "Danish Krone", decimals: 2 },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar", decimals: 2 },
  ZAR: { symbol: "R", name: "South African Rand", decimals: 2 },
  TRY: { symbol: "\u20BA", name: "Turkish Lira", decimals: 2 },
};

/**
 * Get the exchange rate from USD to a target currency.
 * Reads from the exchange_rates table (cached by cron).
 */
export async function getExchangeRate(targetCurrency: string): Promise<number | null> {
  if (targetCurrency === "USD") return 1;

  const supabase = getServiceClient();
  const { data } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("base_currency", "USD")
    .eq("target_currency", targetCurrency.toUpperCase())
    .single();

  // Return null instead of fallback 1.0 — a missing rate for JPY/KRW
  // would be 150x/1300x off, which is worse than showing an error (L7)
  return data ? Number(data.rate) : null;
}

/**
 * Convert an amount from USD to a target currency.
 */
export async function convertAmount(
  amountUsd: number,
  targetCurrency: string
): Promise<number> {
  if (targetCurrency === "USD") return amountUsd;
  const rate = await getExchangeRate(targetCurrency);
  if (rate === null) {
    throw new Error(`Exchange rate unavailable for ${targetCurrency}`);
  }
  return amountUsd * rate;
}

/**
 * Convert an amount from a source currency to USD.
 */
export async function convertToUsd(
  amount: number,
  sourceCurrency: string
): Promise<number> {
  if (sourceCurrency === "USD") return amount;
  const rate = await getExchangeRate(sourceCurrency);
  if (rate === null || rate === 0) {
    throw new Error(`Exchange rate unavailable for ${sourceCurrency}`);
  }
  return amount / rate;
}

/**
 * Get the list of supported currency codes.
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(SUPPORTED_CURRENCIES);
}

/**
 * Get the symbol for a currency code.
 */
export function getCurrencySymbol(currencyCode: string): string {
  return SUPPORTED_CURRENCIES[currencyCode]?.symbol ?? currencyCode;
}

/**
 * Format an amount in the given currency using Intl.
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits:
      SUPPORTED_CURRENCIES[currencyCode]?.decimals ?? 2,
    maximumFractionDigits:
      SUPPORTED_CURRENCIES[currencyCode]?.decimals ?? 2,
  }).format(amount);
}

/**
 * Refresh exchange rates from Open Exchange Rates API.
 * Called by the cron job.
 */
export async function refreshExchangeRates(): Promise<{
  updated: number;
  error?: string;
}> {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId) {
    return { updated: 0, error: "OPEN_EXCHANGE_RATES_APP_ID not set" };
  }

  const res = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD`
  );

  if (!res.ok) {
    return { updated: 0, error: `API returned ${res.status}` };
  }

  const data = await res.json();
  const rates = data.rates as Record<string, number>;

  if (!rates) {
    return { updated: 0, error: "No rates in API response" };
  }

  const supabase = getServiceClient();
  const currencies = getSupportedCurrencies();
  let updated = 0;

  for (const currency of currencies) {
    const rate = rates[currency];
    if (rate === undefined) continue;

    const { error } = await supabase.from("exchange_rates").upsert(
      {
        base_currency: "USD",
        target_currency: currency,
        rate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "base_currency,target_currency" }
    );

    if (!error) updated++;
  }

  return { updated };
}
