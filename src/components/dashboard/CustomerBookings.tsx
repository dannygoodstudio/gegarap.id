'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, MapPin, Star, AlertTriangle, Inbox, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, cn } from '@/lib/utils';

export interface CustomerBooking {
  id: string;
  providerName: string;
  category: string;
  description: string;
  address: string;
  district: string;
  status: string;
  scheduledDate: string | null;
  timeSlot: string;
  estimatedDays: number;
  totalFee: number;
  dpAmount: number;
  paymentStatus: string | null;
  reviewRating: number | null;
}

const statusVariant: Record<string, 'warning' | 'primary' | 'success' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'primary',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

const statusLabel: Record<string, string> = {
  PENDING: 'Menunggu pembayaran',
  CONFIRMED: 'Dikonfirmasi',
  IN_PROGRESS: 'Sedang dikerjakan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

function canComplete(b: CustomerBooking): boolean {
  return (
    (b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS') &&
    b.paymentStatus === 'PAID' &&
    b.reviewRating == null
  );
}

export function CustomerBookings({ bookings }: { bookings: CustomerBooking[] }) {
  const router = useRouter();
  const toast = useToast();

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  function openRating(id: string) {
    setActiveId(id);
    setRating(5);
    setComment('');
  }

  async function confirmComplete() {
    if (!activeId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${activeId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error('Gagal menyelesaikan', json.message ?? 'Silakan coba lagi.');
        return;
      }
      toast.success('Pekerjaan selesai!', 'Dana telah dicairkan ke tukang.');
      setActiveId(null);
      router.refresh();
    } catch {
      toast.error('Koneksi bermasalah', 'Tidak dapat terhubung ke server.');
    } finally {
      setSubmitting(false);
    }
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-7 w-7" />}
        title="Belum ada booking"
        description="Booking tukang pertama Anda akan muncul di sini."
        action={
          <Link href="/search" className={buttonVariants({ variant: 'primary', size: 'md' })}>
            Cari Tukang
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {bookings.map((b) => {
          const remaining = Math.max(0, b.totalFee - b.dpAmount);
          return (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{b.providerName}</h3>
                    <Badge variant="primary">{b.category}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Booking #{b.id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <Badge variant={statusVariant[b.status] ?? 'neutral'}>
                  {statusLabel[b.status] ?? b.status}
                </Badge>
              </div>

              {b.description && (
                <p className="mt-3 text-sm text-muted-foreground">{b.description}</p>
              )}

              <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {b.address}
                  {b.district ? `, ${b.district}` : ''}
                </span>
                {b.scheduledDate && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(b.scheduledDate).toLocaleDateString('id-ID')}
                    {b.timeSlot ? ` · ${b.timeSlot}` : ''} · {b.estimatedDays} hari
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
                <dl className="text-sm">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Total:</dt>
                    <dd className="font-semibold text-foreground">{formatCurrency(b.totalFee)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">DP dibayar:</dt>
                    <dd className="font-medium text-foreground">{formatCurrency(b.dpAmount)}</dd>
                  </div>
                  {remaining > 0 && b.status !== 'COMPLETED' && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground">Sisa:</dt>
                      <dd className="font-medium text-foreground">{formatCurrency(remaining)}</dd>
                    </div>
                  )}
                </dl>

                {canComplete(b) && (
                  <Button size="sm" onClick={() => openRating(b.id)}>
                    Pekerjaan Selesai
                  </Button>
                )}
                {b.status === 'PENDING' && b.paymentStatus !== 'PAID' && (
                  <span className="text-xs font-medium text-amber-600">
                    Selesaikan pembayaran DP untuk konfirmasi.
                  </span>
                )}
                {b.reviewRating != null && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < b.reviewRating! ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        )}
                      />
                    ))}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating + completion modal */}
      <Modal open={!!activeId} onClose={() => !submitting && setActiveId(null)}>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-center text-xl font-bold tracking-tight text-foreground">
          Selesaikan & Beri Rating
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Beri penilaian untuk pekerjaan tukang.
        </p>

        <div className="mt-5 flex justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value} bintang`}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'h-9 w-9',
                    value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                  )}
                />
              </button>
            );
          })}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Komentar (opsional)..."
          className="mt-4"
        />

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Dana akan langsung dicairkan ke tukang setelah kamu konfirmasi. Tindakan ini tidak bisa
            dibatalkan.
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button size="lg" loading={submitting} onClick={confirmComplete}>
            {submitting ? 'Memproses...' : 'Konfirmasi Selesai & Cairkan Dana'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            disabled={submitting}
            onClick={() => setActiveId(null)}
          >
            Batal
          </Button>
        </div>
      </Modal>
    </>
  );
}
