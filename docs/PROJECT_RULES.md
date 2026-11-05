# Proje kuralları ve bağlam (insanlar ve yapay zeka asistanları için)

Bu belge, projeye ilk kez bakan bir geliştiricinin ya da yapay zekanın **önce** okuması gereken tek kaynaktır. Kod değiştirmeden önce okuyun; yeni bir kural geldiğinde bu belgeyi güncelleyin.

## 1. Projenin amacı ve kapsamı

Marka: **Güzel Teknoloji** (geçici; `apps/web/src/config/brand.config.ts` içinden değişir). Hedef, mobil öncelikli, Türkçe, modern, erişilebilir bir **giriş ekranı** ve bunu güvenle çalıştıran **kimlik doğrulama altyapısıdır**.

Referans fikir: üstte canlı marka alanı, altta sade giriş alanı, büyük yuvarlatılmış butonlar (Google ile devam et, E-Posta ile devam et, Yardıma mı ihtiyacınız var?). Başka bir sitenin adı, logosu, sloganı, ikonları ya da illüstrasyonları **kullanılmaz**; tasarım kopyalanmaz.

### Kapsam sınırı (ÇOK ÖNEMLİ)

Şu an yalnızca **giriş** vardır. Şunlar **yapılmaz**: kayıt olma, şifre sıfırlama, dashboard, profil, ayarlar, admin paneli, ürün/iş modülleri, gereksiz sahte sayfalar. Kayıt ekranı olmadığı için kullanıcılar yalnızca geliştirme seed komutuyla oluşur. Çalışmayan sahte link konmaz; özellik yoksa kullanıcıya metinle de anlatılmaz (bkz. kural 3.7). Facebook ve başka sosyal girişler **kesinlikle** eklenmez. Sosyal girişler yalnızca **Google** ve **Apple**'dır (Apple'ın arayüzü hazırdır, gerçek girişi henüz yapılandırılmamıştır; bkz. kural 3.9).

## 2. Teknik yığın ve komutlar

- npm workspaces monorepo: `apps/web` (React 19, TS, Vite, Tailwind 4, React Hook Form + Zod, Lucide), `apps/api` (Node 22+, Express 5, TS, Prisma 7 + **MySQL/MariaDB**), `packages/shared` (Zod şemaları, tipler).
- Veritabanı MySQL'dir (sunucuda CloudPanel + phpMyAdmin). PostgreSQL kullanılmaz.
- Strict TypeScript, `any` yasak, ESLint + Prettier. Karmaşık/kritik kodlara **nedenini anlatan Türkçe** yorum yazılır.
- Kullanıcıya görünen **tüm metinler Türkçe**; İngilizce placeholder/metin bırakılmaz.
- Komutlar: `npm run dev | build | test | test:responsive | lint | typecheck | format | db:deploy | db:seed:dev`. Ayrıntı: `README.md`.
- Bir değişiklik bitmeden `npm run lint`, `npm run typecheck`, `npm test` ve (görsel değişiklikte) `npm run test:responsive` geçmelidir.

## 3. Tasarım ve kullanıcı deneyimi kuralları

