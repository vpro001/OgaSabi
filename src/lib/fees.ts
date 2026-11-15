/** The switches an administrator controls from the Monetisation tab. */
export type PlatformSettings = {
  serviceFeeEnabled: boolean;
  /** Basis points of the callout deposit: 500 = 5%. */
  serviceFeeBps: number;
  sponsoredEnabled: boolean;
  /** How many sponsored artisans may lead one search. */
  sponsoredSlots: number;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  serviceFeeEnabled: false,
  serviceFeeBps: 500,
  sponsoredEnabled: false,
  sponsoredSlots: 2,
};

export const MAX_SERVICE_FEE_BPS = 3000;
export const MAX_SPONSORED_SLOTS = 5;
const KOBO_PER_NAIRA = 100;

/**
 * The service fee the customer pays on top of a callout deposit, in kobo. Rounded to a whole
 * naira so the checkout total stays readable; zero while the fee is switched off.
 */
export function serviceFeeKobo(
  depositKobo: number,
  settings: Pick<PlatformSettings, "serviceFeeEnabled" | "serviceFeeBps">,
): number {
  if (!settings.serviceFeeEnabled || depositKobo <= 0) return 0;
  const exact = (depositKobo * settings.serviceFeeBps) / 10_000;
  return Math.round(exact / KOBO_PER_NAIRA) * KOBO_PER_NAIRA;
}
