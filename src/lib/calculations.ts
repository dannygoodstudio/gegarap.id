import { SITE } from './site';

export const MINIMUM_DP = SITE.minimumDp; // Rp 20.000

export interface BookingFinancials {
  dailyRate: number; // tarif per hari tukang
  estimatedDays: number; // estimasi durasi
  subtotal: number; // dailyRate × estimatedDays
  dpAmount: number; // DP yang dibayar user — MIN Rp 20.000
  platformFee: number; // Rp 20.000 flat ke gegarap.id
  providerEarnings: number; // subtotal - platformFee (dibayar ke tukang saat selesai)
  totalAmount: number; // sama dengan subtotal (total yang harus dibayar user)
  remainingAmount: number; // totalAmount - dpAmount (dibayar saat/setelah selesai)
}

/**
 * The single source of truth for every money calculation in the app.
 *
 * Fee model: a flat Rp 20.000 platform fee per job (not a percentage), the
 * provider earns the rest, and the DP is at least Rp 20.000.
 */
export function calculateBookingFinancials(
  dailyRate: number,
  estimatedDays: number,
  dpInput?: number
): BookingFinancials {
  if (dailyRate <= 0) throw new Error('dailyRate harus lebih dari 0');
  if (estimatedDays <= 0) throw new Error('estimatedDays harus lebih dari 0');

  const subtotal = dailyRate * estimatedDays;
  const dpAmount = Math.max(dpInput ?? MINIMUM_DP, MINIMUM_DP); // min Rp 20.000
  const platformFee = SITE.platformFee; // Rp 20.000 flat
  const providerEarnings = subtotal - platformFee;
  const totalAmount = subtotal;
  const remainingAmount = Math.max(0, totalAmount - dpAmount);

  return {
    dailyRate,
    estimatedDays,
    subtotal,
    dpAmount,
    platformFee,
    providerEarnings,
    totalAmount,
    remainingAmount,
  };
}

/** Whether a down payment meets the minimum required to confirm a booking. */
export function isDpValid(dpAmount: number): boolean {
  return dpAmount >= MINIMUM_DP;
}
