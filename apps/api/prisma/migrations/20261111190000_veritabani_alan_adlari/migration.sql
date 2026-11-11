-- Fiziksel kolon adlarini duzelt; RENAME COLUMN mevcut turu, varsayilani ve degerleri korur.
ALTER TABLE `urun_secenekleri` RENAME COLUMN `etkin` TO `durum`;
ALTER TABLE `markalar` RENAME COLUMN `etkin` TO `durum`;
ALTER TABLE `kategoriler` RENAME COLUMN `etkin` TO `durum`;
ALTER TABLE `firsatlar` RENAME COLUMN `etkin` TO `durum`;
ALTER TABLE `isletme_uyeleri` RENAME COLUMN `etkin` TO `durum`;
ALTER TABLE `musteriler` RENAME COLUMN `etkin` TO `durum`;
ALTER TABLE `musteri_kullanicilari` RENAME COLUMN `etkin` TO `durum`;

-- Son kullanma anini tarih/saat olarak adlandir; DATETIME(3) hassasiyeti aynen korunur.
ALTER TABLE `oturumlar` RENAME COLUMN `gecerlilik_bitis_zamani` TO `gecerlilik_bitis_tarihi`;
ALTER TABLE `eposta_giris_kodlari` RENAME COLUMN `gecerlilik_bitis_zamani` TO `gecerlilik_bitis_tarihi`;
