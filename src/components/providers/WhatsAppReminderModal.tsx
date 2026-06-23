'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageCircle, CalendarClock, BellRing, Phone } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/components/providers/AuthProvider';

/** Per-session flag so the reminder nudges once, not on every navigation. */
const DISMISS_KEY = 'gegarap.waReminderDismissed';

/** Pages where the nudge is redundant or unwanted (the WA field lives on the
 *  dashboard; auth/onboarding pages already collect it). */
const SUPPRESSED = ['/dashboard', '/login', '/register', '/onboarding'];

const REASONS = [
  { icon: Phone, text: 'Tukang menghubungi Anda lewat WhatsApp untuk konfirmasi jadwal & lokasi.' },
  { icon: BellRing, text: 'Notifikasi status pesanan (diterima, dikerjakan, selesai) dikirim ke WhatsApp.' },
  { icon: CalendarClock, text: 'Tanpa nomor WhatsApp, pesanan belum bisa diproses.' },
];

/**
 * Brand-styled popup shown once per session to signed-in users (typically Google
 * sign-ups) who haven't added a WhatsApp number yet. Explains why it's needed and
 * sends them to the dashboard to complete it. Mounted globally in the root layout.
 */
export function WhatsAppReminderModal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const needsWa = status === 'authenticated' && !!session?.user && !session.user.phone;

  React.useEffect(() => {
    if (!needsWa) {
      setOpen(false);
      return;
    }
    if (SUPPRESSED.some((p) => pathname === p || pathname.startsWith(p + '/'))) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1') return;
    setOpen(true);
  }, [needsWa, pathname]);

  function dismiss() {
    if (typeof window !== 'undefined') sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  }

  function goComplete() {
    dismiss();
    router.push('/dashboard');
  }

  if (!needsWa) return null;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="Lengkapi Nomor WhatsApp Anda"
      description="Satu langkah lagi agar Anda bisa memesan tukang dengan lancar."
      footer={
        <>
          <Button variant="ghost" size="md" onClick={dismiss}>
            Nanti saja
          </Button>
          <Button size="md" onClick={goComplete} className="w-full sm:w-auto">
            Lengkapi Sekarang
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#25D366]">
          <MessageCircle className="h-7 w-7" />
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {REASONS.map((r) => (
          <li key={r.text} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
              <r.icon className="h-4 w-4" />
            </span>
            <span className="text-sm leading-relaxed text-muted-foreground">{r.text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Login Anda lewat Google sudah aman — nomor WhatsApp hanya dipakai sebagai kontak agar tukang
        bisa menghubungi Anda, bukan untuk keamanan akun.
      </p>
    </Modal>
  );
}
