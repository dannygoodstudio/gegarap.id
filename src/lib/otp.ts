import { randomInt } from 'node:crypto';
import prisma from './prisma';
import { sendWAMessage } from './whatsapp';

// Re-export phone helpers so callers can `import { normalizePhone } from '@/lib/otp'`.
export { normalizePhone, isValidIndonesianPhone } from './whatsapp';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5; // wrong tries before a token is invalidated

/** Generate a 6-digit numeric OTP using a cryptographically secure RNG. */
export function generateOtp(): string {
  return randomInt(100_000, 1_000_000).toString();
}

/** Send the OTP to a number over WhatsApp. Returns delivery success. */
export async function sendOtpWhatsApp(phone: string, otp: string): Promise<boolean> {
  const message =
    `Kode OTP gegarap.id Anda: *${otp}*\n\n` +
    'Berlaku 5 menit. Jangan bagikan kode ini kepada siapa pun.';
  return sendWAMessage(phone, message);
}

/** Persist an OTP, replacing any earlier code for the same number. */
export async function saveOtp(phone: string, code: string) {
  await prisma.otpToken.deleteMany({ where: { phone } });
  return prisma.otpToken.create({
    data: { phone, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
}

/**
 * Verify and consume an OTP. Returns true only for a fresh, unused, valid code.
 *
 * Wrong codes increment an attempt counter; after `MAX_OTP_ATTEMPTS` the token is
 * burned so an attacker can't brute-force the 6-digit space.
 */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  // Match on phone only (not code) so we can count wrong attempts.
  const token = await prisma.otpToken.findFirst({
    where: { phone, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!token) return false;

  // Too many wrong tries → invalidate the token.
  if (token.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.otpToken.update({ where: { id: token.id }, data: { used: true } });
    return false;
  }

  if (token.code !== code) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.otpToken.update({ where: { id: token.id }, data: { used: true } });
  return true;
}

/**
 * Get or create the user for a verified phone number.
 *
 * The schema keeps `name`/`email` required, so OTP-only users get a placeholder
 * name and a synthetic email (mirroring the existing guest-customer convention)
 * — both editable later from the profile.
 */
export async function upsertUser(phone: string) {
  return prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      name: phone,
      email: `wa-${phone}@otp.gegarap.id`,
    },
  });
}
