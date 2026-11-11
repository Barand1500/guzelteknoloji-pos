import { createHmac } from 'node:crypto';
import { HttpError } from '../../lib/http-error';
import { safeEqualHex } from '../../lib/crypto';
import type { PrismaClient } from '../../lib/prisma';
import type { CodePolicy, CodeReservation, EmailCodeStore } from './email-code.store';

const HOUR_MS = 3_600_000;
const LOCK_WAIT_SECONDS = 5;

/**
 * Giriş kodlarının MySQL deposu. Düz e-posta ve düz kod saklanmaz (ikisi de HMAC hash).
 * Aynı e-postaya eşzamanlı istekler, e-posta hash'ine bağlı MySQL adlandırılmış kilidiyle
 * sıraya girer; böylece bekleme süresi, saatlik kota ve tek kullanım aşılamaz.
 * Kullanılmış/süresi dolmuş satırlar, saatlik kotayı sayabilmek için bir saat saklanır.
 */
export class MysqlEmailCodeStore implements EmailCodeStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly secret: string,
    private readonly now: () => number = () => Date.now(),
  ) {}

  private emailHash(email: string) {
    return createHmac('sha256', this.secret).update(`email:${email}`).digest('hex');
  }

  /** Kilit alınır, iş bitince (hata olsa da) bırakılır. Kilit işlemle aynı bağlantıdadır. */
  private async withLock<T>(
    emailHash: string,
    work: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const name = `gt-kod-${emailHash.slice(0, 48)}`;
        const rows = await tx.$queryRaw<
          { ok: number | bigint | null }[]
        >`SELECT GET_LOCK(${name}, ${LOCK_WAIT_SECONDS}) AS ok`;
        if (Number(rows[0]?.ok) !== 1) throw new Error('Kilit alınamadı.');
        try {
          return await work(tx);
        } finally {
          await tx.$queryRaw`SELECT RELEASE_LOCK(${name})`;
        }
      });
    } catch {
      throw new HttpError(
        503,
        'EMAIL_UNAVAILABLE',
        'Doğrulama şu anda kullanılamıyor. Lütfen biraz sonra tekrar deneyin.',
      );
    }
  }

  async reserve(email: string, codeHash: string, policy: CodePolicy): Promise<CodeReservation> {
    const emailHash = this.emailHash(email);
    const now = this.now();
    return this.withLock(emailHash, async (tx) => {
      // Bir saatten eski kayıtlar artık kota için de gerekmez (herkes için temizlenir).
      await tx.epostaGirisKodu.deleteMany({
        where: { olusturmaZamani: { lt: new Date(now - HOUR_MS) } },
      });
      const recent = await tx.epostaGirisKodu.findMany({
        where: { epostaHash: emailHash },
        orderBy: { olusturmaZamani: 'desc' },
      });
      const latest = recent[0];
      if (latest) {
        const resendAt = latest.olusturmaZamani.getTime() + policy.resendSeconds * 1000;
        if (resendAt > now)
          return {
            status: 'waiting',
            resendAfterSeconds: Math.ceil((resendAt - now) / 1000),
            expiresInSeconds: Math.max(
              0,
              Math.ceil((latest.gecerlilikBitisTarihi.getTime() - now) / 1000),
            ),
          } as const;
      }
      if (recent.length >= policy.maxPerHour) return { status: 'limited' } as const;

      // Önceki kodlar geçersiz olur; yalnızca en yeni kod kullanılabilir.
      await tx.epostaGirisKodu.updateMany({
        where: { epostaHash: emailHash, gecerlilikBitisTarihi: { gt: new Date(now) } },
        data: { gecerlilikBitisTarihi: new Date(now) },
      });
      const created = await tx.epostaGirisKodu.create({
        data: {
          epostaHash: emailHash,
          kodHash: codeHash,
          gecerlilikBitisTarihi: new Date(now + policy.ttlSeconds * 1000),
          olusturmaZamani: new Date(now),
        },
      });
      return { status: 'created', id: String(created.kimlik) } as const;
    });
  }

  async discard(email: string, id: string) {
    const kimlik = Number(id);
    if (!Number.isInteger(kimlik)) return;
    await this.withLock(this.emailHash(email), async (tx) => {
      await tx.epostaGirisKodu.deleteMany({
        where: { kimlik, epostaHash: this.emailHash(email) },
      });
    });
  }

  async verify(email: string, codeHash: string, maxAttempts: number) {
    const emailHash = this.emailHash(email);
    const now = this.now();
    return this.withLock(emailHash, async (tx) => {
      const current = await tx.epostaGirisKodu.findFirst({
        where: { epostaHash: emailHash, gecerlilikBitisTarihi: { gt: new Date(now) } },
        orderBy: { olusturmaZamani: 'desc' },
      });
      if (!current) return false;
      if (current.denemeSayisi >= maxAttempts) {
        await tx.epostaGirisKodu.update({
          where: { kimlik: current.kimlik },
          data: { gecerlilikBitisTarihi: new Date(now) },
        });
        return false;
      }
      if (safeEqualHex(current.kodHash, codeHash)) {
        // Tek kullanım: kod hemen geçersiz kılınır.
        await tx.epostaGirisKodu.update({
          where: { kimlik: current.kimlik },
          data: { gecerlilikBitisTarihi: new Date(now) },
        });
        return true;
      }
      const attempts = current.denemeSayisi + 1;
      await tx.epostaGirisKodu.update({
        where: { kimlik: current.kimlik },
        data: {
          denemeSayisi: attempts,
          ...(attempts >= maxAttempts ? { gecerlilikBitisTarihi: new Date(now) } : {}),
        },
      });
      return false;
    });
  }
}
