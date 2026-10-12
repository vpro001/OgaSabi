import { localeConfig } from "@/lib/locale";

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Normalises a phone number to E.164. Accepts local formats ("0803 123 4567"), "234803…" and "+234…".
 * Nigerian numbers (+234) are additionally checked for 10 national digits starting 7, 8 or 9.
 * Returns null when the input is not a plausible number.
 */
export function normalizePhone(
  input: string,
  callingCode: string = localeConfig.callingCode,
): string | null {
  let s = input.trim().replace(/[\s\-().]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (!s.startsWith("+")) {
    if (s.startsWith("0")) s = `+${callingCode}${s.slice(1)}`;
    else if (s.startsWith(callingCode) && s.length > callingCode.length + 7) s = `+${s}`;
    else s = `+${callingCode}${s}`;
  }
  if (!E164.test(s)) return null;
  if (s.startsWith("+234") && !/^\+234[789]\d{9}$/.test(s)) return null;
  return s;
}

/** "+2348031234567" → "+234803 ••• 4567" for logs and UI where the full number must not be shown. */
export function maskPhone(e164: string): string {
  if (e164.length < 8) return "••••";
  return `${e164.slice(0, 7)} ••• ${e164.slice(-4)}`;
}