1. **Renk dengesi ~60/30/10:** %60 açık/nötr zemin, %30 marka turuncusu, %10 amber vurgu. Tokenlar `apps/web/src/styles/index.css` içindeki `@theme` bloğundadır; renkleri bileşenlerde sabit yazmayın. Beyaz metin taşıyan turuncu yüzeylerde AA kontrast için `brand-600` ve üstü kullanılır.
2. **Ekran düzeni:** Mobilde üst tanıtım ~1/3, alt giriş ~2/3 (esner). **Masaüstünde sol marka alanı 3, sağ giriş alanı 1 oranındadır** (`grid-cols-[minmax(0,3fr)_minmax(24rem,1fr)]`; sağ alan okunabilirlik için en az 24rem). Tablette ara düzen, kısa yatay ekranda sıkı iki kolon vardır.
3. **Hareket (az ve amaçlı):** Sol marka alanındaki nokta deseni **durağandır**; yalnızca fare (veya parmak) üzerinden geçerken yakındaki noktalar büyür, amber olur ve hafifçe uzaklaşır (`DotGrid.tsx`, canvas). İllüstrasyon ve diğer görseller **hareket etmez** (süzülme, dönme vb. istenmedi). Görünümler arası geçişte çıkan görünüm **aşağı kayarak** gider, yenisi **yukarıdan** gelir (geri dönüşte tersi). Tüm hareketler `prefers-reduced-motion` altında kapanır.
   3a. **Görsel:** Marka alanında **tek** illüstrasyon vardır: ChatGPT ile üretilen, şeffaf arka planlı çizgi tabanlı karakter (`src/assets/hero-worker.png`, 900px; orijinal 1254px dosya `docs/hero-worker.png`). Kartsız, doğrudan zemin üzerinde durur; ince beyaz kenar (çıkartma efekti) ve gölge ile öne çıkar (`HeroIllustration.tsx`). Kredi kartı benzeri görseller istenmedi. Değiştirmek için aynı adlı dosyayı değiştirmek yeterli.
   3b. **Yazım kuralı (büyük/küçük harf):** Butonlarda ve bağlantı metinlerinde her kelimenin ilk harfi büyük yazılır (Title Case), Türkçe karakter kurallarıyla: **"Google İle Devam Et"**, "Apple İle Devam Et", "E-Posta İle Devam Et", "Devam Et", "Çıkış Yap", "Diğer Seçenekler", "Yardıma Mı İhtiyacınız Var?", "Kodu Tekrar Gönder". Bu kural düğme etiketlerine, yükleniyor metinlerine ("Giriş Yapılıyor…") ve düğme niteliğindeki bağlantılara uygulanır. Başlıklar ve açıklama cümleleri normal cümle düzenindedir ("Hesabınıza giriş yapın!" başlığının sonunda ünlem vardır). "E-Posta" daima bu yazımla (P büyük) yazılır.

3c. **Buton animasyonu ("flow"):** `Button` bileşeninin `primary` ve `outline` varyantlarında, **yalnızca fare olan cihazlarda** (Tailwind `hover:` varyantı dokunmatikte çalışmaz) hover ile sağdan kayarak gelen bir **ok** belirir ve yazı hafifçe sola kayar. **Hover'da koyu/siyah dolgu veya renk değişimi yoktur** (istenmedi). Mobilde animasyon yoktur. Devre dışı/yükleniyor durumunda çalışmaz; kapatmak için `flow={false}`.

3d0. **Yardım bağlantısı:** "Yardıma Mı İhtiyacınız Var?" bağlantısının üstünde ayırıcı çizgi **yoktur**.

3d. **Giriş akışı (E-Posta İle Devam Et):** Önce yalnızca e-posta sorulur ("Devam Et"). Sunucu hesaba bakar: şifresi olan **kayıtlı hesap** → şifre adımı; **kayıtlı olmayan** (veya şifresi olmayan) e-posta → e-postaya 6 haneli kod gönderilir, kod adımı açılır; kod doğrulanınca hesap oluşturulur ve oturum açılır. Kayıt ekranı yoktur; hesap yalnızca bu kodla (veya Google ile) oluşur. Ayrıntı: `docs/auth-policy.md`.

3e. **Apple ile giriş:** Buton Google'ın altındadır ve görünür; ancak Apple Developer hesabı/anahtarları verilmediği için backend henüz yapılandırılmamıştır. Tıklanınca sahte giriş yapılmaz, "Apple ile giriş şu anda kullanılamıyor" mesajı gösterilir (`GET /api/auth/apple` → `/login?hata=apple_yapilandirilmamis`).

