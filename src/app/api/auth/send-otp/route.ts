import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  normalizePhone,
  isValidIndonesianPhone,
  generateOtp,
  saveOtp,
  sendOtpWhatsApp,
} from '@/lib/otp';

const schema = z.object({ phone: z.string().min(9) });

// Simple in-memory per-IP rate limit (upgrade to Redis for multi-instance prod).
// Stops one IP spamming OTPs across many different numbers — which would both
// run up the Fonnte bill and bomb other people's phones.
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const IP_WINDOW_MS = 60_000;
const IP_MAX = 5;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateLimit.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  if (entry.count >= IP_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkIpRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Nomor WA tidak valid' }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!isValidIndonesianPhone(phone)) {
    return NextResponse.json({ error: 'Format nomor WA tidak dikenali' }, { status: 400 });
  }

  // Simple rate limit: one OTP per number per 60 seconds.
  const recent = await prisma.otpToken.findFirst({
    where: { phone, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent) {
    return NextResponse.json(
      { error: 'Tunggu 60 detik sebelum meminta OTP baru' },
      { status: 429 }
    );
  }

  const otp = generateOtp();
  await saveOtp(phone, otp);
  const sent = await sendOtpWhatsApp(phone, otp);

  if (!sent) {
    return NextResponse.json({ error: 'Gagal mengirim OTP. Silakan coba lagi.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, phone });
}
