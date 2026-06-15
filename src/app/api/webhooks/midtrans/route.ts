import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import { sendWAMessage } from '@/lib/whatsapp';

/** Midtrans notification signature = sha512(orderId + statusCode + grossAmount + serverKey). */
function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  receivedSignature: string
): boolean {
  const hash = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  return hash === receivedSignature;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const {
    order_id,
    transaction_status,
    fraud_status,
    status_code,
    gross_amount,
    signature_key,
    payment_type,
    va_numbers,
  } = body;

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    console.error('[Midtrans Webhook] MIDTRANS_SERVER_KEY tidak diset.');
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // 1. Verify signature. Ack with 200 (not 4xx) for anything we can't
  //    authenticate — Midtrans flags the URL and retries on non-200, and its
  //    dashboard "test notification" is unsigned/foreign. We just don't process
  //    unverified payloads.
  if (!verifySignature(order_id, status_code, gross_amount, serverKey, signature_key)) {
    console.error('[Midtrans Webhook] Invalid signature, ignoring', { order_id });
    return NextResponse.json({ ok: true, ignored: 'invalid signature' });
  }

  // 2. Find the payment record. Unknown order_id (e.g. the dashboard test
  //    notification) → ack 200 so the URL validates and Midtrans stops retrying.
  const payment = await prisma.payment.findUnique({
    where: { midtransOrderId: order_id },
    include: { job: true },
  });
  if (!payment) {
    return NextResponse.json({ ok: true, ignored: 'payment not found', order_id });
  }

  const isSuccess =
    (transaction_status === 'capture' && fraud_status === 'accept') ||
    transaction_status === 'settlement';

  // 3a. Successful payment → mark PAID + confirm booking (idempotent).
  if (isSuccess && payment.status === 'PENDING') {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          midtransPaymentType: payment_type ?? null,
          midtransVaNumber: va_numbers?.[0]?.va_number ?? null,
          paidAt: new Date(),
        },
      }),
      prisma.job.update({
        where: { id: payment.jobId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    // Notify the customer.
    const job = await prisma.job.findUnique({
      where: { id: payment.jobId },
      include: { customer: true, provider: { include: { user: true } } },
    });
    if (job?.customer.phone) {
      await sendWAMessage(
        job.customer.phone,
        `✅ *Pembayaran DP Diterima!*\n\n` +
          `Booking #${job.id.slice(-6).toUpperCase()} dikonfirmasi.\n` +
          `Tukang: ${job.provider.user.name}\n` +
          (job.scheduledDate
            ? `Jadwal: ${job.scheduledDate.toLocaleDateString('id-ID')}\n`
            : '') +
          `\nTukang akan segera menghubungi Anda. 🔧`
      );
    }
  }

  // 3b. Cancelled / expired → mark failed.
  if (transaction_status === 'cancel' || transaction_status === 'expire' || transaction_status === 'deny') {
    if (payment.status === 'PENDING') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    }
  }

  return NextResponse.json({ ok: true });
}

// Register this URL in Midtrans Dashboard → Settings → Configuration →
// Payment Notification URL: https://www.gegarap.id/api/webhooks/midtrans
