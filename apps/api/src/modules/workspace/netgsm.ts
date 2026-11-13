import { HttpError } from '../../lib/http-error';

/** Netgsm REST v2 SMS gönderimi (temel kimlik doğrulama). Anahtar gerekmez. */
const DEFAULT_URL = 'https://api.netgsm.com.tr/sms/rest/v2/send';

export interface NetgsmConfig {
  apiUrl: string;
  username: string;
  password: string;
  sender: string;
}

/** Netgsm numarayı 5XXXXXXXXX (10 hane) bekler: baştaki 0 ve +90 temizlenir. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D+/g, '');
  let value = digits;
  if (value.startsWith('90')) value = value.slice(2);
  if (value.startsWith('0')) value = value.slice(1);
  return /^5\d{9}$/.test(value) ? value : null;
}

/** Netgsm gövde kodları: HTTP 200 gelse bile gerçek sonuç buradadır. */
const CODES: Record<string, string> = {
  '20': 'Mesaj metni hatalı ya da karakter sınırı aşıldı.',
  '30': 'Kullanıcı adı/parola hatalı veya API erişimi sunucunun IP adresine kapalı.',
  '40': 'Gönderici başlığı onaylı değil. Netgsm panelinden başlığı onaylatın.',
  '50': 'İYS engeli: alıcı ticari ileti almak istemiyor.',
  '70': 'İstek parametreleri hatalı.',
};

function bodyCode(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    if (first && typeof first === 'object' && 'code' in first)
      return String((first as { code: unknown }).code ?? '');
  } catch {
    // Düz metin yanıt: ilk kelime kodu taşır ("00 123456" gibi).
    const first = text.trim().split(/\s+/)[0];
    if (first && /^\d{2}$/.test(first)) return first;
  }
  return '';
}

/**
 * Tek bir numaraya SMS gönderir. Hatalar HttpError olarak döner; çağıran taraf mesajı
 * kullanıcıya gösterir. Ağ hatasında 502, Netgsm reddinde 400 kullanılır.
 */
export async function sendNetgsmSms(
  config: NetgsmConfig,
  rawNumber: string,
  message: string,
): Promise<{ number: string }> {
  const number = normalizePhone(rawNumber);
  if (!number)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Telefon numarası 5XXXXXXXXX biçiminde olmalı (başında 0 veya +90 olmadan).',
    );
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  let response: Response;
  try {
    response = await fetch(config.apiUrl.trim() || DEFAULT_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        msgheader: config.sender,
        encoding: 'TR',
        messages: [{ msg: message, no: number }],
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new HttpError(
      502,
      'INTERNAL_ERROR',
      'SMS servisine ulaşılamadı. API adresini ve sunucunun internet bağlantısını kontrol edin.',
    );
  }
  const text = await response.text();
  if (!response.ok)
    throw new HttpError(502, 'INTERNAL_ERROR', `SMS servisi hata döndü (HTTP ${response.status}).`);
  const code = bodyCode(text);
  if (code === '00') return { number };
  throw new HttpError(
    400,
    'VALIDATION_ERROR',
    CODES[code] ?? `SMS gönderilemedi (kod ${code || 'okunamadı'}).`,
  );
}
