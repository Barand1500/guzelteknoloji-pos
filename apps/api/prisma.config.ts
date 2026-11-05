import { defineConfig } from 'prisma/config';

// Prisma CLI .env'i otomatik yüklemez; kök dizindeki .env'i (varsa) Node ile yüklüyoruz.
try {
  process.loadEnvFile('../../.env');
} catch {
  // .env yoksa ortam değişkenleri doğrudan sistemden okunur (ör. CloudPanel).
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // `prisma generate` bağlantı gerektirmez; boş değer yalnızca migrate komutlarında hata verir.
    url: process.env.DATABASE_URL ?? '',
  },
});
