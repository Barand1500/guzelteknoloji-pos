# Sunucuya kurulum (CloudPanel + PM2 + Git)

Hedef: `https://pos.guzelteknoloji.com` — tek Node.js sitesi. Express hem `/api`'yi hem derlenmiş web uygulamasını sunar; nginx (CloudPanel vhost) trafiği `127.0.0.1:{App Port}` adresine yönlendirir. Kod sunucuya **Git ile** taşınır (zip yok); gizli bilgiler yalnızca sunucudaki `.env` dosyasında durur.

Bilgiler: site kullanıcısı `guzelteknoloji-pos`, veritabanı `guzelteknoloji-pos-db`, DB kullanıcısı `guzelteknoloji-pos-user`, DB sunucusu `127.0.0.1:3306`, klasör `/home/guzelteknoloji-pos/htdocs/pos.guzelteknoloji.com`, sunucu IP'si `46.197.176.51`.

## 0. Site açılmıyorsa önce bunlar (DNS + SSL)

1. **DNS:** Alan adının DNS'i **Metunic**'te (`ns1/ns2.metunic.com.tr`). Orada şu kaydı ekleyin:

   | Tür | Ad    | Değer           |
   | --- | ----- | --------------- |
   | A   | `pos` | `46.197.176.51` |

   Doğrulama (bilgisayarınızda): `nslookup pos.guzelteknoloji.com` → `46.197.176.51` dönmeli. Yayılması dakikalar–saatler sürebilir. "Sunucu bulunamadı" hatası DNS kaydı olmadığı içindir.

2. **SSL:** DNS çözülünce CloudPanel → Site → **SSL/TLS** → **New Let's Encrypt Certificate** → Create. Bu yapılmadan tarayıcı sertifika uyarısı verir.
3. **App Port:** CloudPanel → Site → Settings → Node.js bölümündeki **App Port** ile `.env` içindeki `PORT` **aynı** olmalı (ör. 3003). Node.js sürümü 22 veya 24 olmalı.

## 1. Kodu Git'e koyun (bilgisayarınızda, bir kez)

GitHub'da **Private** (özel) bir depo oluşturun, sonra proje klasöründe:

```bash
git add .
git commit -m "İlk sürüm"
git branch -M main
git remote add origin git@github.com:KULLANICI/DEPO.git
git push -u origin main
```

