-- Doğrulama kodları Redis yerine MySQL'de tutulur (sudo/ek servis gerektirmez).
-- Düz e-posta ve düz kod saklanmaz; ikisi de HMAC hash'tir. Eski kodlar zaten silinmişti.
CREATE TABLE `eposta_giris_kodlari` (
    `kimlik` INTEGER NOT NULL AUTO_INCREMENT,
    `eposta_hash` CHAR(64) NOT NULL,
    `kod_hash` CHAR(64) NOT NULL,
    `gecerlilik_bitis_zamani` DATETIME(3) NOT NULL,
    `deneme_sayisi` INTEGER NOT NULL DEFAULT 0,
    `olusturma_zamani` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `eposta_kodlari_eposta_olusturma_indeks`(`eposta_hash`, `olusturma_zamani`),
    INDEX `eposta_kodlari_olusturma_indeks`(`olusturma_zamani`),
    PRIMARY KEY (`kimlik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
