# Kimlik doğrulama ve güvenlik politikası

Bu belge, giriş altyapısındaki güvenlik kararlarını ve gerekçelerini özetler.

## E-posta normalizasyonu ve benzersizlik

- E-posta, saklanmadan ve aranmadan önce `trim()` + küçük harfe çevrilir (`normalizeEmail`, `packages/shared`).
- Gmail'e özgü kurallar (nokta yok sayma, `+etiket` silme) **uygulanmaz**. Bu kurallar her sağlayıcıda geçerli değildir ve farklı kişilere ait adresleri yanlışlıkla birleştirebilir.
- `User.email` benzersizdir (`UNIQUE INDEX`). OAuth ile oluşturulan kullanıcılarda da doldurulur.

## Şifreler

- Şifreler Argon2id ile hash'lenir (m=19 MiB, t=2, p=1; OWASP önerisi). Sistemde düz metin ya da geri çözülebilir şifre bulunmaz.
- Şifre hash'i `kullanicilar.sifre_hash` alanında Argon2id PHC biçiminde tutulur. Google/Apple ve yalnızca e-posta koduyla açılan hesaplarda şifre alanları `NULL` kalır. Şifrenin oluşturma/güncelleme tarihleri ayrı alanlarda korunur; genel kullanıcı sorguları ve API yanıtları bu alanları içermez.
- Kabul edilen en uzun şifre 256 karakterdir. Bu sınır, aşırı uzun girdilerle hash maliyetini şişirmeye dayanan DoS denemelerini engeller.

## Hesap varlığının sızdırılmaması

- Kullanıcı yoksa, şifre yanlışsa ya da hesap pasifse (`DISABLED`) API aynı yanıtı verir: `401 INVALID_CREDENTIALS` – "E-posta veya şifre hatalı."
- Kullanıcı bulunamadığında da sahte bir Argon2 doğrulaması yapılır. Böylece yanıt süresinden hesabın var olup olmadığı anlaşılamaz.

## Oturumlar

- Girişte 256 bitlik rastgele, opak bir token üretilir. Bu token yalnızca cookie'ye yazılır.
- Veritabanında token'ın kendisi değil, `SHA-256` hash'i (`Session.tokenHash`) saklanır. Veritabanı sızsa bile oturumlar ele geçirilemez.
- Cookie ayarları: `HttpOnly`, `SameSite=Lax`, `Path=/`. Production'da ayrıca `Secure` olur ve `__Host-gt_session` önekiyle Domain'siz yazılır, bu da alt alan adlarının cookie'nin üzerine yazmasını engeller.
- **Rotation:** Her başarılı girişte varsa eski token iptal edilir ve yeni token üretilir (session fixation koruması).
- **Revocation:** `POST /api/auth/logout`, `Session.revokedAt` alanını doldurur. Süresi geçmiş ya da iptal edilmiş oturum kabul edilmez.
- Tarayıcıda localStorage veya sessionStorage içinde token tutulmaz. Ön yüz oturumu her zaman `/api/auth/me` ile sunucudan öğrenir.

## CSRF değerlendirmesi

Cookie tabanlı oturumlarda CSRF riski vardır. Bu risk iki katmanla azaltılır:

1. `SameSite=Lax`: siteler arası POST isteklerinde cookie gönderilmez.
2. Origin kontrolü: GET/HEAD/OPTIONS dışındaki tüm `/api` isteklerinde `Origin` (yoksa `Referer`) başlığı, `APP_URL` ve `CORS_ORIGINS` listesindeki değerlerden biri olmalıdır. Aksi halde istek `403 FORBIDDEN_ORIGIN` ile reddedilir.

GET uç noktaları durum değiştirmez. Google callback'i yalnızca oturum açar ve state, PKCE ile nonce tarafından korunur.

## Google OAuth 2.0 / OpenID Connect

