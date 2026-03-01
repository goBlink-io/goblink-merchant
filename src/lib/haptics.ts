export function haptic(pattern: "tap" | "success" | "press") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns: Record<string, VibratePattern> = { tap: 50, success: [100, 50, 100], press: 30 };
  navigator.vibrate(patterns[pattern]);
}
