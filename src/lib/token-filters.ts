export const HIDDEN_TOKEN_SYMBOLS = new Set([
  "ABG", "ADI", "ALEO", "APT", "BERA", "BLACKDRAGON", "BOME", "BRETT",
  "cbBTC", "CFI", "EURe", "FMS", "GBPe", "HAPI", "INX", "ITLX", "JAMBO",
  "KAITO", "LOUD", "MELANIA", "MOG", "mpDAO", "NearKat", "NPRO", "PENGU",
  "PUBLIC", "PURGE", "RHEA", "SAFE", "SPX", "SWEAT", "TITN", "TRUMP",
  "TURBO", "USD1", "USDf",
]);

export function isTokenHidden(symbol: string): boolean {
  return HIDDEN_TOKEN_SYMBOLS.has(symbol);
}
