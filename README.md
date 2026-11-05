# Güzel Teknoloji — Giriş Altyapısı

Mobil öncelikli, Türkçe ve erişilebilir bir giriş ekranı ile bunu güvenle çalıştıran kimlik doğrulama altyapısı.

- **Web:** React 19 + TypeScript + Vite + Tailwind CSS 4 (`apps/web`)
- **API:** Node.js + Express 5 + TypeScript (`apps/api`)
- **Veritabanı:** MySQL 8+ / MariaDB 10.6+ + Prisma 7
- **Ortak:** Zod şemaları ve tipler (`packages/shared`)
- **Paket yönetimi:** npm workspaces

Bu sprint yalnızca giriş deneyimini kapsar. Kayıt, şifre sıfırlama ve panel bilinçli olarak yoktur.

## Gereksinimler

- Node.js 22 veya 24 (LTS)
- MySQL 8+ ya da MariaDB 10.6+ (lokal kurulum: XAMPP, Laragon veya MySQL Installer)

## Kurulum

```bash
npm install                      # bağımlılıklar + Prisma istemcisi (postinstall)
cp .env.example .env             # Windows: copy .env.example .env
```

`.env` içinde en azından şu alanları doldurun:

| Değişken        | Açıklama                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`  | `mysql://kullanici:sifre@localhost:3306/guzel_auth`                                                               |
| `COOKIE_SECRET` | En az 32 karakter. Üretmek için: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `APP_URL`       | Geliştirmede `http://localhost:5173`                                                                              |

Zorunlu bir değişken eksik ya da geçersizse API başlamaz ve hangi alanın sorunlu olduğunu açıkça yazar.

## Veritabanı

```bash
# 1) Boş veritabanını oluşturun (phpMyAdmin veya mysql istemcisiyle):
#    CREATE DATABASE guzel_auth CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

npm run db:deploy    # mevcut migration'ları uygular (production'da da bu kullanılır)
npm run db:migrate   # yalnızca geliştirme: şema değiştiğinde yeni migration üretir
npm run db:generate  # Prisma istemcisini yeniden üretir
```

`prisma migrate dev` geçici bir "shadow database" oluşturur, bu yüzden MySQL kullanıcısının `CREATE DATABASE` yetkisi olmalıdır. Paylaşımlı sunucularda yalnızca `db:deploy` kullanın.

Tablolar: `User`, `PasswordCredential`, `AuthIdentity`, `Session` (bkz. [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)).

## Geliştirme test kullanıcısı (yalnızca geliştirme)

Kayıt ekranı olmadığı için e-posta ve şifre girişini denemek üzere bir kullanıcı oluşturan betik vardır. Betik `NODE_ENV=production` ortamında çalışmayı reddeder ve kod içinde sabit bir şifre barındırmaz.

`.env` dosyasına ekleyin:

```
SEED_USER_EMAIL=deneme@example.com
SEED_USER_PASSWORD=en-az-12-karakterlik-bir-sifre
SEED_USER_NAME=Deneme Kullanıcı
```

```bash
npm run db:seed:dev   # kullanıcıyı oluşturur; varsa şifresini günceller
```

## Çalıştırma

```bash
npm run dev           # API (http://localhost:3000) + Web (http://localhost:5173)
```

Tarayıcıda **http://localhost:5173/login** adresini açın. Vite, `/api` isteklerini API'ye proxy'ler. Böylece cookie'ler first-party kalır ve CORS gerekmez.

## Komutlar

| Komut                                                   | Açıklama                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                                         | Web (`apps/web/dist`) ve API (`apps/api/dist`) derlemesi                                                                                                                                                                              |
| `npm start`                                             | Derlenmiş API'yi çalıştırır                                                                                                                                                                                                           |
| `npm test`                                              | API entegrasyon testleri ve web bileşen/erişilebilirlik testleri (Vitest)                                                                                                                                                             |
| `npm run test:responsive`                               | 320–1920px, yatay telefon, %200 zoom ve açık klavye senaryolarında taşma, erişim ve klavye testleri. Sistemdeki Edge'i kullanır (`PW_CHANNEL=chrome` ile Chrome). Ekran görüntüleri `apps/web/e2e/.screenshots/` klasörüne kaydedilir |
| `npm run lint` / `npm run typecheck` / `npm run format` | Kod kalitesi                                                                                                                                                                                                                          |

API testleri veritabanı gerektirmez: servis katmanı repository arayüzüne bağlıdır ve testlerde bellek içi bir uygulama kullanılır.

## API

| Yöntem ve yol                   | Açıklama                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`               | Servis ve veritabanı durumu (`200` ya da `503`)                                                                                   |
| `GET /api/auth/providers`       | `{ "google": boolean }`: Google girişinin yapılandırılıp yapılandırılmadığı                                                       |
| `POST /api/auth/login`          | `{ email, password }` → `200 { user }` ve oturum cookie'si; `401 INVALID_CREDENTIALS`, `400 VALIDATION_ERROR`, `429 RATE_LIMITED` |
| `GET /api/auth/me`              | Aktif oturumun kullanıcısı ya da `401 UNAUTHENTICATED`                                                                            |
| `POST /api/auth/logout`         | Oturumu iptal eder → `204`                                                                                                        |
| `GET /api/auth/google`          | Google OIDC akışını başlatır (303 yönlendirme)                                                                                    |
| `GET /api/auth/google/callback` | Google dönüşü. Başarıda `POST_LOGIN_PATH`'e, hatada `/login?hata=<kod>` adresine yönlendirir                                      |

Hata gövdesi her zaman `{ "error": { "code": "...", "message": "..." } }` biçimindedir. POST isteklerinde `Origin` başlığı izinli bir origin olmalıdır (CSRF koruması).

## Google OAuth kurulumu

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → OAuth consent screen** bölümünü yapılandırın (scope'lar: `openid`, `email`, `profile`).
2. **Credentials → Create credentials → OAuth client ID → Web application** adımıyla bir istemci oluşturun.
3. **Authorized redirect URIs** alanına şunları ekleyin:
   - Geliştirme: `http://localhost:5173/api/auth/google/callback`
   - Production: `https://alanadiniz.com/api/auth/google/callback`
