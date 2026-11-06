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

- Şifreler Argon2id; token/şifre/secret tarayıcı depolamasında tutulmaz. Oturum: HttpOnly + SameSite=Lax cookie (production'da Secure + `__Host-`), DB'de yalnızca SHA-256 hash'i, girişte rotation, çıkışta revocation.
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

> ## ⚠ ZORUNLU KONTROL LİSTESİ (her güncellemeden sonra, atlanmaz)
>
> 1. **Gece VE gündüz modunda** değişen ekran, **açılan her pencere/açılır liste/panel/hesaplayıcı/bildirim** ile birlikte kontrol edilir. Gece modunda beyaz kalan hiçbir yüzey olamaz.
> 2. **Telefon, tablet ve masaüstü** genişliklerinde bakılır (pencere ekranın dışına taşmamalı, kesilmemeli).
> 3. Testler + tip denetimi + lint temiz olmadan iş bitmiş sayılmaz.
>
> **Neden:** Pencereler (`Sheet`) ve açılır listeler `document.body`'ye "portal" ile çizilir; tema yalnızca uygulama kabında tanımlıysa bunlar **beyaz kalır** (yaşanmış hata). Bu yüzden `data-theme` **`<html>` üzerinde** de tutulur (`AppShell`) ve bunu doğrulayan test vardır (`Theme.test.tsx`). Yeni bir portal/katman eklenirse aynı tema kuralı geçerlidir; **renk kodu yazılmaz, yalnızca tema token'ları** (`bg-surface-raised`, `text-ink` …) kullanılır. Gece taraması için tarayıcıda `colorScheme: dark` ile her pencereyi açıp ekran görüntüsü alın.

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
3. **Veri:** Gerçek oturumda stok kartı, ürün listesi, marka, kategori, fırsat ve özellikler API üzerinden MySQL'e kaydedilir ve kullanıcı hesabına özeldir. Sahiplik oturumdaki kullanıcıdan belirlenir; istemciden kullanıcı kimliği kabul edilmez. Farklı hesaplar birbirinin verilerini göremez. Test kullanıcısı ayrı demo servisini kullanır; veritabanına yazmaz. Bileşenler veriyi servis/hook üzerinden alır. Ayrıntı: `docs/stok-karti-veritabani.md`.
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
- **Birim satırı = bir kart:** birim + çarpan (ilk satırda 1, kilitli), Ana Birim/Varsayılan (satırlar arasında yalnızca biri), yan yana Alış ve Satış blokları (fiyat, para birimi, iskonto, net fiyat otomatik, KDV oranı, Hariç/Dahil, "KDV dahil" toplamı), barkodlar, ağırlık, hacim, açıklama. Birim ve barkod ürüne ortaktır; tüm sekmeler aynı birimleri gösterir, yalnızca fiyat blokları farklıdır.
- **Alt çubuk:** Telefonda ekranın altına **yapışık** (üst köşeleri yuvarlak, "+" hafif taşar); masaüstünde yüzen hap.
- **Henüz yapılmayanlar (referansta var):** hesap makinesi düğmesi, sayfa üstündeki bilgi/liste/önceki-sonraki düğmeleri, alış/satış fiyatındaki "⋮" menüsü. Ürün sahibi anlatınca eklenecek.

### 8.6 Geniş ekran düzeni (güncelleme)

- Uygulama içeriği **tam genişlik** kullanır (en fazla 120rem); ortada dar sütun bırakılmaz. Yan boşluk yalnızca kenar dolgusudur.
- **xl (≥1280px):** solda "Ürün Bilgisi" (12 sütun) ve "Fiyat ve Birimler" kartları, sağda yapışkan özet (kart doluluğu çubuğu, birim başına fiyat/kâr, Kaydet). Gelişmiş alanlar geniş ekranda baştan açıktır. **2xl (≥1536px):** Alış ve Satış blokları yan yana; daha dar ekranda alt alta. **xl altı:** 3 adımlı sihirbaz.
- Barkod, ağırlık, hacim ve açıklama geniş ekranda tek satırdadır.

### 8.7 Veritabani adlandirma

Uygulama tablolari ve sutunlari Turkce, kucuk harf ve alt cizgi ile adlandirilir; uyumluluk icin Turkce karakter kullanilmaz. Prisma model ve alan adlari da Turkcedir (Kullanici, StokKarti, stokKodu); @map ve @@map mevcut SQL adlarini korur. API sozlesmesi repository katmaninda korunur. Mevcut veriler silinmez: fiziksel SQL ad degisiklikleri RENAME migration ile yapilir; yalnizca Prisma adi degisiyorsa migration uretilmez. _prisma_migrations teknik sistem tablosu korunur. Ayrintilar: docs/veritabani-adlari.md.

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

### 8.14 Markalar ekranı ve yönetim listesi parçaları (Kategoriler/Fırsat/Özellikler de bunları kullanır)

**Kalıcı veri:** Gerçek oturum `brand.service.ts` ile API/MySQL kullanır; yalnızca test kullanıcısı `brand.demo.ts` kullanır. Marka adı ve ayrıntıları bağımsız Türkçe `markalar` tablosundadır; stok kartı bu tabloya bağlanır. Ürün atama/silme ve sıralama kullanıcıya özel, transaction içindedir. Ayrıntılar: `docs/markalar-veritabani.md`.

- **Tasarım (seçilen: "Kaydırmalı Satırlar"):** logo + ad + ürün sayısı + anahtar. Telefonda satır **sola kaydırınca** Düzenle / Tanımla / Sil çıkar; satıra dokunmak düzenler. Masaüstünde satırın içinde ⠿ tutamağı ve ikon düğmeleri bulunur (yan özet kartı YOK, istenmedi).
- **Sıralama = sürükle-bırak, ayrı "Sıralama" düğmesi YOKTUR:** telefonda satırı ~0,35 sn **basılı tut** → satır havaya kalkar, diğerleri kayarak yer açar, sayfa kenarında kendiliğinden kayar; masaüstünde ⠿ tutamağından; klavyede tutamağa odaklanıp ↑ ↓. Arama yapılırken sıralama kapalıdır. Sıra mağazadaki gösterim sırasıdır.
- **Ortak parçalar (yeniden kullanın):** `components/ui/SortableList` (sürükle-bırak + klavye + duyuru), `SwipeRow` (sola kaydırma), `ToggleSwitch`, `SearchField`, `TextAreaField`, `ConfirmSheet`, `Button variant="danger"`. Veri `features/<ad>/services` üzerinden; sahte veri `src/mocks`.
- **Marka kuralları:** gerekli tek alan marka adı; logo dokun/sürükle-bırak ile yüklenir (görsel, en çok 2 MB, 800×230 oranı önerilir; logo zemini her zaman açık renk); açıklama ve SEO "Gelişmiş" altında. Ürünü olan marka silinirken kaç üründe kullanıldığı söylenir ve onay istenir (ürünlerin markası boş kalır). "Ürünlere Tanımla": ad/kod/barkodla ara, çoklu seç, "Ata". Pazaryeri menüleri YOKTUR (istenmedi). Pasif marka stok kartındaki marka listesinde görünmez (aynı servis).

### 8.15 Liste ekranlarında sayfalama (genel kural)

Uzayabilecek her liste sayfalıdır: `lib/usePagination` + `components/ui/PaginationBar`. **Varsayılan sayfa başına 10**; kullanıcı "Sayfada Kaç …" kutusuna adedi **kendisi yazar** (yalnızca rakam, en çok 200; adet/arama değişince 1. sayfaya dönülür). Çubuk: gösterilen aralık ("1–10 / 42 marka"), geniş ekranda sayfa numaraları (…’li), telefonda "2 / 5" + Geri/İleri. Sayfa tek ise numaralar gizlenir. Sürükleyerek sıralamada sürükleme **geçerli sayfa içindedir** ve sıra tüm listeye yansıtılır (sayfalar arası taşımak için adedi artırın). Arama sonuçları da sayfalanır.

### 8.16 Yan panelli pencere (Sheet `aside`) ve çift tıkla düzenleme

- **Masaüstünde liste satırında "düzenle" (kalem) düğmesi YOKTUR:** satıra **çift tıklanır**; klavye ve ekran okuyucu için satır `role="button"` + Enter'dır (`detail === 0` tıklaması da açar). Telefonda satıra tek dokunuş düzenler; sola kaydırınca Düzenle/Ürünler/Sil çıkar.
- **Yan panel:** `Sheet` bileşeni isteğe bağlı `aside` alır. Masaüstünde ana pencerenin yanında (`side`: varsayılan sol; **marka penceresinde SAĞ**), telefonda ana pencerenin **üstünde alttan** açılır; açılıp kapanır (panelin X'i ya da penceredeki düğme), **Esc önce yan paneli, sonra pencereyi kapatır**; odak tuzağı ikisini birlikte kapsar. Yeni "ayrıntı penceresi" tasarlarken (ürün listesi, kategori vb.) aynı yapıyı kullanın.
- **Marka → Ürünler paneli (`BrandProductsPanel`):** "Bu Markada (N)" sekmesinde ürünleri görür ve tek dokunuşla çıkarırsın; "Ürün Ekle" sekmesinde ad/kod/barkodla arar, tek tek ya da "Görünenlerin Hepsini Ekle" ile eklersin ("Markasız Ürünler" süzgeci var). Değişiklikler **anında** uygulanır (formdaki Kaydet'ten bağımsız) ve marka satırındaki ürün sayısı canlı güncellenir. Panel yalnızca kayıtlı markalarda vardır. Satırdaki "Ürünler" işlemi **yalnızca ürünler penceresini** (`BrandProductsSheet`) açar, düzenleme formu gelmez; penceredeki "Ürünler" düğmesi ise yan paneli sağda açıp kapatır. Marka penceresinde logo alanı masaüstünde yandaki alanların (ad, aktif, ürünler) yüksekliğine kadar uzar.
- **Ürünler paneli "Ürün Ekle" akışı:** süzgeç varsayılanı **Markasız** (çiplerde adetler: Markasız / Başka Marka / Tümü); kartlara dokunarak **çoklu seçilir** (seçince hemen eklemez), altta "N ürün seçili · Temizle · Ekle" çubuğu çıkar, "Tümünü Seç" vardır; eklenince "Bu Markada" sekmesine geçilir ve yeni ürünler kısa süre vurgulanır. Başka markadaki ürünlerde "X'ten taşınır" notu görünür. "Çıkar" sonrası alt çubukta **Geri Al** çıkar (6 sn). Ürün kartları adı 2 satıra kadar tam gösterir (kesik yazı yok).

### 8.17 Alt menü kayan vurgu

Alt menüde seçili sayfanın arkasındaki yumuşak kutu, başka sekmeye geçince yeni yerine **kayarak** gider (`Dock`: konum doğrudan DOM'a yazılır, `transition` ile yay efekti; ilk yerleşimde animasyon yoktur, pencere boyutu değişince yeniden hesaplanır). Seçiliyken ikon/yazı turuncuya yumuşakça döner. **Alttaki nokta vurgusu YOKTUR** (kaldırıldı). "+" (yeni stok kartı) seçiliyken kutu gizlenir.

### 8.18 Kategoriler (ağaç gezinme) ve kutucuk ızgarası

- **Ağaç, klasör gibi gezilir:** bir kategoriye dokununca/tıklayınca **içine girilir**; üstte "Tümü › Ana › Alt" yolu (her halka o seviyeye döner) ve "bir üst kategoriye çık" düğmesi vardır. İçinde bulunulan kategori adreste `?k=<kimlik>` olarak tutulur (telefonun geri hareketi bir üst seviyeye çıkar, bağlantı paylaşılabilir; silinmiş kimlik kökte açılır). Alt kategori sayısı sınırsızdır.
- **İki görünüm:** **Kutucuk** (varsayılan; görsel büyük, rozetle alt kategori sayısı, ⋮ işlem menüsü) ve **Liste** (Markalar'daki satır düzeni). Seçim `localStorage` (`gt-kategori-gorunum`) ile hatırlanır. Aynı veri, aynı işlemler; yalnızca sunum farklıdır.
- **Sıralama (`SortableGrid`, `SortableList`):** kardeş kategorilerin sırası mağaza sırasıdır. Kutucukta: telefonda **basılı tutup** sürükle, fareyle **tutup çek** (kısa tık açar; sürükleme sonrası gelen tık yutulur), klavyede **Alt + ok tuşları**. Diğer kutucuklar kayarak yer açar. Listede Markalar'daki kural (⠿ tutamağı / uzun basma / ↑↓). Arama sırasında sıralama kapalıdır; sayfalama kuralı (8.15) geçerlidir, sürükleme geçerli sayfa içindedir.
- **Arama tüm ağaçta çalışır;** sonuçlarda kategorinin yolu ("Tümü › OT/VT Ürünleri") görünür, dokununca o kategoriye girilir.
- **Masaüstü satırında düzenle (kalem) düğmesi VARDIR** (8.16'dan fark): çünkü tek tıklama gezinmeye ayrıldı, çift tıklama kullanılmaz. Kutucukta işlemler ⋮ menüsündedir (Düzenle, Alt Kategori Ekle, Ürünlere Tanımla, Pasife Al/Aktif Yap, Sil; telefonda alttan açılır).
- **Form:** gerekli tek alan ad. Üst kategori listesi girintili ağaçtır ve kategorinin **kendi dalını içermez** (kendi altına taşınamaz); üst değişirse kategori yeni üstünün sonuna gider. "Aktif" ve "Mağazada Gizle" ayrı anahtarlardır (gizli kategori yönetimde görünür, kutuda göz-kapalı simgesi çıkar). Açıklama ve SEO "Gelişmiş" altındadır; rakipteki zengin metin editörü bilerek YOKTUR. Ürünler yan paneli Markalar'daki ile aynı mantıktır (`CategoryProductsPanel`; "Kategorisiz / Başka Kategori / Tümü").
- **Silme:** alt kategorisi varsa uyarı metni dalın silineceğini söyler; ürünler silinmez, kategorisiz kalır. İçinde bulunulan dal silinirse bir üst kategoriye çıkılır. "Sıfırla" düğmesi YOKTUR.
- Gerçek oturum `category.service.ts` ile API/MySQL kullanır. Anonim test oturumu ayrı `category.demo.ts` kullanır. Ürünler birden fazla kategoriye bağlanır; atama diğer kategorileri silmez.
- **Taşı (kategoriyi başka yere taşıma):** her kategoride **"Taşı"** işlemi vardır (⋮ menüsü, telefonda satırı sola kaydırınca, masaüstü satır düğmesi, içindeki kategorinin üst kartı, düzenleme penceresindeki **Konum · Taşı** düğmesi). Seçim kutusu YOKTUR: klasör gezer gibi çalışan panel (`CategoryMovePanel`) açılır; hedef kategoriye dokunarak girilir, alttaki **"Buraya Taşı"** düğmesi hedefi açıkça yazar ("Hedef: …"); şu anki yerinde düğme "Zaten Burada" olup kapalıdır. Kategori kendi dalına taşınamaz (kendisi ve altları listede görünmez). Taşınan kategori alt dallarıyla gider ve yeni üstünün sonuna eklenir. Düzenleme penceresinde panel **yan panel (sağda)** olarak açılır ve taşıma **anında** uygulanır (Kaydet'ten bağımsız); yeni kategori eklerken "Üst Kategori" seçim kutusu kalır.

### 8.19 Fırsat Yönetimi (rozet + ürün önizlemesi)

- **Giriş yeri:** alt menüde YENİ sekme YOK. Fırsatlar, **Ürünler** sayfasındaki "Ürün Araçları" kısayolundan açılır (`/uygulama/urunler/firsatlar`; alt sayfa olduğu için alt menüde Ürünler seçili kalır). Sayfanın tepesinde "‹ Ürünler › Fırsatlar" yolu ve geri düğmesi vardır. Toplu Görsel gibi benzer yardımcı ekranlar da aynı yere eklenir.
- **Fırsat = ürüne yapıştırılan rozet** ("Yeni", "Çok Satan", "%10"): ad, **ikon (yüklenen görsel = rozetin kendisi; hazır rozet listesi YOKTUR, amaç yeni ikon yüklemektir)**, "Ürün Resminin Üzerinde Göster", yer, boyut, aktif, SEO. Resimde gösterilecekse ikon şarttır ("Rozet olarak kullanılacak bir ikon yükleyin."); kapalıysa fırsat yalnızca etiket olur ve ikon gerekmez. Bir ürünün birden çok fırsatı olabilir.
- **Satır = canlı önizleme (`DealPreview`):** her satırda örnek ürün resmi ve rozetin **gerçek yerinde ve boyutunda** görünür (boyut resim genişliğinin %24/%34/%46'sı; resim büyürse rozet orantılı büyür). Listede ve formda aynı bileşen kullanılır. Rozet renkleri içeriktir, temaya göre değişmez.
- **Yer seçimi seçim kutusuyla DEĞİL:** örnek ürün resminin üzerindeki 6 noktadan (Üst/Alt × Sol/Orta/Sağ) birine dokunulur (`DealPlacePicker`, `role="radiogroup"`; nokta küçük görünür ama dokunma alanı 3,5 rem); seçilen yerde rozet çerçeveli belirir. Boyut, rozetin göreli büyüklüğünü gösteren daireli üç kart (Küçük/Orta/Büyük) ile seçilir (piksel yazılmaz). Seçilen yer ve boyut yanda yazıyla da özetlenir. İkon yüklenmeden önce yerinde noktalı "İkon" yer tutucusu görünür. "Ürün resminin üzerinde göster" kapalıysa yer/boyut gizlenir, fırsat yalnızca etiket olur.
- **Liste:** Markalar'daki kuralların aynısı (8.15 sayfalama, 8.16 telefonda tek dokunuş düzenler + sola kaydırınca Düzenle/Ürünler/Sil, masaüstünde çift tıkla düzenle + ⠿ tutamağı, uzun basarak sıralama). **Ürünler** paneli `DealProductsPanel`: "Bu Fırsatta / Ürün Ekle", süzgeç "Fırsatsız / Tümü", çoklu seçim, Geri Al. Ürüne fırsat eklemek mevcut fırsatları silmez (birden çok fırsat).
- **Genel uyarı (türetilmiş bileşenler):** bir bileşeni kopyalayıp yeniden adlandırırken **Tailwind sınıf adları** (`text-brand-ink` vb.) toplu "değiştir" ile bozulabilir; tip denetimi bunu yakalamaz. Kopyadan sonra gerçek tarayıcıda (gündüz + gece) bakmak şarttır.

### 8.20 Veritabanı ve arayüzün iş mantığı

Marka görselleri Base64 ile aktarılır ve sunucu dosyayı özgün baytları, boyutları ve biçimiyle `UPLOADS_DIR/markalar` altında saklar; boyutlandırma veya WebP dönüşümü yapılmaz. Yalnızca dosya adı ve hash MySQL'de saklanır. Eski BLOB kayıtları API ilk açıldığında doğrulanarak dosyaya taşınır. Dosyalar yetkili API üzerinden sunulur; `uploads` ve MySQL birlikte yedeklenir.

Veritabanındaki tüm ana kayıt kimlikleri ve bunlara bağlı yabancı anahtarlar `INT AUTO_INCREMENT` ile sayısaldır; API uyumluluğu için sayısal kimlikler metin olarak taşınabilir. Marka ve stok API kimlikleri de sayısaldır. Kayıtların silinmesi veya başarısız işlemler nedeniyle numaralar arasında boşluk olabilir; ID sıralaması ekran sırası değildir. Eski UUID kayıtları ve ilişkileri migration sırasında eşleştirilir. İşlem tekrarını engelleyen `kayit_istegi_kimligi` ise bir kayıt ID'si değil, istemcinin rastgele oluşturduğu işlem anahtarıdır.

E-posta doğrulama kodları MySQL'de `eposta_giris_kodlari` tablosunda tutulur (Redis kullanılmaz; ek servis ve `sudo` gerekmez). Düz e-posta ve düz kod saklanmaz: ikisi de `COOKIE_SECRET` ile HMAC hash'tir. Kod 10 dakika geçerlidir; doğru doğrulamada ve 5. yanlış denemede geçersiz olur. Yeniden gönderim beklemesi 60 saniye, saatlik kota 5'tir. Aynı e-postaya eşzamanlı istekler MySQL adlandırılmış kilidiyle sıraya girer; böylece kota ve tek kullanım aşılamaz. Bir saatten eski satırlar kota için de gerekmediğinden her gönderimde temizlenir. Veritabanı kesilirse kod akışı 503 verir.

Teknik terimler kendi adıyla kullanılır: kriptografik hash alanlarında "özet" yerine `hash` yazılır (ör. `sifreHash` / `sifre_hash`). Arayüzdeki ürün özeti gibi normal Türkçe kullanımlar bu kuralın dışındadır. Eski migration dosyaları korunur; fiziksel alan adları yeni RENAME migration'ıyla değiştirilir.

Veritabanı arayüzdeki iş ilişkilerine göre düzenlenir. Kullanıcının isteğe bağlı şifre hash'i ve şifre tarihleri `kullanicilar` içinde tutulur; genel kullanıcı/API yanıtlarına dahil edilmez. Sosyal giriş kimlikleri, oturumlar ve e-posta kodları ayrı yaşam döngülerine sahip olduğundan ayrı kalır. 2026-11-06 kararı: birim ve barkod stok kartına ortaktır; fiyat listesi yalnızca alış/satış fiyatlarını değiştirir. Güncel API ve geçiş: docs/stok-api.md. Shared paket değiştirilmeden mevcut gövde adaptörü korunur; ön yüz ortak birimleri bütün fiyat listelerine eşit yansıtır. Migration mevcut şifre hash'lerini ve tarihlerini aynen taşır.

### 8.21 Özellikler (şablon → grup → özellik)

- **Yapı:** **Şablon** (bir ya da birkaç kategoriye bağlı özellik takımı; ya da "Tüm Ürünlerde Kullan" ile kategorisiz ortak şablon) → **Grup** (ör. İşletim Sistemi, Renk) → **Özellik** (değer; ör. Free DOS, Siyah). Ürün, kategorisinin şablonundaki özellikleri gösterir; "Tüm ürünler" şablonları her üründe çıkar.
- **Gezinme (Kategoriler gibi klasör):** şablona girilir, gruba girilir, özellikler görünür. Yer adreste `?s=<şablon>&g=<grup>` tutulur (geri hareketi üst seviyeye çıkar). Üstte "Şablonlar › Şablon › Grup" yolu ve geri düğmesi. **Her seviyede TEK, o seviyeye göre adlanan "+"** vardır ("Şablon Ekle" / "Grup Ekle" / "Özellik Ekle"; telefonda yüzen düğme). Rakipteki 4 ayrı düğme ve "Sıfırla" YOKTUR. Seviyede arama yalnızca o seviyeyi süzer.
- **Satırlar (şablon, grup):** tek dokunuş/tık İÇİNE GİRER; düzenleme/silme telefonda sola kaydırınca, masaüstünde satır düğmeleriyle yapılır (çift tık kullanılmaz, çünkü tık gezinmeye ayrıldı). Etiketler: şablonda bağlı kategoriler ("Tüm ürünler", "+N") ve grup sayısı; grupta Renk/Resim, Filtre, Çoklu, Varyant ve özellik sayısı. Sıralama diğer listelerle aynı (uzun basma / ⠿ / klavye); sayfalama 8.15.
- **Özellik seviyesi = hızlı giriş:** üstte tek kutu — adı yaz, **Enter** (kutu açık kalır, arka arkaya girilir; aynı ad engellenir). Renkli gruplarda kutunun yanında renk seçici, resimli gruplarda resim gerektiği için "Resimli Özellik Ekle" formu açılır. Özellikler çip/kutucuk olarak görünür (renk kutusu / küçük resim / yalnızca yazı); tıklayınca düzenler (silme formun içinde), tutup sürükleyerek (klavyede Alt + ok) sıralanır. Kod adından otomatik üretilir (`slugify`), elle değiştirilirse artık otomatik güncellenmez.
- **Grup formu:** Renk ve Resim ayrı anahtarlar DEĞİL, tek seçimdir — **Yazı / Renk / Resim** (ikisi birlikte olamaz). "Mağazada Filtre Olsun", "Birden Fazla Seçilebilsin", "Ürün Çeşidi Oluştursun" sade Türkçe açıklamalıdır. **"Varyant"ın tam anlamı henüz ürün sahibinden teyit edilmedi** (varsayım: her seçim ayrı ürün çeşidi); teyitte açıklama güncellenir. Resim seçiliyse "Ürün Resminin Üzerinde Göster" açılabilir ve rozet yeri/boyutu Fırsat'taki seçiciyle (`DealPlacePicker`, yer tutucu "Resim") belirlenir.
- **Şablon formu:** ad + kategori ağacı (kutucuklarla tek tek işaretlenir; üst kategoriyi işaretlemek altlarını kendiliğinden işaretlemez) ya da "Tüm Ürünlerde Kullan". İkisi de yoksa kaydedilmez.
- **Silme:** şablon silinince grupları ve özellikleri de silinir, grup silinince özellikleri silinir (uyarı metni sayıyı söyler). İçinde bulunulan öğe silinirse bir üst seviyeye çıkılır.
- Gerçek oturum `attribute.service.ts` ile API/MySQL kullanır. Anonim test oturumu ayrı `attribute.demo.ts` kullanır. Hızlı ekleme başarılı kayıt sonrası temizlenir; hata halinde girilen ad korunur.

### 8.22 Ürün Liste (Ürünler sayfası)

- **Seçilen tasarım:** "Sıkı Liste + Açılan Ayrıntı" (`docs/tasarim-onerileri/urunler.html`, öneri 3), üzerine eklemeler: kapalı satırda stok durumu görünür, kutucuklar yalnızca "Seç" modunda çıkar, satırdaki fiyat üstteki seçiciye bağlıdır. Giriş: alt menüde **Ürünler**.
- **Telefon (< 64rem):** ince satırlar (resim, ad, kod, stok rozeti, "Satışta değil" etiketi, seçili fiyat KDV dahil). Satıra dokununca **tek satır açılır**: Fiyat 1/2/3 (KDV dahil), alış ve kâr %, Stok Takibi ve Satışta anahtarları, Düzenle / Kopya / Diğer. Üstteki **Fiyat 1 / 2 / 3 / Alış seçici** satırlarda hangi fiyatın görüneceğini belirler. Resimdeki küçük büyüteç resmi büyük açar (telefonda "üzerine gelmek" yoktur).
- **Masaüstü (≥ 64rem):** tablo; üç fiyat yan yana (KDV dahil, altında KDV hariç), resim üzerine gelince büyük önizleme, satır sonunda ⋮ menüsü, çift tıklayınca Düzenle.
- **Seçim ve toplu işlem:** telefonda "Seç" modu, masaüstünde tabloda kutucuklar hep görünür. Seçilince **temaya uyumlu** (koyu/açık) alt çubuk çıkar: "Tümünü seç (N)", İşlemler (stok takibi aç/kapat, satışa aç/kapat, sil). Silme onay ister.
- **Stok Takibi** = adet takip ediliyor (kapalıysa "Sınırsız"); **Satış** = ürün satışa açık (kapalıysa ürün listede kalır, mağazada görünmez). Bu anlam ürün sahibinden teyit edilmedi; teyitte yalnızca açıklamalar değişir.
- **Süzgeç:** kategori, marka, stok durumu (var/tükenen/sınırsız), satış durumu, fırsat, Fiyat 1 aralığı (KDV dahil). Panelde "N Ürünü Göster" canlı sayı verir; "Sıfırla" panelin içindedir; listede açık süzgeç sayısı rozetle görünür. Arama ad, kod ve markada çalışır.
- **⋮ menüsü:** Düzenle, **Kopya Oluştur** (stok kartı ekranını dolu ama YENİ kayıt olarak açar; ad "… (Kopya)", kod "…-KOPYA" olur, kaydedene kadar hiçbir şey eklenmez), **Hepsiburada / Trendyol / N11** (etiketsiz, doğrudan görünür; bağlantı henüz yok, seçilince "bağlantısı henüz kurulmadı; ürün gönderilmedi" denir, sahte başarı gösterilmez), Sil.
- **Ekle / Düzenle / Kopya = TEK ekran (stok kartı):** ayrı bir "ürün düzenle" ekranı YOKTUR. `/uygulama/stok-karti/yeni` boş kart (alt menüdeki "+" ve "Ürün Ekle"), `/uygulama/stok-karti/:cardId` aynı form dolu (Düzenle; başlık "Stok Kartını Düzenle", Kaydet kaydı günceller, geri oku "Ürünlere dön"), `/uygulama/stok-karti/yeni?kopya=:id` dolu ama yeni kayıt (Kopya). Servis: `StockService.get(id)` ve `update(id, draft, requestId)` eklendi; **sunucuda `POST /api/stok/kartlar/:id/guncelle` vardır**; GET `/kartlar/:id` form taslağını döndürür. Sayfalı liste ve toplu işlem uçları ile çoklu kategori API sözleşmesi `docs/stok-api.md` içindedir. Birim/barkod ortaklığı için shared ve ön yüz güncellemesi ayrı yürütülür. Gerçek oturumdaki liste, düzenleme ve kopyalama artık gerçek API'yi kullanır; metin ID'li deneme ürünü istisnası yoktur. Deneme kullanıcısında kart ↔ ürün listesi köprüsü `features/products/product.draft.ts` (Fiyat 1/2/3 = FİYAT/PERAKENDE/TOPTAN listeleri) ve kayıt/güncelleme listeye yansır. Ekran düzenleme ve kopya kipinde üstte ürün adı gösterir. "Sonraki Ürün" düğmesi gerçek liste API'si gelince eklenecek.
- **Excel ile Yükle (3 adımlı sihirbaz):** 1) Hazırla (örnek dosya + sütun listesi, zorunlular işaretli: Stok Kodu, Ürün Adı, Fiyat 1) 2) Yükle 3) **Önizle ve Onayla**: yeni / güncellenecek / hatalı satırlar sayılır, hatalılar nedeniyle birlikte öne çıkar; onaylayınca yalnızca doğru satırlar kaydedilir, hatalılar atlanır. Dosya şimdilik **CSV**'dir (Excel'de Farklı Kaydet → CSV); gerçek .xlsx okuma sunucu hazır olunca sunucu tarafında yapılır. Ayraç (`;` veya `,`) kendiliğinden bulunur, BOM atılır, sütun sırası önemli değildir. **Tırnak yalnızca alanın başındaysa tırnaklama sayılır** (ürün adlarındaki `15.6"` inç işareti satırları bozmamalı; testlidir).
- Fiyat listesi adları şimdilik sabit "Fiyat 1/2/3" (kullanıcı tanımlı adlar gelince servisten okunur). Gerçek oturum `product.service.ts` ile sayfalı API'den ürünleri yükler; anonim test oturumu `product.demo.ts` kullanır. CSV önizleme/kayıt da gerçek API'ye bağlıdır.
- **Kod uyarısı:** Prettier, kaynak koddaki `\uFEFF` gibi kaçış dizilerini gerçek karaktere çevirip lint hatası (`no-irregular-whitespace`) çıkarabilir; BOM için `String.fromCharCode(0xfeff)` kullanılır.
- **Karar (2026-11-06): Ekle sade, Düzenle zengin.** "+" ile açılan yeni stok kartı formu SADE kalır (tip, kod, ad, marka, fiyat, birim, barkod + yalnızca Kategori). Görsel/Video, Fırsat/Özellik, Açıklama, Uyumlu/Alternatif, SEO gibi ek bilgiler yalnızca KAYDEDİLMİŞ üründe, Düzenle ekranının ek sekmelerinde doldurulur; yeni kartta bu sekmeler görünmez. Kayıt sonrası ekran ve yan kutular aşağıda anlatılır. Toplu yollar (Fırsatlar > Ürünler, Kategoriler > Ürünler, Toplu Görsel) ek sekmeleri çoğu ürün için gereksiz kılar.
- **Karar: birim ve barkod ürüne ortaktır** (fiyat listesine özel DEĞİL); fiyat listeleri yalnızca fiyatı değiştirir (her birimin her listede alış/satış fiyatı olur). Form ve veritabanında uygulandı; stok_fiyat_listeleri kaldırıldı. Shared paket sözleşmesi gelene kadar liste temelli taşıma gövdesi korunur.

### 8.23 Dört ekranın kalıcı bağlantısı (2026-11-06)

Ürünler, Kategoriler, Fırsatlar ve Özellikler gerçek oturumda API/MySQL kullanır. Fırsat ve özellik şema/migration/uçları ve ekran bağlantıları tamamlandı; ayrıntılar `docs/katalog-api.md` ve `docs/stok-api.md`. Demo verileri yalnızca anonim test oturumunda ayrı servislerden gelir. Ürün/kategori ve ürün/fırsat ilişkileri çoktan çoğadır. Görseller Base64 aktarılır, özgün dosya olarak uploads içinde saklanır. Özellik bayrakları tanım olarak saklanır; otomatik varyant üretme veya üründe özellik seçme ekranı bu kapsamda eklenmez. API hataları gösterilir, başarı ancak yazma onayıyla bildirilir. Kullanıcının son isteğiyle bu çalışma güncel Git sürümüyle birleştirilip gönderilir.

### 8.24 Yeni stok kartı yan panelleri ve gerçek kayıt

- **Yan sekmeler — Özet · Kategori · Fırsat (`StockSidePanel`):** stok kartı ekranının **sağ kenarında dikey sekmeler** durur (harfler alt alta: Ö-Z-E-T, K-A-T-E-G-O-R-İ, F-I-R-S-A-T; ikon + ad, seçim varsa sayı rozeti). Kapalıyken yalnızca ince sekmeler görünür, form tam genişliktedir ve **Kaydet formun altındadır**. Sekmeye tıklayınca **panel sola doğru açılır**: sekmenin soluna yüzen, **içeriği kadar yüksek kare bir kart** (eski Özet kartı gibi; ekranın kenarına yapışık değil, yumuşak köşeli, gölgeli), açık sekme açık turuncu zeminli ve çerçeveli. Sekmeler ve kart `fixed` olduğu için **sayfa kaydırılınca yerinde durur**; kart uzunsa kendi içinde kayar; aynı sekmeye, ✕ ya da Esc ile kapanır; başka sekmeye basınca panelin içeriği o sekmeye döner (tek panel). Panel açıkken Kaydet panelin içindedir (sayfadakini gizler; iki Kaydet görünmez), eksik alan varsa panel kapanıp hatalı alanlar görünür. Telefonda aynı mantık (sekmeler daha ince, panel ekranın büyük kısmını kaplar, yüzen ✓ Kaydet panel açıkken gizlenir). Panel hiçbir sekme seçilmeden KAPALI başlar; adresteki `?ac=kategori|firsat|ozet` o sekmeyi açık getirir. Taslak: `docs/tasarim-onerileri/urun-yan-sekme.html`. **Kategori** (`CategoryBox`): seçilenler çip (✕ ile kaldırılır), aranabilir kutucuklu ağaç, seçim anında uygulanır, ürün çok kategoride olabilir, üst kategori altlarını seçmez. **Fırsat** (`DealBox`): aktif fırsatlar rozetiyle, tek dokunuşluk anahtar; rozetin yeri/boyutu Fırsatlar ekranında ayarlanır. Eski "özeti sağa kapat" şeridi ve ilk denenen yatay akordeon kutular kaldırıldı.
- **Kayıt sonrası ekran (`StockSavedScreen`):** özet kartı (ad, kod, marka) + (sekmeler açıksa) **Kategori** ve **Fırsat Yönetimi** kartları ("Boş" / "1 kategori"); karta dokununca düzenleme ekranında o sekmenin paneli açık gelir. Altında Yeni Stok Kartı ve Ürünlere Dön. Henüz yapılmamış bölümler (Özellikler, Görsel/Video, Açıklama, Uyumlu/Alternatif, SEO) kart/sekme olarak GÖSTERİLMEZ; her biri yapıldıkça eklenir. Düzenleme kaydından sonra Ürünlere Dön + Düzenlemeye Devam Et.
- **`ProductItem` sunucu şekline uyduruldu:** `categoryIds` / `categoryNames` (çoklu kategori); liste süzgeci herhangi bir eşleşmeye bakar.

Gerçek oturumdaki Kategori ve Fırsat panelleri artık açıktır. `getExtraOptions` gerçek kategori/fırsat API'lerini, `getExtras(id)` kartın `/ekler` ucunu kullanır. `save/update` isteğindeki isteğe bağlı `extras` kategori/fırsat seçimlerini kart, birim ve fiyatlarla aynı transaction içinde yazar. Alan gönderilmezse mevcut bağlar korunur; boş diziler gönderilirse temizlenir. Yan seçimler değiştiğinde de yeni requestId üretilir. Birim eşitlemesi için ortak `syncUnits` kullanılır.
