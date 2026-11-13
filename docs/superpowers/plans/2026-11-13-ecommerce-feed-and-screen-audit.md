# E‑Ticaret Feed ve Ekran Bağlantıları Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerçek stok kartlarından güvenli ve mağaza adresleri uydurmayan Google/Meta XML ürün feed'i üretmek; E‑Ticaret ekranlarının backend/frontend bağlantılarını taramak.

**Architecture:** `site_xml` JSON ayarına ürün URL şablonu eklenir. Public feed ve feed görsel uçları kimlik doğrulama duvarından önce mount edilir, ayar etkinliği ve işletme/ürün sahipliği doğrulanır. Yönetim ekranı gerçek feed adresini ve URL şablonunu gösterip kaydeder. Diğer ekranlar mevcut Prisma/API akışlarıyla eşleştirilir.

**Tech Stack:** Express, Prisma, Zod, React, mevcut Vitest test altyapısı.

**Spec:** `docs/superpowers/specs/2026-11-13-ecommerce-feed-and-screen-audit.md`

## Global Constraints

- Feed yalnızca etkin ve geçerli ürün URL şablonu olan işletmede public olmalıdır.
- Feed sadece satışa açık, ana görseli ve fiyatı bulunan stok kartlarını yayımlamalıdır.
- Başka işletmenin ürün/görsel kaydı URL kimliğiyle okunamamalıdır.
- Yeni tablo veya Prisma migration eklenmemelidir.
- Var olan çalışma ağacı değişiklikleri korunmalıdır.

## Review Focus

- URL şablonunda eksik belirteç veya HTTP/yanlış adres: ayar kaydı reddedilmeli.
- Başka işletmenin işletme kimliği: feed boş/404 dönmeli, ürün sızmamalı.
- Feed kapalıyken doğrudan feed/görsel URL'si: 404.
- XML'de `&`, `<` ve Türkçe karakterler: geçerli UTF‑8 RSS/XML olarak encode edilmeli.
- Görseli/fiyatı olmayan veya satışı kapalı ürün: feed dışında kalmalı.

### Task 1: Feed XML üreticisi

**Files:**
- Create: `apps/api/src/modules/site/site.feed.ts`
- Test: `apps/api/src/tests/site-feed.test.ts`

- [ ] RSS item üretimi, XML escaping, para birimi/fiyat, stok durumu ve URL şablonu için başarısız testler yaz ve çalıştır.
- [ ] Saf XML formatlayıcı ve ürün eşleme fonksiyonlarını ekle; testleri geçir.

### Task 2: İşletme scoped feed ve public görsel API'si

**Files:**
- Create: `apps/api/src/modules/site/site.feed.routes.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/modules/site/site.routes.ts`
- Modify: `apps/api/src/modules/workspace/workspace.settings.ts`
- Modify: `packages/shared/src/workspace.ts`
- Test: `apps/api/src/tests/site-feed.test.ts`

- [ ] İşletme ayar doğrulama ve feed kapalı/yanlış sahiplik/ürün-fiyat-görsel eşleme testlerini yaz ve çalıştır.
- [ ] Public router'ı workspace authentication middleware öncesi mount et; feed ve sahipliği doğrulanmış image URL'leri sun.
- [ ] Site ayar kaydı ürün URL şablonunu doğrulasın; yönetim API'si gerçek feed URL'sini dönsün.

### Task 3: XML yönetim ekranı

**Files:**
- Modify: `apps/web/src/features/ecommerce-settings/services/site.service.ts`
- Modify: `apps/web/src/features/ecommerce-settings/components/IntegrationScreens.tsx`
- Modify: `packages/shared/src/workspace.ts`
- Test: ilgili `apps/web/src/pages/app` XML ayar testi

- [ ] URL şablonu alanı, `{id}`/`{code}`/`{slug}` kullanımı, gerçek feed adresi ve geçersiz ayar kaydı için UI testi yaz.
- [ ] Ekranı gerçek feed yönetimine bağla; feed açma/kaydetme validasyonunu uygula.

### Task 4: E‑Ticaret ekran bağlantı denetimi

**Files:**
- İncelenecek: `apps/web/src/features/ecommerce-settings/components/*`, `apps/api/src/modules/site/*`, `apps/api/src/modules/workspace/*`
- Modify/Test: yalnızca doğrulanan kopuk bağlantılar

- [ ] Tüm ekranları GET/load, POST/save, image upload ve işletme kapsamı açısından karşılaştır.
- [ ] Gerçekten kopuk olan, harici sözleşmeye ihtiyaç duymayan akışları düzelt ve ilgili kısa testi çalıştır.
- [ ] ERP adapter ve storefront'ta özel kod çalıştırma, sağlayıcı/runtime eksik olduğundan yapılandırma sınırı olarak raporlanır.

### Task 5: Doğrulama

- [ ] API odaklı feed/site testleri.
- [ ] Web odaklı XML ekran testi.
- [ ] API/web typecheck ve `git diff --check`.