4. `.env` içinde `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` alanlarını doldurun. Gerekirse `GOOGLE_REDIRECT_URI` ile adresi açıkça belirtin; bu değer Console'daki adresle birebir aynı olmalıdır.

Bu alanlar boşsa API uyarı log'u yazar ve Google butonu "Google ile giriş şu anda kullanılamıyor" mesajını gösterir. Sahte bir başarılı giriş yapılmaz.

Hesap eşleştirme kuralları için bkz. [docs/auth-policy.md](docs/auth-policy.md).

## E-posta ile devam et ve doğrulama kodu

E-Posta İle Devam Et akışı önce yalnızca e-posta sorar. Kayıtlı (şifreli) hesapta şifre, kayıtlı olmayan e-postada **6 haneli kod** istenir; kod doğrulanınca hesap açılır. Kod e-postası için `.env` içinde `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` tanımlayın (CloudPanel'de bir posta kutusu açın).

- **Geliştirmede SMTP yoksa** kod e-postaya gitmez; API konsolunda `[GELİŞTİRME] ... giriş kodu: 123456` satırı olarak görünür.
- **Production'da SMTP yoksa** kod isteği `503` döner ve ekranda "Doğrulama e-postası şu anda gönderilemiyor" yazar.
- Yeni tablo `EmailLoginCode` için `npm run db:deploy` çalıştırın (migration: `20261104120000_email_login_code`).
- **Apple ile giriş:** butonu hazırdır ama Apple Developer bilgileri verilmediği için "şu anda kullanılamıyor" mesajı gösterir.

## Yardım penceresi (gömülü destek formu)

"Yardıma Mı İhtiyacınız Var?" penceresi, destek formunu iframe ile doğrudan gösterir. Adres `.env` içinde:

```
VITE_SUPPORT_FORM_URL=https://destek.guzelteknoloji.com/form/destek?source=...&embed=1
VITE_SUPPORT_TITLE=Yardıma Mı İhtiyacınız Var?   # opsiyonel
```

Bu değer derleme sırasında web uygulamasına gömülür (değiştirince `npm run build`) ve API aynı değişkenden CSP `frame-src` kuralını üretir (API'yi yeniden başlatın). Adres https olmalıdır; boşsa pencerede "Destek formu henüz eklenmedi" görünür.

**Form sitesinin tarafında:** `destek.guzelteknoloji.com`, `https://pos.guzelteknoloji.com` adresinin kendisini çerçevelemesine izin vermelidir (`X-Frame-Options` kaldırılmalı veya `Content-Security-Policy: frame-ancestors https://pos.guzelteknoloji.com` olmalı). Aksi halde pencerede boş/hata sayfası görünür; geçici çözüm olarak "Formu Yeni Sekmede Aç" bağlantısı vardır.
Marka adı, slogan ve logo [apps/web/src/config/brand.config.ts](apps/web/src/config/brand.config.ts) dosyasından değiştirilir.

## Production (CloudPanel) notları

**Adım adım sunucu kurulumu (DNS, SSL, Git, PM2) için: [docs/DEPLOY.md](docs/DEPLOY.md).** Kod sunucuya Git ile taşınır; güncelleme: `bash deploy/update.sh`. PM2 ayarı: `ecosystem.config.cjs`, `.env` şablonu: `deploy/.env.production.example`.

En basit ve en güvenli kurulum **tek Node.js sitesi**dir: web ve API aynı domainden sunulur.

```bash
npm ci
npm run build
npm run db:deploy
# .env: NODE_ENV=production, APP_URL=https://alanadiniz.com, TRUST_PROXY=1,
#       WEB_DIST_DIR=../web/dist, DATABASE_URL=..., COOKIE_SECRET=...
npm start             # CloudPanel'de uygulama portu PORT ile eşleşmeli
```

- `NODE_ENV=production` olduğunda `APP_URL` https olmak zorundadır ve cookie'ler `Secure` + `__Host-` önekiyle yazılır.
- Web ve API ayrı domainlerde olacaksa `CORS_ORIGINS`, `COOKIE_DOMAIN` ve web derlemesi için `VITE_API_BASE_URL` ayarlanır.
- Hız sınırlama bellek içidir. Birden fazla süreç (PM2 cluster vb.) kullanılacaksa paylaşılan bir depo eklenmelidir.

## Klasör yapısı

```
apps/
  api/            Express API, Prisma şeması ve migration'lar, seed betiği, testler
  web/            React uygulaması, e2e/ altında duyarlı görünüm testleri
packages/shared/  Ortak Zod şemaları ve API tipleri
docs/             Güvenlik ve kimlik politikası
```
#   g u z e l t e k n o l o j i - p o s  
 