- Akış sunucu tarafında, authorization code yöntemiyle `openid-client` kütüphanesi kullanılarak yürütülür.
- PKCE (S256), `state` ve `nonce` her istekte yeniden üretilir. Bu değerler 10 dakika geçerli, imzalı, HttpOnly ve yalnızca `/api/auth/google` yolunda geçerli bir cookie'de taşınır. Callback'te sonuç ne olursa olsun cookie silinir (tek kullanımlık).
- Callback URL'i Host başlığından değil, yapılandırılmış `GOOGLE_REDIRECT_URI` değerinden kurulur. Google da yalnızca Console'a kayıtlı redirect URI'yi kabul eder.
- ID token'ın imzası, `iss`, `aud`, `exp` ve `nonce` alanları kütüphane tarafından doğrulanır.
- Log'a `code`, token ya da query string yazılmaz.

### Hesap eşleştirme politikası

Google kimliği, değişmez kullanıcı kimliği olan `sub` ile tanınır (`AuthIdentity(provider, providerUserId)`). Sadece e-posta metni eşleşiyor diye **asla otomatik birleştirme yapılmaz**.

| Durum                                                      | Sonuç                                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `(GOOGLE, sub)` daha önce bağlanmış                        | O kullanıcıyla giriş yapılır                                                                                                      |
| Tarayıcıda aktif bir oturum var, `sub` bağlı değil         | Kimlik **oturumdaki kullanıcıya** bağlanır (açık bağlama; kullanıcı hesabının sahibi olduğunu zaten kanıtlamıştır)                |
| Google e-postası doğrulanmamış (`email_verified !== true`) | Reddedilir: `google_eposta_dogrulanmamis`                                                                                         |
| Aynı e-postayla mevcut bir hesap var                       | Reddedilir: `google_hesap_mevcut`. Kullanıcıya önce e-posta ve şifreyle girip ardından Google ile devam ederek bağlaması söylenir |
| Hiçbiri                                                    | Yeni kullanıcı ve kimlik oluşturulur, `emailVerifiedAt` doldurulur                                                                |

## Hız sınırlama

- `POST /api/auth/login`: IP başına 15 dakikada 30 deneme, (IP + e-posta) başına 15 dakikada 8 deneme.
- `GET /api/auth/google*`: IP başına dakikada 20 istek.
- Bellek içi depo kullanılır ve **tek süreç** için doğrudur. Birden fazla süreç ya da sunucuya ölçeklenirken paylaşılan bir depo (MySQL/Redis store) eklenmelidir.
- Reverse proxy arkasında gerçek IP'nin alınabilmesi için `TRUST_PROXY=1` ayarlanmalıdır.

## Loglama

- `pino` ile yapılandırılmış log tutulur. Cookie, authorization, password ve token alanları maskelenir.
- İstek log'una yalnızca yöntem, query string içermeyen yol, durum kodu ve süre yazılır.
- İstemciye iç hata ayrıntısı gönderilmez (`500 INTERNAL_ERROR`).

## Gelecek için genişleme noktaları

- **Rol/yetki:** `User` modeline `Role` / `UserRole` ilişkisi eklenebilir. Oturum doğrulaması (`AuthService.getSession`) zaten kullanıcıyı döndürdüğü için yetki ara katmanı bunun üzerine kurulabilir.
- **OTP / şifresiz giriş:** Yeni bir `EmailLoginChallenge` modeli ve `AuthService.loginWithEmailCode` metodu eklenir. Ön yüzde yalnızca `EmailLoginForm` ve `authApi` değişir.
- **Diğer OAuth sağlayıcıları:** `AuthProvider` enum'una değer eklemek yeterlidir.
- **Oturum temizliği:** Süresi dolmuş oturumlar için periyodik bir `DELETE FROM Session WHERE expiresAt < NOW() - INTERVAL 30 DAY` görevi eklenebilir (`expiresAt` indekslidir).

## E-posta ile devam et: şifre veya e-posta kodu

`POST /api/auth/email/start { email }` hesabın durumuna göre iki yanıttan birini döndürür:

| Durum                                                     | Yanıt                                                                                         | Ardından                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| E-postada şifre hash'i bulunan hesap var                  | `{ step: "password" }`                                                                        | `POST /api/auth/login`                        |
| Hesap yok ya da hesabın şifresi yok (ör. yalnızca Google) | `{ step: "code", resendAfterSeconds, expiresInSeconds }` ve e-postaya 6 haneli kod gönderilir | `POST /api/auth/email/verify { email, code }` |

