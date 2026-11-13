# Sipariş yaşam döngüsü uygulama planı

> **For agentic workers:** Use superpowers:executing-plans. Kullanıcı doğrudan uygulama istedi; ek onay turu yok. Mevcut çalışma ağacında devam edilir; migration/deploy çalıştırılmaz, karma değişiklikler commit edilmez.

**Goal:** Sipariş oluşturma, teyitli tahsilat ve ürün bazlı iadeyi stok ve cari kayıtlarına bağlamak.
**Architecture:** Yeni lifecycle servisi mevcut router önüne eklenir. Prisma transaction'ı fiyat hesaplama, koşullu stok ve finans kayıtlarını atomik tutar. Eski okuma sözleşmeleri korunur.
**Tech Stack:** Express, Prisma/MySQL, Zod, React, Vitest.
**Spec:** docs/superpowers/specs/2026-11-13-order-lifecycle-design.md

## Global Constraints
- İşletme sınırı, Decimal, aynı isteği tekrar işleme koruması; tüm tarihler *_tarihi.
- Kullanıcı migration/deploy yapacak. Kart sağlayıcı bilgisi gelmeden gerçek kart adaptörü kullanılmaz.

## Task 1: Kayıt sözleşmesi ve atomik lifecycle
- [ ] Yeni shared şemalar ve lifecycle testleri: sahte fiyat, çift istek, stok yetersizliği, fazla tahsilat/iade ve işletme sınırı.
- [ ] Prisma eklemeleri ve yalnızca eklemeli migration. Generate/typecheck; DB'ye uygulama yok.
- [ ] Transaction içinde fiyatlandırma, stok, sipariş ve müşteri hareketleri; tekrarlı istekte mevcut sonuç. Siparişe bağlı tahsilat/iade hareketleri.
- [ ] Yeni siparişlerin durum geçişlerini lifecycle'a yönlendir; eski kayıtları güvenli reddet.

## Task 2: Yönetim ekranı
- [ ] Sipariş oluşturma formu: gerçek müşteri, fiyat listesi, ödeme şekli, ürün/miktar. Oluşturma sonrası liste yenile.
- [ ] Sipariş detayında tahsilat teyidi ve satır bazlı iade talebi.
- [ ] İade detayında teslim alınan/satılabilir satırlar, hesaplanan tutar, manuel geri ödeme teyidi ve tamamlama.
- [ ] Ağ hatasında taslak/istek anahtarını koru; başarılı sonuçta yenile. Demo ekranı gerçek hareket oluşturmaz.

## Task 3: Doğrulama
- [ ] Lifecycle testleri ve mevcut sipariş/kampanya testleri; iki uygulama typecheck/build.
- [ ] Migration ve kuruluş bilgisi gerektiren işleri açıkça raporla.

## Review Focus
- Eşzamanlı stok tüketimi ve aynı isteğin çift tıklanması.
- Farklı iadelerle toplam miktarın aşılması ve kuruş yuvarlaması.
- Ödenmiş/kargolanmış siparişin iptali veya tamamlanmış iadenin geri açılması.
- Müşteri/ürün/ödeme şekli işletme uyuşmazlığı.
- Eski kayıtların yeni finans akışına yanlışlıkla dahil edilmesi.
