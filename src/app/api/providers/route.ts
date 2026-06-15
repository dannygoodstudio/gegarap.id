import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';
import { onboardingSchema } from '@/lib/validations';

export async function GET() {
  return handle(async () => {
    const providers = await prisma.providerProfile.findMany({
      where: { isVerified: true, available: true },
      include: { user: { select: { name: true } } },
      orderBy: { rating: 'desc' },
    });
    return ok(providers);
  })();
}

export async function POST(req: Request) {
  return handle(async () => {
    // Onboarding requires an authenticated session — no anonymous profiles.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return fail('Harus login dulu untuk mendaftar sebagai tukang.', 401);
    }

    const body = await req.json().catch(() => null);
    if (!body) return fail('Body permintaan tidak valid.', 400);

    const input = onboardingSchema.parse(body);

    // Identity comes from the session, never the body. The profile is tied to
    // the logged-in user; upsert keyed by userId so re-submitting edits it
    // instead of erroring or duplicating.
    const profile = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: { name: input.name, role: 'PROVIDER' },
      });

      return tx.providerProfile.upsert({
        where: { userId: session.user.id },
        update: {
          category: input.category,
          districts: input.districts,
          dailyRate: input.dailyRate,
          goPayNumber: input.goPayNumber,
          bio: input.bio || null,
          ktpImageUrl: input.ktpImageUrl ?? undefined,
        },
        create: {
          userId: session.user.id,
          category: input.category,
          districts: input.districts,
          dailyRate: input.dailyRate,
          goPayNumber: input.goPayNumber,
          bio: input.bio || null,
          ktpImageUrl: input.ktpImageUrl ?? null,
          isVerified: false, // pending KYC review
        },
      });
    });

    return ok({ providerProfileId: profile.id, name: input.name }, 201);
  })();
}
