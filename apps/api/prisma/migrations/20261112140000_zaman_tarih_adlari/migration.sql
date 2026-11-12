-- Zamanla biten kolon adlari tarih olarak adlandirilir; RENAME COLUMN turu, varsayilani
-- ve mevcut degerleri aynen korur. Indeks tanimlari MySQL 8'de kolon adini otomatik izler.

ALTER TABLE `kullanicilar` RENAME COLUMN `eposta_dogrulama_zamani` TO `eposta_dogrulama_tarihi`;
ALTER TABLE `kullanicilar` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `kullanicilar` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;
ALTER TABLE `kullanicilar` RENAME COLUMN `son_giris_zamani` TO `son_giris_tarihi`;
ALTER TABLE `kullanicilar` RENAME COLUMN `sifre_olusturma_zamani` TO `sifre_olusturma_tarihi`;
ALTER TABLE `kullanicilar` RENAME COLUMN `sifre_guncelleme_zamani` TO `sifre_guncelleme_tarihi`;

ALTER TABLE `giris_kimlikleri` RENAME COLUMN `son_kullanim_zamani` TO `son_kullanim_tarihi`;
ALTER TABLE `giris_kimlikleri` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `giris_kimlikleri` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `oturumlar` RENAME COLUMN `son_gorulme_zamani` TO `son_gorulme_tarihi`;
ALTER TABLE `oturumlar` RENAME COLUMN `iptal_zamani` TO `iptal_tarihi`;
ALTER TABLE `oturumlar` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;

ALTER TABLE `eposta_giris_kodlari` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;

ALTER TABLE `urun_secenekleri` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;

ALTER TABLE `markalar` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `markalar` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `urunler` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `urunler` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `isletmeler` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `isletme_uyeleri` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;

ALTER TABLE `siparisler` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `siparisler` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `iade_talepleri` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `iade_talepleri` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `musteriler` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `musteriler` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `musteri_kullanicilari` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;

ALTER TABLE `musteri_adresleri` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `musteri_adresleri` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `musteri_hareketleri` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;

ALTER TABLE `para_birimleri` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `para_birimleri` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `kargo_firmalari` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;
ALTER TABLE `kargo_firmalari` RENAME COLUMN `guncelleme_zamani` TO `guncelleme_tarihi`;

ALTER TABLE `islem_kayitlari` RENAME COLUMN `olusturma_zamani` TO `olusturma_tarihi`;

-- Islem tablolarinin adlari: ana log "islem loglari", alan bazindaki eski/yeni deger
-- kaydi "islem kayitlari detayi". Yabanci anahtarlar ve icerik aynen korunur.
RENAME TABLE `islem_kayitlari` TO `islem_loglari`;
RENAME TABLE `islem_degisiklikleri` TO `islem_kayitlari_detayi`;
