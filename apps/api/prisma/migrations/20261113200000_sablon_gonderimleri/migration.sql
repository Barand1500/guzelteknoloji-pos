CREATE TABLE `sablon_gonderimleri` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `isletme_id` INTEGER NOT NULL,
  `olay_anahtari` VARCHAR(100) NOT NULL,
  `olay` VARCHAR(40) NOT NULL,
  `kanal` VARCHAR(10) NOT NULL,
  `alici` VARCHAR(254) NOT NULL,
  `konu` VARCHAR(500) NOT NULL,
  `icerik` MEDIUMTEXT NOT NULL,
  `durum` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `hata_kodu` VARCHAR(80) NULL,
  `olusturma_tarihi` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `guncelleme_tarihi` DATETIME(3) NOT NULL,
  `gonderim_tarihi` DATETIME(3) NULL,
  UNIQUE INDEX `sablon_gonderimleri_olay_tekil` (`isletme_id`, `olay_anahtari`, `kanal`),
  INDEX `sablon_gonderimleri_kuyruk_indeks` (`durum`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `sablon_gonderimleri_isletme_baglantisi` FOREIGN KEY (`isletme_id`) REFERENCES `isletmeler` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
