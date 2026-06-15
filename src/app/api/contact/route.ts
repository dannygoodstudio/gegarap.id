import prisma from '@/lib/prisma';
import { ok, fail, handle } from '@/lib/api';
import { contactSchema } from '@/lib/validations';

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    if (!body) return fail('Body permintaan tidak valid.', 400);

    const input = contactSchema.parse(body);

    await prisma.contactRequest.create({
      data: {
        name: input.name,
        phone: input.phone,
        message: input.message,
      },
    });

    return ok({ received: true }, 201);
  })();
}
