-- Verileri silmeden tablo, sutun, indeks ve iliski adlarini Turkcelestirir.
-- API durdurularak ve veritabani yedegi alinarak uygulanmalidir.
-- MySQL DDL islemleri transaction ile geri alinamaz.

ALTER TABLE `PasswordCredential` DROP FOREIGN KEY `PasswordCredential_userId_fkey`;
ALTER TABLE `AuthIdentity` DROP FOREIGN KEY `AuthIdentity_userId_fkey`;
ALTER TABLE `Session` DROP FOREIGN KEY `Session_userId_fkey`;

ALTER TABLE `User`
  RENAME COLUMN `id` TO `kimlik`,
  RENAME COLUMN `email` TO `eposta`,
  RENAME COLUMN `emailVerifiedAt` TO `eposta_dogrulama_zamani`,
  RENAME COLUMN `displayName` TO `gorunen_ad`,
  RENAME COLUMN `avatarUrl` TO `profil_resmi_adresi`,
  RENAME COLUMN `status` TO `durum`,
  RENAME COLUMN `createdAt` TO `olusturma_zamani`,
  RENAME COLUMN `updatedAt` TO `guncelleme_zamani`,
  RENAME COLUMN `lastLoginMethod` TO `son_giris_yontemi`,
  RENAME COLUMN `lastLoginAt` TO `son_giris_zamani`,
  RENAME INDEX `User_email_key` TO `kullanicilar_eposta_tekil`;

ALTER TABLE `PasswordCredential`
  RENAME COLUMN `userId` TO `kullanici_kimligi`,
  RENAME COLUMN `passwordHash` TO `sifre_ozeti`,
  RENAME COLUMN `createdAt` TO `olusturma_zamani`,
  RENAME COLUMN `updatedAt` TO `guncelleme_zamani`;

ALTER TABLE `AuthIdentity`
  RENAME COLUMN `provider` TO `saglayici`,
  RENAME COLUMN `id` TO `kimlik`,
  RENAME COLUMN `userId` TO `kullanici_kimligi`,
  RENAME COLUMN `providerUserId` TO `saglayici_kullanici_kimligi`,
  RENAME COLUMN `email` TO `eposta`,
  RENAME COLUMN `lastUsedAt` TO `son_kullanim_zamani`,
  RENAME COLUMN `createdAt` TO `olusturma_zamani`,
  RENAME COLUMN `updatedAt` TO `guncelleme_zamani`,
  RENAME INDEX `AuthIdentity_provider_providerUserId_key` TO `giris_kimlikleri_saglayici_kullanici_tekil`,
  RENAME INDEX `AuthIdentity_userId_idx` TO `giris_kimlikleri_kullanici_indeks`;

ALTER TABLE `Session`
  RENAME COLUMN `id` TO `kimlik`,
  RENAME COLUMN `userId` TO `kullanici_kimligi`,
  RENAME COLUMN `loginMethod` TO `giris_yontemi`,
  RENAME COLUMN `tokenHash` TO `oturum_anahtari_ozeti`,
  RENAME COLUMN `expiresAt` TO `gecerlilik_bitis_zamani`,
  RENAME COLUMN `lastSeenAt` TO `son_gorulme_zamani`,
  RENAME COLUMN `revokedAt` TO `iptal_zamani`,
  RENAME COLUMN `ipAddress` TO `ip_adresi`,
  RENAME COLUMN `userAgent` TO `istemci_bilgisi`,
  RENAME COLUMN `createdAt` TO `olusturma_zamani`,
  RENAME INDEX `Session_tokenHash_key` TO `oturumlar_anahtar_ozeti_tekil`,
  RENAME INDEX `Session_userId_idx` TO `oturumlar_kullanici_indeks`,
  RENAME INDEX `Session_expiresAt_idx` TO `oturumlar_gecerlilik_indeks`;

ALTER TABLE `EmailLoginCode`
  RENAME COLUMN `attempts` TO `deneme_sayisi`,
  RENAME COLUMN `id` TO `kimlik`,
  RENAME COLUMN `email` TO `eposta`,
  RENAME COLUMN `codeHash` TO `kod_ozeti`,
  RENAME COLUMN `expiresAt` TO `gecerlilik_bitis_zamani`,
  RENAME COLUMN `consumedAt` TO `kullanim_zamani`,
  RENAME COLUMN `ipAddress` TO `ip_adresi`,
  RENAME COLUMN `createdAt` TO `olusturma_zamani`,
  RENAME INDEX `EmailLoginCode_email_createdAt_idx` TO `eposta_kodlari_eposta_olusturma_indeks`,
  RENAME INDEX `EmailLoginCode_expiresAt_idx` TO `eposta_kodlari_gecerlilik_indeks`;

RENAME TABLE `User` TO `kullanicilar`,
  `PasswordCredential` TO `sifre_bilgileri`,
  `AuthIdentity` TO `giris_kimlikleri`,
  `Session` TO `oturumlar`,
  `EmailLoginCode` TO `eposta_giris_kodlari`;

ALTER TABLE `sifre_bilgileri` ADD CONSTRAINT `sifre_bilgileri_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar` (`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `giris_kimlikleri` ADD CONSTRAINT `giris_kimlikleri_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar` (`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `oturumlar` ADD CONSTRAINT `oturumlar_kullanici_baglantisi` FOREIGN KEY (`kullanici_kimligi`) REFERENCES `kullanicilar` (`kimlik`) ON DELETE CASCADE ON UPDATE CASCADE;
