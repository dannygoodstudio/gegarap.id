import { describe, it, expect } from 'vitest';
import { calculateBookingFinancials, MINIMUM_DP } from '@/lib/calculations';

describe('calculateBookingFinancials', () => {
  it('kalkulasi dasar 1 hari', () => {
    const fin = calculateBookingFinancials(150_000, 1);
    expect(fin.subtotal).toBe(150_000);
    expect(fin.dpAmount).toBe(MINIMUM_DP); // min 20.000
    expect(fin.platformFee).toBe(20_000);
    expect(fin.providerEarnings).toBe(130_000); // 150.000 - 20.000
    expect(fin.remainingAmount).toBe(130_000); // 150.000 - 20.000 dp
  });

  it('kalkulasi 3 hari', () => {
    const fin = calculateBookingFinancials(150_000, 3);
    expect(fin.subtotal).toBe(450_000);
    expect(fin.providerEarnings).toBe(430_000); // 450.000 - 20.000
  });

  it('DP custom lebih besar dari minimum', () => {
    const fin = calculateBookingFinancials(150_000, 1, 50_000);
    expect(fin.dpAmount).toBe(50_000);
    expect(fin.remainingAmount).toBe(100_000); // 150.000 - 50.000
  });

  it('DP custom di bawah minimum → pakai minimum', () => {
    const fin = calculateBookingFinancials(150_000, 1, 5_000);
    expect(fin.dpAmount).toBe(MINIMUM_DP);
  });

  it('dailyRate 0 → throw error', () => {
    expect(() => calculateBookingFinancials(0, 1)).toThrow();
  });
});
