import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidIndonesianPhone } from '@/lib/whatsapp';

describe('normalizePhone', () => {
  it('0812 → 62812', () => expect(normalizePhone('0812345678')).toBe('62812345678'));
  it('62812 → tetap', () => expect(normalizePhone('62812345678')).toBe('62812345678'));
  it('+62 → strip plus', () => expect(normalizePhone('+62812345678')).toBe('62812345678'));
  it('spasi dan strip dihapus', () =>
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890'));
});

describe('isValidIndonesianPhone', () => {
  it('nomor valid', () => expect(isValidIndonesianPhone('62812345678')).toBe(true));
  it('awalan 0 → tidak valid (harus normalize dulu)', () =>
    expect(isValidIndonesianPhone('0812345678')).toBe(false));
  it('terlalu pendek → tidak valid', () => expect(isValidIndonesianPhone('6281234')).toBe(false));
});
