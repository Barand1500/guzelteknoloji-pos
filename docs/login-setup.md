# Giri? y?ntemleri

Prisma User tablosundaki lastLoginMethod (EMAIL / GOOGLE / APPLE) ve lastLoginAt her başarılı giri?te g?ncellenir. Session.loginMethod her oturumun y?ntemini saklar. AuthIdentity ba?l? sosyal hesaplar? saklar. Eski kay?tlar?n y?ntemi bilinmedi?i i?in NULL b?rak?l?r.

## Yay?na alma

1. Sunucudaki .env i?inde SMTP_PASS ve Google OAuth client ID/secret değerlerini doldurun. Google web uygulamas? callback: https://pos.guzelteknoloji.com/api/auth/google/callback
2. Apple Developer hesab?nda web i?in Services ID ve domain/return URL tanımlay?n. APPLE_CLIENT_ID bu Services ID, APPLE_CLIENT_SECRET ise Apple anahtar?yla ?retilmi? ES256 JWT olmal?d?r. JWT en fazla 6 ay ge?erlidir; s?resi dolmadan yenileyin. Return URL: https://pos.guzelteknoloji.com/api/auth/apple/callback
3. npm ci, npm run db:deploy, npm run build ?al??t?r?n ve API s?recini yeniden ba?lat?n.
4. Reverse proxy /api dahil istekleri 127.0.0.1:3003 adresine y?nlendirmeli. /api/health ve /api/auth/providers JSON d?nd?rmeli. WEB_DIST_DIR, API ?al??ma dizinine g?re ??z?l?r.

Apple callback HTTPS ?zerinden form POST kullan?r; imzal?, Secure ve SameSite=None ak?? ?erezi ile state/nonce do?rulan?r. Ayn? e-postal? hesaplar otomatik birle?tirilmez. Apple ile daha ?nce a??lm?? hesap e-posta koduyla da kullan?labilir.

Kaynaklar: https://developer.apple.com/documentation/signinwithapplerestapi ; https://github.com/panva/openid-client

## SMTP hata kontrolü

`MAIL_FROM` tercih edilir; `SMTP_FROM` da alternatif isim olarak okunur. İkisi varsa `MAIL_FROM` önceliklidir. SMTP_USER/SMTP_PASS birlikte tanımlanmalıdır. Deploy zaten PM2 restart yapar.

Sunucuda `npm run smtp:check` mesaj göndermeden SMTP bağlantıs?n? ve kimlik doğrulamasını test eder. EAUTH: kullan?c?/uygulama şifresi, ETIMEDOUT: bağlantı/port, TLS kategorisi: sertifika/TLS kontrol edilmelidir. Bu kontrol başarılıysa ama gönderim başarısızsa `pm2 logs guzel-auth --lines 80 --nostream` i?indeki SMTP tanı alanlarına bakın. Sağlık kontrolü yalnızca API ve veritaban?n? sınar, SMTP gönderimini sınamaz.
