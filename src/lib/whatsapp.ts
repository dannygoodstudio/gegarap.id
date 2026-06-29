export function normalizePhone(raw: string): string {
  let num = raw.replace(/\D/g, '');
  if (num.startsWith('0')) num = '62' + num.slice(1);
  if (!num.startsWith('62')) num = '62' + num;
  return num;
}

export function isValidIndonesianPhone(phone: string): boolean {
  return /^628[1-9][0-9]{7,11}$/.test(phone);
}
