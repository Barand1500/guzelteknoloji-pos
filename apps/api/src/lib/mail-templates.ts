/**
 * E-posta şablonları. E-posta istemcileri (Gmail, Outlook, Apple Mail) modern CSS'i güvenilir
 * desteklemediği için tablo tabanlı yerleşim ve satır içi (inline) stil kullanılır.
 * Renkler web arayüzündeki marka paletiyle aynıdır.
 */

export interface LoginCodeEmailInput {
  code: string;
  expiresInMinutes: number;
  brandName: string;
  /** Alt bilgideki site bağlantısı (APP_URL). */
  appUrl: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const COLORS = {
  page: '#f4f3ee',
  card: '#ffffff',
  ink: '#17212b',
  muted: '#4a5562',
  line: '#e4e2da',
  brand: '#c2410c',
  brandLight: '#e85d18',
  brandSoft: '#fff3e6',
  accent: '#ffb44d',
  accentSoft: '#fff7e8',
} as const;

const FONT = "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

/** HTML'e girecek her dinamik metin kaçışlanır. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function monogram(brandName: string): string {
  const words = brandName.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words.map((w) => w[0]).join('') : brandName.slice(0, 2);
  return letters.slice(0, 2).toLocaleUpperCase('tr-TR');
}

export function loginCodeEmail(input: LoginCodeEmailInput): RenderedEmail {
  const { code, expiresInMinutes, brandName, appUrl } = input;
  const brand = escapeHtml(brandName);
  const siteHost = escapeHtml(appUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''));
  const siteHref = escapeHtml(appUrl);
  const mark = escapeHtml(monogram(brandName));

  const subject = `${brandName} giriş kodunuz: ${code}`;

  const text = [
    `${brandName} giriş kodunuz: ${code}`,
    '',
    `Hesabınıza giriş yapmak için bu kodu kullanın. Kod ${expiresInMinutes} dakika boyunca geçerlidir ve yalnızca bir kez kullanılabilir.`,
    '',
    'Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz. Güvenliğiniz için kodu kimseyle paylaşmayın.',
    '',
    `— ${brandName}`,
  ].join('\n');

  // Her hane ayrı bir kutuda: okunması ve kopyalanması kolay.
  const digitCells = code
    .split('')
    .map(
      (digit) =>
        `<td align="center" width="48" height="60" style="width:48px;height:60px;background:${COLORS.brandSoft};border:1px solid #ffd9b3;border-radius:12px;font-family:${FONT};font-size:30px;font-weight:700;color:${COLORS.brand};">${escapeHtml(digit)}</td>`,
    )
    .join('<td width="8" style="width:8px;font-size:0;line-height:0;">&nbsp;</td>');

  const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Giriş kodunuz: ${escapeHtml(code)} · ${expiresInMinutes} dakika geçerlidir.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${COLORS.card};border-radius:20px;overflow:hidden;border:1px solid ${COLORS.line};">

    <!-- Üst bant -->
    <tr><td style="background:${COLORS.brand};background-image:linear-gradient(135deg,${COLORS.brandLight} 0%,${COLORS.brand} 60%,#9a3a0e 100%);padding:28px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td align="center" width="40" height="40" style="width:40px;height:40px;background:#ffffff;border-radius:11px;font-family:${FONT};font-size:15px;font-weight:800;color:${COLORS.brand};">${mark}</td>
        <td style="padding-left:12px;font-family:${FONT};font-size:19px;font-weight:700;color:#ffffff;">${brand}</td>
      </tr></table>
      <div style="font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;color:#ffffff;padding-top:22px;">Giriş kodunuz hazır</div>
    </td></tr>

    <!-- İçerik -->
    <tr><td style="padding:32px 32px 8px 32px;font-family:${FONT};color:${COLORS.ink};">
      <p style="margin:0 0 22px 0;font-size:16px;line-height:1.6;color:${COLORS.muted};">Hesabınıza giriş yapmak için aşağıdaki doğrulama kodunu ilgili alana girin.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 22px auto;"><tr>${digitCells}</tr></table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="font-family:${FONT};font-size:14px;color:${COLORS.muted};padding-bottom:26px;">
          Bu kod <strong style="color:${COLORS.ink};">${expiresInMinutes} dakika</strong> boyunca geçerlidir ve yalnızca bir kez kullanılabilir.
        </td>
      </tr></table>

      <!-- Güvenlik notu -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${COLORS.accentSoft};border-left:4px solid ${COLORS.accent};border-radius:10px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:1.55;color:${COLORS.muted};">
          <strong style="color:${COLORS.ink};">Güvenliğiniz için:</strong> Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz. Kodu kimseyle paylaşmayın; ${brand} ekibi sizden asla kod istemez.
        </td>
      </tr></table>
    </td></tr>

    <!-- Alt bilgi -->
    <tr><td style="padding:24px 32px 30px 32px;font-family:${FONT};font-size:12.5px;line-height:1.6;color:#7a838d;text-align:center;">
      <div style="border-top:1px solid ${COLORS.line};padding-top:18px;">
        Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayın.<br>
        <a href="${siteHref}" style="color:${COLORS.brand};text-decoration:none;font-weight:600;">${siteHost}</a>
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
