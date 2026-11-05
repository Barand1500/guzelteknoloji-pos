import { parseEnv } from '../src/config/env';
import { smtpFailure, verifySmtp } from '../src/lib/mailer';

async function main() {
  // Yalnızca şema hata mesajları yazılır; ortam değişkenlerinin değerleri basılmaz.
  const env = parseEnv(process.env);
  if (!env.smtp) throw new Error('SMTP ayarları tanımlı değil.');
  console.log('SMTP bağlantısı ve kimlik doğrulaması kontrol ediliyor...');
  try {
    await verifySmtp(env);
    console.log(
      'SMTP bağlantısı, TLS ve kimlik doğrulaması başarılı. Mesaj gönderilmedi; alıcı teslimatı sınanmadı.',
    );
  } catch (error) {
    console.error('SMTP kontrolü başarısız:', smtpFailure(error));
    process.exitCode = 1;
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Yapılandırma hatası');
  process.exitCode = 1;
});
