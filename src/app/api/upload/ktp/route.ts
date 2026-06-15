import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? 'ktp-uploads';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: 'Harus login dulu.' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('ktp');

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: 'File tidak ditemukan.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { ok: false, message: 'Hanya JPG/PNG yang diizinkan.' },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: 'Ukuran file maksimal 5MB.' },
      { status: 400 }
    );
  }

  // Dev fallback: no Supabase keys → return a placeholder so onboarding is
  // testable locally. In production this is a hard error.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        ok: true,
        url: 'https://placehold.co/600x400/png?text=KTP+(dev+placeholder)',
      });
    }
    return NextResponse.json(
      { ok: false, message: 'Penyimpanan belum dikonfigurasi.' },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split('/')[1];
  const path = `ktp/${session.user.phone}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) {
    console.error('[upload/ktp] Supabase error:', error.message);
    return NextResponse.json({ ok: false, message: 'Upload gagal.' }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);

  return NextResponse.json({ ok: true, url: publicUrl });
}