Kod doğrulanınca: hesap yoksa oluşturulur (`emailVerifiedAt` dolu), varsa o hesapla oturum açılır. Kod e-posta sahipliğini kanıtladığı için, aynı e-postalı mevcut hesaba girmek **otomatik birleştirme değildir**; sağlayıcı kimliği (Google `sub`) bu yolla bağlanmaz.

**Kod güvenliği**

- Kriptografik rastgele (`crypto.randomInt`) 6 hane; MySQL'e yazılmaz. Yalnızca Redis'te `HMAC-SHA256(COOKIE_SECRET, "e-posta:kod")` hash'i tutulur. Redis anahtarında e-posta yerine anahtarlı hash kullanılır; IP ve açık e-posta saklanmaz. Karşılaştırma hash'in tüm baytları üzerinde yapılır.
- Kod kaydı Redis TTL ile 10 dakikada otomatik silinir. Doğru doğrulamada ve 5. yanlış denemede hemen silinir. Yeniden gönderim önceki kodu geçersiz kılar. Doğrulama/deneme sayımı/silme ile gönderim kotası Lua scriptleriyle atomiktir; eşzamanlı istekler aynı kodla iki kez oturum açamaz.
- Saatlik gönderim kotasında yalnızca rastgele istek kimliği ve zaman tutulur (kod/hash içermez); son gönderimden bir saat sonra otomatik silinir. SMTP hatasında yalnızca başarısız gönderimin kodu ve beklemesi silinir, kota korunur. Böylece SMTP hataları kota aşımına izin vermez.
- Redis bağlantısı zorunludur (`REDIS_URL`); kesintide `503 EMAIL_UNAVAILABLE` döner, MySQL veya süreç belleğine geri dönüş yapılmaz. Redis ayrı instance olarak, RDB/AOF kalıcılığı kapalı (`save ""`, `appendonly no`) ve yerel arayüze bağlı çalıştırılır. Sağlık kontrolü Redis'i de denetler.
- Ömür 10 dakika; tek kullanımlık; en fazla 5 yanlış deneme (sonra kod ölür); 60 sn'de bir yeniden gönderim; e-posta başına saatte en fazla 5 kod.
- Hız sınırı: `/email/start` IP başına 15 dk'da 30, (IP + e-posta) başına 8; `/email/verify` (IP + e-posta) başına 12.
- Hata mesajı tek tiptir: "Kod hatalı ya da süresi dolmuş" (yanlış, süresi dolmuş, kullanılmış ve deneme hakkı bitmiş aynı yanıtı verir).

**Bilinen takas (ürün kararı):** `/email/start` yanıtı bir e-postanın kayıtlı olup olmadığını ele verir (hesap numaralandırma). Şifre girişinde bunu gizlemek için aynı yanıt verilirdi; ancak istenen akış bu ayrımı gerektirir. Risk, sıkı hız sınırı ve gönderim kotasıyla azaltılır. Daha katı bir model istenirse akış her e-posta için kod gönderecek şekilde (şifresiz) birleştirilebilir.

**E-posta gönderimi (SMTP):** `SMTP_*` ve `MAIL_FROM` ile yapılandırılır (`nodemailer`). SMTP yoksa **yalnızca geliştirmede** kod API konsoluna yazılır; production'da SMTP yoksa kod isteği `503 EMAIL_UNAVAILABLE` döner (sahte "gönderildi" yoktur).

## Apple ile giriş

Arayüzde buton vardır, backend henüz yapılandırılmamıştır. `GET /api/auth/apple` oturum açmaz; `/login?hata=apple_yapilandirilmamis` adresine yönlendirir. Gerçek akış için Apple Developer hesabı (Services ID, Team ID, Key ID, `.p8` anahtarı) ve `response_mode=form_post` için SameSite=None OAuth cookie'si gerekir.

**SMTP TLS:** 587 portunda bağlantı `requireTLS` ile zorunlu şifrelenir. Sertifika doğrulaması **hiçbir koşulda kapatılmaz**; kendinden imzalı sertifika için `SMTP_TLS_CA_FILE` ile yalnızca o sertifika güvenilir eklenir (sertifika sabitleme). Giriş kodu e-postasının şablonu `apps/api/src/lib/mail-templates.ts` içindedir.