`.gitignore` gizli dosyaları (`.env`, `node_modules`, `dist`, sertifikalar, zip'ler) zaten dışarıda tutar. Gönderilmeden önce kontrol: `git status` içinde `.env` görünmemeli.

## 2. Sunucuya Git erişimi (bir kez, SSH ile)

```bash
ssh guzelteknoloji-pos@46.197.176.51
ssh-keygen -t ed25519 -C "pos-deploy" -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub
```

Çıkan satırı GitHub → depo → **Settings → Deploy keys → Add deploy key** (salt okunur) olarak ekleyin. Sonra:

```bash
printf 'Host github.com\n  IdentityFile ~/.ssh/deploy_key\n  IdentitiesOnly yes\n' >> ~/.ssh/config
chmod 600 ~/.ssh/config
cd ~/htdocs/pos.guzelteknoloji.com
git init -b main
git remote add origin git@github.com:KULLANICI/DEPO.git
git fetch origin main
git checkout -f -B main origin/main      # klasördeki eski dosyaların üzerine yazar; .well-known'a dokunmaz
```

## 3. `.env` dosyası

```bash
cp deploy/.env.production.example .env
chmod 600 .env
nano .env
```

| Alan            | Değer                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`          | CloudPanel'deki App Port                                                                                                                                         |
| `DATABASE_URL`  | `mysql://guzelteknoloji-pos-user:ŞİFRE@127.0.0.1:3306/guzelteknoloji-pos-db` (şifrede `@ # + / %` gibi karakter varsa URL-encode: `%40 %23 %2B %2F %25`)         |
| `COOKIE_SECRET` | **Gerçekten rastgele** olmalı: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` çıktısı. Elle yazılmış/anlamlı değer kullanmayın |
| `SMTP_PASS`     | `destek@guzelteknoloji.com` posta kutusunun şifresi                                                                                                              |

`VITE_SUPPORT_FORM_URL` (destek formu) derleme sırasında gömülür: `.env` build'den **önce** hazır olmalı. API de aynı değişkenden CSP `frame-src` üretir, bu yüzden değiştirince hem `npm run build` hem `pm2 restart guzel-auth --update-env` gerekir. Build sırasında çıkan "NODE_ENV=production is not supported in the .env file" uyarısı zararsızdır.

## 3.1 Doğrulama kodları

Kodlar ek servis gerektirmeden MySQL'de (`eposta_giris_kodlari`) tutulur; yalnızca HMAC hash saklanır. Ek kurulum yoktur, `sudo` gerekmez. Eski kod tablosu geçiş migration'ında kaldırılıp yeniden oluşturulur; bekleyen kodlar geçersiz olur, kullanıcı yeni kod ister.

## 4. Kurulum ve ilk başlatma

Marka logoları için `.env` içinde `UPLOADS_DIR=/home/guzelteknoloji-pos/uploads` ayarlayın ve bu dizine site kullanıcısının yazabilmesini sağlayın. Dizin web kökünün dışında olmalıdır. İlk açılış, MySQL'deki eski logo verilerini dosyaya taşır; başarısız olursa API başlamaz ve eski BLOB'lar yeniden deneme için korunur. Daha önce WebP'ye çevrilmiş logolar aynen taşınır; eski orijinalleri geri getirilemez.

`UPLOADS_DIR` kalıcı veridir: Git, `npm ci` veya dağıtım işlemleriyle temizlemeyin. **MySQL ve uploads dizinini birlikte yedekleyin ve birlikte geri yükleyin.**

```bash
npm ci
npm run build
npm run db:deploy          # tabloları oluşturur
npm install -g pm2
pm2 start ecosystem.config.cjs && pm2 save
pm2 status                 # guzel-auth → online
curl -s http://127.0.0.1:3003/api/health    # 3003 yerine kendi PORT'unuz
# → {"status":"ok","database":"ok"}
```

`database: "unavailable"` → `DATABASE_URL` yanlış. `pm2 logs guzel-auth --lines 40` ile bakın.

**Sunucu yeniden başlayınca otomatik açılsın:** CloudPanel → Cron Jobs → "@reboot" → komut: `/bin/bash -lc "pm2 resurrect"`.

## 5. Sonraki güncellemeler (tek komut)

Bilgisayarınızda `git push` yaptıktan sonra sunucuda:

```bash
cd ~/htdocs/pos.guzelteknoloji.com
bash deploy/update.sh
```

Bu komut `git pull`, `npm ci`, derleme, veritabanı migration'ı, PM2 yeniden başlatma ve sağlık kontrolünü sırayla yapar. `.env` Git'te olmadığı için korunur.

Servis durdurulmadan önce MySQL ve yazılabilir `UPLOADS_DIR` denetlenir; ön kontrol başarısızsa çalışan API durdurulmaz. Bu kontrol yedek almaz: özellikle sayısal ID geçişinden önce MySQL ve uploads yedeği alındığını doğrulayın.

## 6. E-posta (giriş kodu) için SMTP sertifikası

`smtp.guzelteknoloji.com` kendinden imzalı sertifika sunuyorsa uygulama güvenli bağlantıyı reddeder. Doğrulamayı kapatmayız; yalnızca o sertifikayı güvenilir ekleriz:

```bash
mkdir -p ~/certs
openssl s_client -starttls smtp -connect smtp.guzelteknoloji.com:587 \
  -servername smtp.guzelteknoloji.com </dev/null 2>/dev/null | openssl x509 > ~/certs/smtp-ca.pem
openssl x509 -in ~/certs/smtp-ca.pem -noout -subject -issuer -dates -fingerprint -sha256
```

Sonra `.env` içine `SMTP_TLS_CA_FILE=/home/guzelteknoloji-pos/certs/smtp-ca.pem` yazıp `pm2 restart guzel-auth --update-env` yapın. "hostname does not match" alırsanız sertifika başka bir ad içindir; geçerli sertifika (Let's Encrypt) kurmak en temizidir. SMTP çalışmazsa kayıtlı olmayan e-postalar kod alamaz ("Doğrulama e-postası şu anda gönderilemiyor").

## Notlar

- Sunucuda dev dosyaları (`eslint.config.js`, `.prettierrc.json`, `deploy/`, `apps/web/e2e/` …) görünür; zararsızdır, çalışmayı etkilemez. Çalışma için gereken: `apps/`, `packages/`, `package.json`, `package-lock.json`, `tsconfig.base.json`, `ecosystem.config.cjs`, `.env`.
- Üretimde kayıt ekranı yoktur: kullanıcılar e-posta kodu veya Google ile oluşur. `db:seed:dev` production'da çalışmayı reddeder.
- **Google ile giriş:** Console'da yetkili yönlendirme adresi `https://pos.guzelteknoloji.com/api/auth/google/callback`; `GOOGLE_CLIENT_ID/SECRET` doldurulmalı.
- Hız sınırlama bellek içidir: PM2'yi **tek süreç** bırakın.
- Sorun giderme: `502 Bad Gateway` → uygulama kapalı ya da `PORT` ≠ App Port (`pm2 logs`). Giriş sonrası oturum düşüyorsa `APP_URL` https olmalı ve `TRUST_PROXY=1` olmalı. Sertifika uyarısı → Let's Encrypt alınmamış (0. adım).
