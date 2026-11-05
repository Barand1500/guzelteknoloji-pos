-- CreateTable
CREATE TABLE `EmailLoginCode` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `consumedAt` DATETIME(3) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailLoginCode_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `EmailLoginCode_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
