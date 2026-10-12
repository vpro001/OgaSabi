// Locale, currency and phone conventions. Everything defaults to Nigeria but is driven by
// configuration, so another market is an env change, not a code change.

export const localeConfig = {
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en-NG",
  currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "NGN",
  country: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "NG",
  callingCode: process.env.NEXT_PUBLIC_DEFAULT_CALLING_CODE ?? "234",
  timezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? "Africa/Lagos",
} as const;

const MINOR_UNITS_PER_MAJOR = 100; // kobo per naira; all supported currencies use 2 decimals

export function toMinorUnits(major: number): number {
  return Math.round(major * MINOR_UNITS_PER_MAJOR);
}

/** Formats integer minor units (kobo) as money: formatMoney(500000) → "₦5,000". */
export function formatMoney(
  minorUnits: number,
  opts: { currency?: string; locale?: string } = {},
): string {
  const { currency = localeConfig.currency, locale = localeConfig.locale } = opts;
  const major = minorUnits / MINOR_UNITS_PER_MAJOR;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}

/** "₦5,000 – ₦15,000", or a single figure when min equals max, or null when nothing is set. */
export function formatPriceRange(
  minKobo: number | null | undefined,
  maxKobo: number | null | undefined,
  opts: { currency?: string; locale?: string } = {},
): string | null {
  if (minKobo == null && maxKobo == null) return null;
  if (minKobo != null && maxKobo != null) {
    return minKobo === maxKobo
      ? formatMoney(minKobo, opts)
      : `${formatMoney(minKobo, opts)} – ${formatMoney(maxKobo, opts)}`;
  }
  return minKobo != null
    ? `from ${formatMoney(minKobo, opts)}`
    : `up to ${formatMoney(maxKobo as number, opts)}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "5 minutes ago", "in 2 days". */
export function formatRelativeTime(
  date: Date,
  now: Date = new Date(),
  locale: string = localeConfig.locale,
): string {
  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, secs] of UNITS) {
    if (abs >= secs) return rtf.format(Math.trunc(diffSec / secs), unit);
  }
  return rtf.format(0, "second");
}