4. **Erişilebilirlik:** Dokunma hedefi ≥44px, görünür odak halkası, WCAG AA kontrast, klavye ile tam kullanım, ekran okuyucu etiketleri. Yatay taşma yok; 320px–1920px, yatay telefon, %200 zoom ve açık klavye desteklenir.
5. **Mobil tarayıcı:** `100dvh`, `env(safe-area-inset-*)`; içerik uzarsa sayfa doğal kayar, sabit footer içeriği kapatmaz.
6. **Yazım:** Arayüzde **"E-Posta"** yazılır (P büyük): "E-Posta ile devam et", "E-Posta ile giriş", alan etiketi "E-Posta".
7. **Gereksiz bilgilendirme yok:** E-Posta formunun altında "Kayıt olma ve şifre sıfırlama henüz aktif değil" gibi metin **gösterilmez**.
8. **Yardım penceresi:** "Yardıma Mı İhtiyacınız Var?" tıklanınca açılan pencere (bottom sheet / modal, `Sheet` bileşeni, `size="lg"`) **destek formunu iframe ile doğrudan içinde gösterir**; WhatsApp/e-posta/telefon kartları **kaldırıldı** (istenmedi). Form adresi `VITE_SUPPORT_FORM_URL` ile verilir (https zorunlu; boşsa "Destek formu henüz eklenmedi" boş durumu). Aynı değişkenden API, CSP `frame-src` kuralını türetir (yalnızca o origin çerçevelenebilir). Pencerede: yüklenirken form şeklinde iskelet (`animate-pulse`), form yüklenince yumuşak belirme, "Formu Yeni Sekmede Aç" bağlantısı (`rel="noopener noreferrer"`), 15 sn'de yüklenmezse bilgi uyarısı. Modal kuralları (yalnızca Esc/X ile kapanma) geçerlidir. iframe `sandbox` ile kısıtlıdır (scripts, forms, same-origin, popups, modals; üst sayfaya yönlendirme yok).

Gönderim başarısı animasyonu: form kendi sayfasından üst pencereye `postMessage` ile `submitted | success | sent | completed` (düz metin ya da `{type|event|status|action}`) gönderirse, **yalnızca form origin'inden ve bu iframe'den** geldiğinde animasyonlu "Talebiniz alındı!" ekranı çıkar (`SupportForm.tsx`). Form mesaj göndermiyorsa form kendi teşekkür ekranını gösterir.

### İkon paketleri

- `lucide-react`: genel arayüz ikonları (ok, kapat, göz vb.).
- `@phosphor-icons/react`: düz/duotone dekoratif ikonlar (`weight="fill" | "duotone"`).
- `react-icons`: marka logoları (`react-icons/fa6` → Apple, WhatsApp vb.; `react-icons/si` → diğer markalar). Marka ikonlarını markanın kendi rengiyle ve değiştirmeden kullanın.
- Yeni ikon gerekirse önce bu paketlere bakın; yeni paket eklemeyin. Yalnızca kullanılan ikonlar içe aktarılır (tree-shaking).

## 4. ORTAK TASARIM SİSTEMİ (sabit kural)

Gelecekteki tüm ekranlar **aynı** ortak bileşenlerle yapılır. Yeni sayfada input/modal/buton stilini yeniden icat etmeyin; ortak olanı kullanın, görünümü değiştirmek gerekirse **tek yerden** değiştirin.

| Öğe                  | Bileşen                       | Stilin tek kaynağı                                            |
| -------------------- | ----------------------------- | ------------------------------------------------------------- |
| Metin alanı          | `components/ui/TextField.tsx` | `styles/index.css` → `.field`, `.field-input`, `.field-label` |
| Modal / bottom sheet | `components/ui/Sheet.tsx`     | `styles/index.css` → `.modal-backdrop` + Sheet sınıfları      |
| Buton                | `components/ui/Button.tsx`    | Button içindeki `variants`                                    |
| Uyarı                | `components/ui/Alert.tsx`     | Alert                                                         |

### 4.1 Input kuralı (yüzen etiketli / outlined)

- Etiket alan boşken **içeride** gri durur; odaklanınca ya da dolunca **yukarı kayıp kenarlığın üstüne** oturur, küçülür ve marka rengini alır (ör. "E-Posta" metni kutu çizgisini keser). Düz, etiketi dışarıda duran ya da placeholder'a yaslanan stil **istenmez**.
- Köşeler yuvarlak (`1rem`), kenarlık açık mavimsi gri, odakta marka rengi + yumuşak halka. Hata durumunda **metin gösterilmez**: kenarlık ve etiket kırmızı olur, alanın sonunda kırmızı bir ünlem (`CircleAlert`) belirir (şifre alanında göz düğmesinin soluna). Ünlem bir düğmedir: üzerine gelince (masaüstü), klavye ile odaklanınca ya da dokununca (mobil) hatanın nedenini yazan kırmızı bir konuşma kutusu açılır; Esc veya dışarı dokunma kapatır. Kutu `aria-describedby` hedefidir (`TextField.tsx`). Sunucu kaynaklı genel hatalar (yanlış şifre, ağ hatası) formun üstündeki `Alert` ile gösterilir.
- Teknik: `placeholder=" "` zorunludur (CSS `:placeholder-shown` ile doluluğu anlar); etiket DOM'da input'tan **sonra** gelir. `TextField` bunu zaten yapar, doğrudan `<input>` kullanmayın.

