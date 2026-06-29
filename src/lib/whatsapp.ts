/**
 * Phone-number helpers for Indonesian mobile numbers.
 *
 * NOTE: programmatic WhatsApp messaging (OTP + automated notifications) was
 * removed. The WhatsApp number is now stored purely as a contact and surfaced
 * as a click-to-chat wa.me link (see `buildWALink` in `lib/utils.ts`) so workers
 * and clients reach each other directly — no gateway, token, quota, or device.
 */

/** Normalise an Indonesian phone number to the `628xxxxxxxxxx` form. */
export function normalizePhone(raw: string): string {
  let num = raw.replace(/\D/g, '');
  if (num.startsWith('0')) num = '62' + num.slice(1);
  if (!num.startsWith('62')) num = '62' + num;
  return num;
}

/** True for a plausible Indonesian mobile number in normalised form. */
export function isValidIndonesianPhone(phone: string): boolean {
  return /^628[1-9][0-9]{7,11}$/.test(phone);
}
