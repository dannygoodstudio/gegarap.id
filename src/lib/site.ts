/**
 * Central place for brand-level contact details and constants referenced across
 * pages (footer, legal pages, WhatsApp links, support forms).
 */
export const SITE = {
  name: 'gegarap.id',
  /** WhatsApp support number in international format (no +, no leading 0). */
  waSupport: '6281234567890',
  emailSupport: 'support@gegarap.id',
  emailPrivacy: 'privacy@gegarap.id',
  area: 'Daerah Istimewa Yogyakarta',
  /** Flat platform fee (Rupiah) taken by gegarap.id per completed job. */
  platformFee: 20_000,
  /** Minimum down payment (Rupiah) required to confirm a booking. */
  minimumDp: 20_000,
} as const;
