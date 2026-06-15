import { getServerSession } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';
import { sendWAMessage } from '@/lib/whatsapp';

const completeSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return fail('Unauthorized', 401);

    const body = await req.json().catch(() => null);
    if (!body) return fail('Body permintaan tidak valid.', 400);
    const { rating, comment } = completeSchema.parse(body);

    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: { payment: true, provider: { include: { user: true } }, customer: true },
    });

    // Only the booking's owner may complete it.
    if (!job || job.customerId !== session.user.id) {
      return fail('Booking tidak ditemukan.', 404);
    }
    if (job.status !== 'IN_PROGRESS' && job.status !== 'CONFIRMED') {
      return fail('Status booking tidak valid untuk diselesaikan.', 400);
    }
    if (!job.payment || job.payment.status !== 'PAID') {
      return fail('Pembayaran DP belum terkonfirmasi.', 400);
    }

    const disbursedAmount = job.providerPayout; // subtotal - platform fee
    const platformFeeCharged = job.platformCommission; // Rp 20.000 flat

    await prisma.$transaction(async (tx) => {
      // 1. Booking → COMPLETED.
      await tx.job.update({ where: { id: job.id }, data: { status: 'COMPLETED' } });

      // 2. Record disbursement on the payment.
      await tx.payment.update({
        where: { id: job.payment!.id },
        data: {
          status: 'DISBURSED',
          disbursedAt: new Date(),
          disbursedAmount,
          platformFeeCharged,
        },
      });

      // 3. Save the review.
      await tx.review.create({
        data: {
          jobId: job.id,
          userId: session.user.id,
          providerProfileId: job.providerProfileId,
          rating,
          comment: comment || null,
        },
      });

      // 4. Recompute the provider's rating from all their reviews.
      const reviews = await tx.review.findMany({
        where: { providerProfileId: job.providerProfileId },
        select: { rating: true },
      });
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

      // 5. Update provider stats.
      await tx.providerProfile.update({
        where: { id: job.providerProfileId },
        data: {
          rating: Math.round(avg * 10) / 10,
          ratingCount: reviews.length,
          completedJobs: { increment: 1 },
        },
      });
    });

    // 6. Notify the provider that funds are released.
    if (job.provider.user.phone) {
      await sendWAMessage(
        job.provider.user.phone,
        `💰 *Dana Pekerjaan Dicairkan!*\n\n` +
          `Pekerjaan dari ${job.customer.name ?? job.customer.phone} telah selesai.\n` +
          `Dana dicairkan: *Rp ${disbursedAmount.toLocaleString('id-ID')}*\n` +
          `(Platform fee Rp ${platformFeeCharged.toLocaleString('id-ID')} sudah dipotong)\n\n` +
          `Dana masuk ke rekening/e-wallet kamu dalam 1×24 jam.`
      );
    }

    // NOTE: actual money transfer to the provider is recorded here (Payment
    // marked DISBURSED) and notified via WhatsApp. For automated payout,
    // integrate Xendit Disbursement or Midtrans Iris. For the MVP, admin can
    // transfer manually based on Payment.disbursedAt.

    return ok({ disbursedAmount, platformFeeCharged, rating });
  })();
}
