import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendWATemplate, sendWAMessage } from '@/lib/whatsapp';

/**
 * Unit test integrasi WhatsApp Cloud API. Kita mock `fetch` global agar tidak
 * memanggil Meta sungguhan, lalu memeriksa URL, header, dan bentuk payload.
 */

const ENV_KEYS = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_API_VERSION',
] as const;

const savedEnv: Record<string, string | undefined> = {};

function mockFetchOk() {
  const fn = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ messages: [{ id: 'wamid.TEST' }] }),
    text: async () => '',
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  process.env.WHATSAPP_ACCESS_TOKEN = 'TEST_TOKEN';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '111222333';
  process.env.WHATSAPP_API_VERSION = 'v18.0';
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendWATemplate', () => {
  it('POST ke endpoint Cloud API yang benar dengan Bearer token', async () => {
    const fetchMock = mockFetchOk();
    const ok = await sendWATemplate('08123456789', {
      name: 'otp_verification',
      language: 'id',
      bodyParams: ['123456'],
    });

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v18.0/111222333/messages');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer TEST_TOKEN');
  });

  it('membangun payload template + menormalisasi nomor (08.. → 628..)', async () => {
    const fetchMock = mockFetchOk();
    await sendWATemplate('08123456789', {
      name: 'otp_verification',
      language: 'id',
      bodyParams: ['654321'],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.messaging_product).toBe('whatsapp');
    expect(body.to).toBe('628123456789');
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('otp_verification');
    expect(body.template.language).toEqual({ code: 'id' });
    expect(body.template.components).toEqual([
      { type: 'body', parameters: [{ type: 'text', text: '654321' }] },
    ]);
  });

  it('menyertakan komponen tombol bila copyCodeButtonParam diberikan', async () => {
    const fetchMock = mockFetchOk();
    await sendWATemplate('628123456789', {
      name: 'otp_verification',
      language: 'id',
      bodyParams: ['111111'],
      copyCodeButtonParam: '111111',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.template.components).toContainEqual({
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: [{ type: 'text', text: '111111' }],
    });
  });

  it('mengembalikan false saat Meta menolak (HTTP non-2xx)', async () => {
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => '{"error":{"message":"invalid"}}',
    });
    vi.stubGlobal('fetch', fn);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const ok = await sendWATemplate('628123456789', {
      name: 'otp_verification',
      language: 'id',
      bodyParams: ['123456'],
    });
    expect(ok).toBe(false);
  });
});

describe('sendWAMessage (teks bebas, dalam sesi 24 jam)', () => {
  it('mengirim payload type: text', async () => {
    const fetchMock = mockFetchOk();
    await sendWAMessage('628123456789', 'Halo dari gegarap');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.type).toBe('text');
    expect(body.text).toEqual({ preview_url: false, body: 'Halo dari gegarap' });
  });
});

describe('fallback dev tanpa kredensial', () => {
  it('tidak memanggil fetch dan menganggap terkirim (NODE_ENV non-produksi)', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const fetchMock = mockFetchOk();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const ok = await sendWATemplate('628123456789', {
      name: 'otp_verification',
      language: 'id',
      bodyParams: ['123456'],
    });

    expect(ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
