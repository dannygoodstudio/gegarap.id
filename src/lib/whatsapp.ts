/**
 * Integrasi WhatsApp via Meta WhatsApp Cloud API (Official) plus helper
 * normalisasi nomor yang dipakai bersama oleh alur OTP.
 *
 * Dokumentasi: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Modul ini hanya "transport" (cara mengirim). Logika bisnis OTP — termasuk
 * template mana yang dipakai — tinggal di `otp.ts`, yang mengimpor dari sini.
 * Urutan impor selalu otp → whatsapp, tidak pernah sebaliknya, agar tak ada
 * import cycle.
 *
 * CATATAN PENTING (Meta vs Fonnte):
 * Berbeda dengan Fonnte, Cloud API TIDAK mengizinkan pesan teks bebas ke nomor
 * mana pun kapan pun. Pesan teks bebas (`type: 'text'`) hanya valid di dalam
 * "customer service window" 24 jam — yaitu setelah user lebih dulu mengirim
 * pesan ke bisnis. Untuk MEMULAI percakapan (mis. OTP, notifikasi booking ke
 * user yang belum membalas), wajib memakai pesan TEMPLATE yang sudah di-approve
 * Meta. Karena itu OTP memakai `sendWATemplate`, bukan `sendWAMessage`.
 */

/** Versi Graph API. Default mengikuti contoh di spesifikasi (boleh dinaikkan). */
const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';

/** Normalisasi nomor Indonesia ke bentuk `628xxxxxxxxxx`. */
export function normalizePhone(raw: string): string {
  let num = raw.replace(/\D/g, '');
  if (num.startsWith('0')) num = '62' + num.slice(1);
  if (!num.startsWith('62')) num = '62' + num;
  return num;
}

/** True untuk nomor HP Indonesia yang masuk akal dalam bentuk ternormalisasi. */
export function isValidIndonesianPhone(phone: string): boolean {
  return /^628[1-9][0-9]{7,11}$/.test(phone);
}

/** Kredensial Cloud API. `null` bila belum dikonfigurasi (mode dev/log-only). */
interface CloudApiCreds {
  token: string;
  phoneNumberId: string;
}

function getCreds(): CloudApiCreds | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return { token, phoneNumberId };
}

/**
 * Fallback dev: bila kredensial belum diset, di non-produksi kita anggap
 * "terkirim" dan hanya mencatat ke console — supaya alur OTP/notifikasi tetap
 * bisa diuji lokal (dan e2e membaca kode OTP langsung dari DB) tanpa akun Meta.
 * Di produksi, ketiadaan kredensial adalah kegagalan nyata → return false.
 */
function devFallback(target: string, description: string): boolean {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[wa:dev] Kredensial WhatsApp Cloud API belum diset — ${description} ke ${target} ` +
        'tidak benar-benar dikirim (hanya simulasi).'
    );
    return true;
  }
  console.error('[wa] Kredensial WhatsApp Cloud API tidak tersedia di environment produksi.');
  return false;
}

/**
 * POST mentah ke endpoint Cloud API. Mengembalikan true bila Meta menerima
 * pesan (ada `messages[].id` di respons). Semua error di-log tanpa membocorkan
 * isi pesan sensitif (mis. kode OTP).
 */
async function postToCloudApi(
  payload: Record<string, unknown>,
  creds: CloudApiCreds
): Promise<boolean> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${creds.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Jangan log payload (bisa berisi OTP). Cukup status + pesan error Meta.
      const errBody = await res.text().catch(() => '');
      console.error(`[wa] Cloud API menolak pesan (HTTP ${res.status}): ${errBody}`);
      return false;
    }

    const data = (await res.json().catch(() => null)) as
      | { messages?: Array<{ id?: string }> }
      | null;
    return Array.isArray(data?.messages) && data!.messages!.length > 0;
  } catch (err) {
    console.error('[wa] Gagal memanggil WhatsApp Cloud API:', err);
    return false;
  }
}

/** Parameter untuk mengirim pesan TEMPLATE yang sudah di-approve Meta. */
export interface WATemplateOptions {
  /** Nama template (mis. `otp_verification`). */
  name: string;
  /** Kode bahasa template (mis. `id`, `en_US`). */
  language: string;
  /** Nilai untuk placeholder body `{{1}}`, `{{2}}`, ... sesuai urutan. */
  bodyParams?: string[];
  /**
   * Untuk template kategori Authentication dengan tombol "copy code"/one-tap:
   * nilai yang diisikan ke tombol (biasanya kode OTP yang sama). Kosongkan bila
   * template Anda hanya punya body.
   */
  copyCodeButtonParam?: string;
}

/**
 * Kirim pesan TEMPLATE. Inilah jalur yang benar untuk pesan yang MEMULAI
 * percakapan (OTP, notifikasi proaktif). Mengembalikan status diterima Meta.
 */
export async function sendWATemplate(phone: string, opts: WATemplateOptions): Promise<boolean> {
  const target = normalizePhone(phone);
  const creds = getCreds();
  if (!creds) return devFallback(target, `template "${opts.name}"`);

  const components: Array<Record<string, unknown>> = [];

  if (opts.bodyParams?.length) {
    components.push({
      type: 'body',
      parameters: opts.bodyParams.map((text) => ({ type: 'text', text })),
    });
  }

  // Tombol copy-code pada template Authentication. Formatnya bisa berbeda
  // tergantung jenis template (one-tap vs copy-code); sesuaikan bila perlu.
  if (opts.copyCodeButtonParam) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [{ type: 'text', text: opts.copyCodeButtonParam }],
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: target,
    type: 'template',
    template: {
      name: opts.name,
      language: { code: opts.language },
      components,
    },
  };

  return postToCloudApi(payload, creds);
}

/**
 * Kirim pesan TEKS bebas. Hanya valid di dalam jendela layanan 24 jam (setelah
 * user membalas). Dipakai notifikasi best-effort yang sudah ada (booking,
 * payout, ops alert). Bila user berada di luar jendela, Meta akan menolak dan
 * fungsi ini mengembalikan false — call site memperlakukannya sebagai
 * best-effort, jadi tidak menggagalkan alur utama.
 *
 * TODO (produk): untuk pengiriman yang andal di luar sesi, notifikasi penting
 * sebaiknya dikonversi ke template yang di-approve via `sendWATemplate`.
 */
export async function sendWAMessage(phone: string, message: string): Promise<boolean> {
  const target = normalizePhone(phone);
  const creds = getCreds();
  if (!creds) return devFallback(target, 'pesan teks');

  const payload = {
    messaging_product: 'whatsapp',
    to: target,
    type: 'text',
    text: { preview_url: false, body: message },
  };

  return postToCloudApi(payload, creds);
}