### 4.2 Modal kuralı

- Modal/bottom sheet **asla** sağa-sola/dışarı (arka plana) tıklanınca kapanmaz.
- **Yalnızca** `Esc` tuşu veya **X (Kapat)** düğmesi ile kapanır.
- Açılışta odak içeri alınır, Tab odağı modal içinde döner, kapanınca odak açan öğeye döner, arka plan kaydırması kilitlenir (`Sheet.tsx` bunları yapar).
- Test: `SupportSheet.test.tsx` → "arka plana tıklamak modalı KAPATMAZ". Yeni modallar `Sheet` üzerine kurulur ve aynı testi sağlar.

## 5. Güvenlik özeti (ayrıntı: `docs/auth-policy.md`)

- Şifreler Argon2id; token/şifre/secret tarayıcı depolamasında tutulmaz. Oturum: HttpOnly + SameSite=Lax cookie (production'da Secure + `__Host-`), DB'de yalnızca SHA-256 özeti, girişte rotation, çıkışta revocation.
- CSRF: SameSite + durum değiştiren isteklerde Origin kontrolü. Hız sınırlama, gizli bilgi sızdırmayan loglama, hesap varlığını sızdırmayan hata mesajları.
- Google: sunucu tarafı authorization-code + PKCE + state + nonce; ID token doğrulaması `openid-client` ile. **Yalnızca e-posta eşleşiyor diye hesap otomatik birleştirilmez.**
- Gerçek şifre/secret repoya konmaz; `.env` ignore edilir, örnekler `.env.example`'dadır. Seed komutu production'da çalışmaz.
- Zod ile env doğrulaması: zorunlu değişken eksikse API açık hatayla başlamaz. Google değişkenleri opsiyoneldir.

## 6. Önemli kararlar

- Tek origin dağıtımı varsayılır (API aynı sunucudan SPA'yı sunar); ayrı domain için `CORS_ORIGINS`, `COOKIE_DOMAIN`, `VITE_API_BASE_URL` vardır.
- E-Posta girişi `authApi` + `EmailLoginForm` içinde izole; ileride OTP/şifresiz akışa geçmek yalnızca bunları ve auth servisini etkiler.
- Rol/yetki (RBAC) henüz yok; modeller buna genişletilebilir tutuldu.
- Geliştirme: `npm run dev` hem API'yi (3000) hem Vite'ı (5173) başlatır. API çalışmıyorsa tarayıcıda `502 Bad Gateway` görülür; önce `.env` oluşturulmuş olmalıdır.

## 7. Dağıtım

- Sunucu: CloudPanel Node.js sitesi (`pos.guzelteknoloji.com`), PM2 ile tek süreç, MySQL `127.0.0.1:3306`. DNS Metunic'tedir (`pos` için A kaydı → 46.197.176.51). Adımlar: `docs/DEPLOY.md`.
- Kod sunucuya **Git ile** taşınır (özel depo + deploy key); **zip paketi kullanılmaz** (kullanıcı istemedi). Güncelleme: `bash deploy/update.sh`. `.gitignore` gizli dosyaları, `node_modules`, `dist`, sertifikaları ve arşivleri dışarıda tutar; yeni gizli dosya türü eklenirse oraya da ekleyin.
- Production'da CSP: `script-src 'self'` ve `style-src 'self'`; yalnızca satır içi `style=` nitelikleri açıktır (`style-src-attr`). Yeni kod satır içi `<script>`/`<style>` bloğu eklememeli, harici CDN kullanmamalı.
- Secret'lar (SMTP şifresi, DB şifresi, COOKIE_SECRET) yalnızca sunucudaki `.env` dosyasında durur; repoya girmez. `COOKIE_SECRET` rastgele üretilmelidir (elle yazılmış değer kullanılmaz).

## 8. Uygulama aşaması: giriş sonrası ekranlar (stok kartı)

**Ürünün amacı:** Patronun istediği **stok kartı girme** uygulaması. Giriş sonrası ekranlar bunun etrafında kurulur (stok kartı formu, ürün listesi, kategoriler, markalar, özellikler, toplu görsel yükleme). Bu kapsam, kural 1'deki "yalnızca giriş" sınırını **genişletir**; yeni modüller bu bölümün kurallarına uyar.

**Geçici giriş (sonradan kaldırılacak):** "Yardıma Mı İhtiyacınız Var?" bağlantısının altında **"Test Kullanıcısı Olarak Devam Et"** butonu bulunur; tıklanınca doğrudan uygulamaya girilir. Bu bir geliştirme kolaylığıdır, kalıcı değildir: kodda tek yerde toplanmalı, "GEÇİCİ" diye işaretlenmeli ve kolayca silinebilmelidir. Üretimde gerçek kimlik doğrulamayı atlayan güvenli olmayan bir yol bırakılmaz (nasıl yapılacağı ayrıca kararlaştırılır).

### 8.1 Kullanım kuralları (en önemli kural)

1. **Sade, hoş, güzel.** Amaç, bilgisayar bilgisi az bir kullanıcının rahatça kullanabilmesidir. "Maymun bile kullanabilmeli": ne yapacağı ekrana bakınca anlaşılmalı.
2. **Az yazı.** Ekranı metinle boğma; kısa etiketler, net ikonlar. Açıklama gerekiyorsa tek kısa satır ya da ipucu balonu.
3. **Her iş kolay ve az adımda** yapılabilmeli. Gelişmiş/nadir alanlar varsayılan olarak kapalı/katlı olabilir.
4. **Mobil uyumlu (responsive) zorunlu.** Her ekran telefon, tablet ve masaüstünde tasarlanır ve denenir.
5. Referans ekran görüntüleri yalnızca **ne yapıldığını anlamak** içindir: tasarımları **birebir kopyalanmaz**; sistemin kendi ortak tasarım sistemi (kural 4) kullanılır.

### 8.2 Git ve ortak çalışma

- Projede birden fazla kişi GitHub üzerinden çalışır. `git pull`/çekme yapmadan önce karşı tarafın **ne değiştirdiği incelenir** (`git fetch` → `git log HEAD..origin/main`, `git diff HEAD...origin/main`); çakışma ve beklenmedik değişiklik varsa körü körüne birleştirilmez, kullanıcıya özetlenir.
- Kullanıcı istemeden commit/push yapılmaz.

### 8.3 Kararlar (uygulama aşaması)

1. **Tema:** Gündüz/gece modu olur. Renkler **60-30-10 kuralına** göre seçilir (60 zemin, 30 yüzey/ikincil, 10 vurgu), yumuşak ve göze hoş; ana vurgu şimdilik turuncu (değişebilir).
2. **Renkler tek yerden gelir:** Tüm renkler yalnızca merkezi **tema token'larından** (CSS değişkenleri / `@theme`) okunur; bileşenlerde sabit renk kodu yazılmaz. Renk değişikliği tek dosyadan yapılabilmelidir.
3. **Veri:** Şimdilik **mock data**; hepsi tek bir klasörde (ör. `apps/web/src/mocks/`) durur ve gerçek API'ye geçerken klasör silinip yerine servis katmanı konabilmelidir. Bileşenler veriyi doğrudan mock dosyasından değil bir servis/hook arayüzünden alır.
4. **İlk ekran:** Girişten sonra doğrudan **yeni stok kartı ekleme** ekranı.
5. **Özgün tasarım:** Klasik "soldaki menü" yapay zeka şablonuna benzemeyecek; yaratıcı, özgün bir gezinme (mobilde alt gezinme dahil). Responsive zorunlu.
6. **Test butonu** sunucuda da görünür; kodda yorum satırı ile "GEÇİCİ — sonra kaldırılacak" diye işaretlenir.
7. Kategori / marka / özellikler, stok kartı alanlarını besler. Menü: Anasayfa → Ürünler → (Ürün, Kategoriler, Markalar, Özellikler, Toplu Görsel Yükleme).

### 8.4 Kod düzeni (uygulama aşaması)

- **Renkler:** gündüz değerleri `styles/index.css` `@theme`, gece değerleri `styles/theme.css` (aynı token adları). Bileşende renk kodu yazılmaz; metin olarak vurgu için `text-brand-ink`.
- **Yollar/menü:** `config/navigation.ts`; yeni sayfa = oraya giriş + `app/App.tsx` içine route.
- **Kabuk:** `features/app-shell` (TopBar, Dock = alttaki yüzen çubuk, RequireAccess). Tema: `features/theme`.
- **Özellik klasörü:** `features/<ad>/{components,services,types}`; veri yalnızca `services/` üzerinden; mock veriler `src/mocks/` (sonra silinir).
- **Zorunlu alanlar:** `features/stock/stock.rules.ts` → `REQUIRED_FIELDS` (şimdilik boş, ürün sahibi bildirecek).
- **Geçici kod:** `features/dev-login` + LoginPage'deki buton + `RequireAccess`/`TopBar`'daki "GEÇİCİ" satırları; gerçek giriş gelince silinir.
- Kod temiz, küçük bileşenli ve Türkçe yorumlu yazılır; sık revize edileceği için "neden"i açıklayan yorumlar bırakılır.

### 8.5 Stok kartı ekranı: tasarım kararları

- **Açılır liste:** Projede tek bileşen: `components/ui/SelectField.tsx` (özel combobox, tarayıcının çirkin yerel seçicisi kullanılmaz). Her yerde aynı stil; 7'den fazla seçenekte arama; altta yer yoksa yukarı açılır.
- **"+" için modal AÇILMAZ:** Listeye yeni öğe ekleme (stok tipi, KDV departmanı, stok nevi, birim) açılır listenin **altındaki "Yeni ekle" satırından**, silme satırdaki çöp kutusundan yapılır. "Sabit" öğelerde çöp kutusu yoktur (`removable`). Fiyat adı (FİYAT/PERAKENDE/TOPTAN) sekmelerinde "+" satır içinde yazı kutusuna dönüşür. Barkod: tür seç + yaz + (+) ile ekle, etiketler olarak listelenir.
- **Masaüstü (lg+):** Sol: Temel Bilgi + Fiyat ve Birim kartları; sağ: yapışkan **canlı önizleme** (ürün adı/kodu, birim başına KDV dahil satış, kâr %, barkod, Kaydet). Boş alan bu şekilde kullanılır. **Telefon:** 3 adımlı sihirbaz (Temel Bilgi → Fiyat ve Birim → Özet).
- **Birim satırı = bir kart:** birim + çarpan (ilk satırda 1, kilitli), Ana Birim/Varsayılan (satırlar arasında yalnızca biri), yan yana Alış ve Satış blokları (fiyat, para birimi, iskonto, net fiyat otomatik, KDV oranı, Hariç/Dahil, "KDV dahil" toplamı), barkodlar, ağırlık, hacim, açıklama. Her fiyat listesinin (sekmenin) kendi birim satırları vardır.
- **Alt çubuk:** Telefonda ekranın altına **yapışık** (üst köşeleri yuvarlak, "+" hafif taşar); masaüstünde yüzen hap.
- **Henüz yapılmayanlar (referansta var):** hesap makinesi düğmesi, sayfa üstündeki bilgi/liste/önceki-sonraki düğmeleri, alış/satış fiyatındaki "⋮" menüsü. Ürün sahibi anlatınca eklenecek.

### 8.6 Geniş ekran düzeni (güncelleme)

- Uygulama içeriği **tam genişlik** kullanır (en fazla 120rem); ortada dar sütun bırakılmaz. Yan boşluk yalnızca kenar dolgusudur.
- **xl (≥1280px):** solda "Ürün Bilgisi" (12 sütun) ve "Fiyat ve Birimler" kartları, sağda yapışkan özet (kart doluluğu çubuğu, birim başına fiyat/kâr, Kaydet). Gelişmiş alanlar geniş ekranda baştan açıktır. **2xl (≥1536px):** Alış ve Satış blokları yan yana; daha dar ekranda alt alta. **xl altı:** 3 adımlı sihirbaz.
- Barkod, ağırlık, hacim ve açıklama geniş ekranda tek satırdadır.

### 8.7 Veritabani adlandirma

Uygulama tablolari ve sutunlari Turkce, kucuk harf ve alt cizgi ile adlandirilir; uyumluluk icin Turkce karakter kullanilmaz. Prisma model/alanlari @map ve @@map ile eslenir. Mevcut veriler silinmez: ad degisiklikleri RENAME migration ile yapilir. _prisma_migrations teknik sistem tablosu korunur. Ayrintilar: docs/veritabani-adlari.md.

### 8.8 Ek fiyatlar, hesaplayıcılar ve açılır liste kuralı

- **Ek Alış/Satış Fiyatları:** Referanstaki ayrı "Alış Fiyatları/Satış Fiyatları" penceresi yerine, her fiyat bloğunun altında katlanan satır içi panel (açıklama + fiyat + iskonto + para birimi → Ekle; liste, net tutar, silme). Modal AÇILMAZ.
- **Ağırlık/Hacim Hesapla:** Alanın içindeki hesap makinesi düğmesi, alanın üstünde küçük bir panel açar (Esc/X/dışarı tıklama ile kapanır). Şekil: Prizma, Küp, Silindir. Ağırlık = hacim (cm³) × yoğunluk (g/cm³), 1000 g ve üzeri kg gösterilir, "Uygula" kg olarak forma yazar; Hacim (desi) = cm³ ÷ 3000. Hesaplar `stock.calc.ts` içindedir (testli).
- **Açılır liste/yığın bağlamı (hata dersi):** `animate-rise-in` dolgu kipi (`both`) KULLANMAZ; aksi halde her kart kalıcı bir yığın bağlamı oluşturur ve açılır listeler alttaki kartın arkasında kalır. Açılır panel içeren kartlar ayrıca `relative focus-within:z-20` taşır. Yeni kartlarda/animasyonlarda bu kurala uyun.

### 8.9 Birimler, KDV oranı ve daraltılabilir özet

- **Ağırlık** kg ya da g'dir: alanın sonunda kg|g seçici görünür. Hesaplayıcı sonucu 1000 g altında g, üzerinde kg yazar ve birimi otomatik ayarlar. **Hacim** yalnızca desidir ("desi" alanın sonunda sabit yazar).
- **KDV departmanı eklerken** ad yanında ayrı bir oran (%) kutusu çıkar; oran girilmeden "Ekle" kapalıdır ("10", "%10", "8,5" kabul, 0-100). Seçenek "Ad (%oran)" biçiminde kaydedilir. Oran isteyen başka listeler için `creator.ratePlaceholder` kullanılır.
- **Sağdaki özet** geniş ekranda ok ile sağa kapanır/açılır; kapalıyken ince şerit (aç oku, doluluk sayısı, kaydet) kalır ve sol alan genişler. Dar ekranda özet son adımdır.
- Gece modunda tema düğmesi dolu güneş ikonudur.
- **Hesaplayıcılar (Ağırlık Hesapla / Desi Hesapla):** vurgu şeritli, ikon rozetli kart; telefonda alt çubuğun üstünde, geniş ekranda alanın üstünde açılır. Modal kuralı gereği arka plana tıklayınca KAPANMAZ (Esc, X ya da Uygula). **Desi = (En × Boy × Yükseklik) ÷ bölen:** Yurt İçi ÷ 3000, Yurt Dışı ÷ 5000 (`DESI_DIVISORS`, `stock.calc.ts`); formül seçime göre ekranda yazılır. Ağırlıkta şekil (prizma/küp/silindir) + yoğunluk vardır.
- **Zorunlu alanlar** ürün sahibi bildirene kadar BOŞ bırakılır (`REQUIRED_FIELDS`); ek fiyat penceresi satır içi yapılmıştır.

### 8.10 Telefon/tablet düzeni: sekmeli + yana kaydırmalı (seçilen tasarım dili)

- **xl (≥80rem) altında** stok kartı sekmelidir: **Ürün · Fiyat · Barkod · Ölçü**. Birimler yana kaydırılan kartlardır (`UnitPager`, scroll-snap, noktalı gösterge, sonda "Birim Ekle" kartı); **seçili birim sekmeler arasında korunur**. Sekmelerin altında ince canlı özet (ad, KDV dahil fiyat, kâr, doluluk), sağ altta yüzen ✓ Kaydet.
- Görünüm `useMediaQuery('(min-width: 80rem)')` ile seçilir; aynı anda yalnızca biri çizilir. Durum ve işlemler tek yerde: `useStockEditor`. Ürün alanları `BasicInfoSection`, birim parçaları `UnitCard.tsx` içindeki `Unit*Fields` bileşenleridir (masaüstü kartı ve telefon sekmeleri aynı parçaları kullanır).
- **Açılır liste artık portal ile ekranın üstünde (fixed) çizilir** ve en az 14rem genişliktedir: kaydırmalı/kırpan kapların içinde kesilmez. Yeni kırpan kap (overflow) eklerken bu sayede sorun çıkmaz.
- Eski adım adım sihirbaz (Stepper) kaldırıldı. Diğer 4 tasarım önerisi `docs/tasarim-onerileri/mobil-stok-karti.html` içinde durur (gerekirse dönülür).

### 8.11 Envanter takibine göre alanlar ve sayı girişi

- **"Daha Fazla Alan" kaldırıldı:** Ürün bilgisindeki tüm alanlar hep görünür.
- **Envanter Takibi** seçimine göre yanındaki alanlar değişir (`INVENTORY_FIELDS`, `stock.rules.ts`; yeni tür eklemek için oraya bir satır yeterlidir): **Yok** → ek alan yok · **Normal** → Alt Limit, Üst Limit · **Seri No** → Seri No Zorunlu (Evet/Hayır), Seri No Öneki · **LOT** → LOT Zorunlu (Evet/Hayır), SKT Takibi (Evet/Hayır), LOT Öneki · **Ömür** → SKT Zorunlu (Evet/Hayır), Raf Ömrü (Gün), Risk (Gün). Evet/Hayır alanları açılır listedir (varsayılan Hayır).
- **Sayı alanlarına yalnızca rakam girilir** (`TextField numeric="decimal" | "integer"`, `lib/numeric.ts`): limitler, fiyat/iskonto, çarpan, ağırlık, hacim ve hesaplayıcı kutuları ondalıklı (rakam + tek virgül/nokta); gün alanları tam sayı. Yeni sayı alanında `numeric` kullanın, `inputMode` elle yazmayın. "Önek" alanları serbest metindir.

### 8.12 Telefonda paneller ALTTAN açılır (genel kural) ve Kasa Modu

- **Genel kural:** Telefonda (48rem/768px altı) açılan her panel — açılır listeler, hesaplayıcılar, ileride eklenecek pencereler/seçiciler — ekranın **ortasında değil, alttan yukarı çıkan sheet** olarak açılır: tam genişlik, üst köşeleri yuvarlak, arka plan kararır, güvenli alan (`env(safe-area-inset-bottom)`) boşluğu, `animate-sheet-in`. Tablet/masaüstünde tetiğe bağlı panel/açılır pencere kullanılır. Yeni bir panel eklerken bu iki davranışı da yazın (`useMediaQuery('(min-width: 48rem)')` ya da `md:` sınıfları). Pencereler yalnızca Esc/X/Uygula ile kapanır (modal kuralı); açılır listede dışarı tıklamak da kapatır.
- **Kasa Modu (telefon · Fiyat sekmesi):** `KasaPriceEditor`. Üstte Alış/Satış seçici, dev rakam ekranı (KDV dahil tutar ve kâr altında), tek dokunuşluk çipler (KDV oranı, Hariç/Dahil, para birimi, iskonto), altta kasa tuş takımı (1-9, virgül, 0, 00, sil). Ekran klavyesi AÇILMAZ. Sağ alttaki tuş Alış ↔ Satış geçişi, tall "Kaydet" kartı kaydeder; iskonto en çok %100, en çok 2 ondalık, tek virgül. Birimler üstte çip olarak seçilir; dişli = birim ayarları (birim, çarpan, ana/varsayılan, silme). Bu sekmede yüzen ✓ düğmesi ve özet şeridi gösterilmez.

### 8.13 Envanter satırı: boşluk bırakmayan düzen

Geniş ekranda (xl) "Envanter Takibi + seçime göre alanlar + Menşei + Diğer Vergi Ekle" kutuları satırda **eşit bölünür**: Yok → 3 kutu, Normal ve Seri No → 5 kutu, LOT ve Ömür → 4 + 2 (zaten tam sığar). Satır genişliği `--cols` değişkeniyle verilir (`BasicInfoSection`); dar ekranda bu sarmalayıcı `contents` olur ve telefon/tablet ızgarası değişmez. Menşei en çok 40 karakter (en uzun ülke adı "Güney Georgia ve Güney Sandviç Adaları" = 37). Yeni bir envanter türü eklenirse satır sayısı otomatik uyar; kutu sayısı 3'ü aşan ek alan olursa `rowSizes` kuralına bakın.
