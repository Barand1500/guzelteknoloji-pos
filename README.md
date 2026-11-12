<p align="center">
  <img src="docs/assets/banner.svg" alt="Güzel Teknoloji — Stok Kartı ve POS Yönetim Paneli" width="100%">
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&labelColor=20232a">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white">
  <img alt="MySQL" src="https://img.shields.io/badge/MySQL-8%2B-4479A1?logo=mysql&logoColor=white">
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A522-339933?logo=nodedotjs&logoColor=white">
</p>

<table>
  <tr>
    <td width="62%" valign="middle">

### Mağazanı tek yerden yönet

**Güzel Teknoloji**, e-ticaret ve mağaza satıcıları için **mobil öncelikli, Türkçe** bir stok kartı ve ürün yönetim panelidir. Ürünlerini, fiyat listelerini, kategorilerini, markalarını ve görsellerini hızlı ve sade bir arayüzle yönetirsin. Telefonda da bilgisayarda da aynı rahatlıkta çalışır.

🔐 Güvenli giriş &nbsp;·&nbsp; 📱 Mobil öncelikli &nbsp;·&nbsp; ♿ Erişilebilir &nbsp;·&nbsp; 🌗 Açık/koyu tema

</td>
    <td width="38%" align="center">
      <img src="docs/hero-worker.png" alt="Giriş ekranını kullanan çalışan çizimi" width="260">
    </td>
  </tr>
</table>

---

## ✨ Neler var?

| | Modül | Öne çıkanlar |
| :-: | --- | --- |
| 📦 | **Ürünler** | Aranabilir süzgeçler, FİYAT sütunu + üzerine gelince tüm fiyat listeleri, resme çift tıklayınca görseller, kopyala / düzenle / sil, sunucu taraflı sayfalama |
| 🧾 | **Yeni Stok Kartı** | Ürün tipi, kodu, adı, marka, bayraklı menşei, envanter takibi, **çoklu Diğer Vergi (oranlı)**, birimler ve barkodlar, dinamik fiyat listeleri |
| 💰 | **Fiyat ve Birimler** | Birim/çarpan, KDV Dahil/Hariç, alış-satış fiyatları, kullanıcının kendi fiyat listeleri |
| 🖼️ | **Toplu Görsel** | Dosyaları ürünlerle eşleştirir, ürün başına tüm görselleri sürükleyerek sıralar (ilk görsel vitrin) |
| 📥 | **Excel ile İçe Aktarma** | 3 adımlı sihirbaz: dosya → sütun eşleştirme → önizleme |
| 🗂️ | **Kategoriler / Markalar** | Hiyerarşik kategoriler, marka SEO alanları, çift tıklayarak görsel yükleme |
| 🏷️ | **Özellikler & Varyantlar** | Özellik grupları, mağaza filtresi, varyant ve ürün resmi üstünde rozet |
| 🔥 | **Fırsatlar** | İkonlu rozetler, 8 konum seçeneği, canlı önizleme |
| 🔑 | **Giriş** | E-posta + şifre, 6 haneli e-posta kodu, Google ile giriş, yardım penceresi |

## 🧱 Teknoloji

```text
┌──────────────────────┐    /api     ┌──────────────────────┐        ┌───────────────┐
│  apps/web            │ ──────────▶ │  apps/api            │ ─────▶ │  MySQL 8+ /   │
│  React 19 · Vite 8   │             │  Express 5 · Prisma 7│        │  MariaDB 10.6+│
│  Tailwind 4          │ ◀────────── │  oturum · CSRF · hız │        └───────────────┘
└──────────┬───────────┘             └──────────┬───────────┘
           └────────── packages/shared ─────────┘
                  ortak Zod şemaları ve tipler
```

npm workspaces monoreposu. Web ile API aynı doğrulama şemalarını (`packages/shared`) kullanır.

## 🚀 Hızlı başlangıç

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
# .env içinde DATABASE_URL, COOKIE_SECRET ve APP_URL değerlerini doldurun

npm run db:deploy           # migration'ları uygular
npm run db:seed:dev         # (isteğe bağlı) geliştirme kullanıcısı
npm run dev                 # API :3000  +  Web :5173
```

Ardından tarayıcıda **http://localhost:5173/login** adresini açın.

> **Gereksinimler:** Node.js 22+ ve MySQL 8+ (ya da MariaDB 10.6+).

## 🧪 Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | API ve web'i birlikte başlatır |
| `npm run build` | Web ve API'yi derler |
| `npm test` | API ve web testleri (Vitest) |
| `npm run test:responsive` | 320–1920 px duyarlılık ve erişilebilirlik testleri |
| `npm run lint` · `npm run typecheck` | Kod kalitesi |
| `npm run db:deploy` | Migration'ları uygular (production'da da bu) |

## 📚 Dokümanlar

| Konu | Dosya |
| --- | --- |
| Kurulum, giriş altyapısı, API ve Google OAuth | [docs/kurulum-ve-api.md](docs/kurulum-ve-api.md) |
| Sunucu kurulumu (CloudPanel, SSL, PM2) | [docs/DEPLOY.md](docs/DEPLOY.md) |
| Proje kuralları | [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md) |
| Test rehberi (sayfa sayfa) | [docs/test-rehberi.md](docs/test-rehberi.md) |
| Stok API'si · katalog API'si | [docs/stok-api.md](docs/stok-api.md) · [docs/katalog-api.md](docs/katalog-api.md) |
| Siparişler, iadeler ve anasayfa API'si | [docs/siparis-api.md](docs/siparis-api.md) |
| Müşteriler API'si | [docs/musteri-api.md](docs/musteri-api.md) |
| Tanımlamalar (kargo, para birimleri) | [docs/tanimlamalar-veritabani.md](docs/tanimlamalar-veritabani.md) |
| Mobil bildirimler | [docs/bildirimler-veritabani.md](docs/bildirimler-veritabani.md) |
| E-ticaret site içeriği API'si | [docs/eticaret-site-api.md](docs/eticaret-site-api.md) |
| Veritabanı güncellemesi (ürün adlandırma, çoklu vergi) | [docs/urun-veritabani-guncellemesi.md](docs/urun-veritabani-guncellemesi.md) |
| Kimlik politikası | [docs/auth-policy.md](docs/auth-policy.md) |

## 🗂️ Klasör yapısı

```text
apps/
  api/             Express API, Prisma şeması ve migration'lar, testler
  web/             React uygulaması, e2e/ altında duyarlı görünüm testleri
packages/shared/   Ortak Zod şemaları ve tipler
deploy/            Sunucu güncelleme betiği ve .env şablonu
docs/              Dokümanlar ve görseller
```

## 🔄 Sunucuya güncelleme

```bash
bash deploy/update.sh
```

---

<p align="center"><sub>Güzel Teknoloji · Stok Kartı & POS · Türkiye'de 🧡 ile geliştirildi</sub></p>
