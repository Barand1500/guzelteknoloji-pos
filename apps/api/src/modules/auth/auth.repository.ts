import type { PrismaClient } from '../../lib/prisma';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthProvider, LoginMethod, SessionRecord, UserRecord } from './auth.types';

/**
 * Veri erişim sözleşmesi. Servis bu arayüze bağımlıdır; böylece testler
 * veritabanı olmadan bellek içi uygulamayla çalışabilir.
 */
export interface AuthRepository {
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findPasswordLogin(email: string): Promise<{ user: UserRecord; passwordHash: string } | null>;
  findUserByIdentity(provider: AuthProvider, providerUserId: string): Promise<UserRecord | null>;
  createUserWithIdentity(data: {
    email: string;
    emailVerifiedAt: Date;
    displayName: string | null;
    avatarUrl: string | null;
    provider: AuthProvider;
    providerUserId: string;
  }): Promise<UserRecord>;
  linkIdentity(data: {
    userId: string;
    provider: AuthProvider;
    providerUserId: string;
    email: string | null;
  }): Promise<void>;
  touchIdentity(provider: AuthProvider, providerUserId: string, at: Date): Promise<void>;
  createSession(data: {
    userId: string;
    loginMethod: LoginMethod;
    tokenHash: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<SessionRecord>;
  findActiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<{ session: SessionRecord; user: UserRecord } | null>;
  touchSession(sessionId: string, at: Date): Promise<void>;
  revokeSessionByTokenHash(tokenHash: string, at: Date): Promise<void>;
  /** Kod doğrulanınca hesap yoksa oluşturulur (e-posta kanıtlanmıştır). */
  createVerifiedUser(data: { email: string; emailVerifiedAt: Date }): Promise<UserRecord>;
  markEmailVerified(userId: string, at: Date): Promise<void>;
  /** Yalnızca geliştirme seed betiği tarafından kullanılır. */
  upsertPasswordUser(data: {
    email: string;
    passwordHash: string;
    displayName: string | null;
  }): Promise<UserRecord>;
}

const userSelect = {
  kimlik: true,
  eposta: true,
  epostaDogrulamaTarihi: true,
  gorunenAd: true,
  profilResmiAdresi: true,
  durum: true,
} as const;

type KullaniciKaydi = Prisma.KullaniciGetPayload<{
  select: typeof userSelect;
}>;
const toUser = (row: KullaniciKaydi): UserRecord => ({
  id: String(row.kimlik),
  email: row.eposta,
  emailVerifiedAt: row.epostaDogrulamaTarihi,
  displayName: row.gorunenAd,
  avatarUrl: row.profilResmiAdresi,
  status: row.durum === 'AKTIF' ? 'ACTIVE' : 'DISABLED',
});
const optionalUser = (row: KullaniciKaydi | null) => (row ? toUser(row) : null);
const toSession = (row: {
  kimlik: number;
  kullaniciKimligi: number;
  gecerlilikBitisTarihi: Date;
  sonGorulmeTarihi: Date;
}): SessionRecord => ({
  id: String(row.kimlik),
  userId: String(row.kullaniciKimligi),
  expiresAt: row.gecerlilikBitisTarihi,
  lastSeenAt: row.sonGorulmeTarihi,
});
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserById(id: string) {
    return this.db.kullanici
      .findUnique({ where: { kimlik: Number(id) }, select: userSelect })
      .then(optionalUser);
  }
  findUserByEmail(email: string) {
    return this.db.kullanici
      .findUnique({ where: { eposta: email }, select: userSelect })
      .then(optionalUser);
  }
  async findPasswordLogin(email: string) {
    const row = await this.db.kullanici.findUnique({
      where: { eposta: email },
      select: { ...userSelect, sifreHash: true },
    });
    if (!row?.sifreHash) return null;
    return { user: toUser(row), passwordHash: row.sifreHash };
  }
  async findUserByIdentity(provider: AuthProvider, providerUserId: string) {
    const row = await this.db.girisKimligi.findUnique({
      where: {
        saglayici_saglayiciKullaniciKimligi: {
          saglayici: provider,
          saglayiciKullaniciKimligi: providerUserId,
        },
      },
      select: { kullanici: { select: userSelect } },
    });
    return row ? toUser(row.kullanici) : null;
  }
  createUserWithIdentity(data: Parameters<AuthRepository['createUserWithIdentity']>[0]) {
    return this.db.kullanici
      .create({
        data: {
          eposta: data.email,
          epostaDogrulamaTarihi: data.emailVerifiedAt,
          gorunenAd: data.displayName,
          profilResmiAdresi: data.avatarUrl,
          girisKimlikleri: {
            create: {
              saglayici: data.provider,
              saglayiciKullaniciKimligi: data.providerUserId,
              eposta: data.email,
              sonKullanimTarihi: new Date(),
            },
          },
        },
        select: userSelect,
      })
      .then(toUser);
  }
  async linkIdentity(data: Parameters<AuthRepository['linkIdentity']>[0]) {
    await this.db.girisKimligi.create({
      data: {
        kullaniciKimligi: Number(data.userId),
        saglayici: data.provider,
        saglayiciKullaniciKimligi: data.providerUserId,
        eposta: data.email,
        sonKullanimTarihi: new Date(),
      },
    });
  }
  async touchIdentity(provider: AuthProvider, providerUserId: string, at: Date) {
    await this.db.girisKimligi.update({
      where: {
        saglayici_saglayiciKullaniciKimligi: {
          saglayici: provider,
          saglayiciKullaniciKimligi: providerUserId,
        },
      },
      data: { sonKullanimTarihi: at },
    });
  }
  createSession(data: Parameters<AuthRepository['createSession']>[0]) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.oturum.create({
        data: {
          kullaniciKimligi: Number(data.userId),
          girisYontemi: data.loginMethod === 'EMAIL' ? 'EPOSTA' : data.loginMethod,
          oturumAnahtariHash: data.tokenHash,
          gecerlilikBitisTarihi: data.expiresAt,
          ipAdresi: data.ipAddress,
          istemciBilgisi: data.userAgent,
        },
      });
      await tx.kullanici.update({
        where: { kimlik: Number(data.userId) },
        data: {
          sonGirisYontemi: data.loginMethod === 'EMAIL' ? 'EPOSTA' : data.loginMethod,
          sonGirisTarihi: new Date(),
        },
      });
      return toSession(row);
    });
  }
  async findActiveSession(tokenHash: string, now: Date) {
    const row = await this.db.oturum.findFirst({
      where: {
        oturumAnahtariHash: tokenHash,
        iptalTarihi: null,
        gecerlilikBitisTarihi: { gt: now },
      },
      include: { kullanici: { select: userSelect } },
    });
    return row ? { session: toSession(row), user: toUser(row.kullanici) } : null;
  }
  async touchSession(sessionId: string, at: Date) {
    await this.db.oturum.update({
      where: { kimlik: Number(sessionId) },
      data: { sonGorulmeTarihi: at },
    });
  }
  async revokeSessionByTokenHash(tokenHash: string, at: Date) {
    await this.db.oturum.updateMany({
      where: { oturumAnahtariHash: tokenHash, iptalTarihi: null },
      data: { iptalTarihi: at },
    });
  }
  createVerifiedUser(data: Parameters<AuthRepository['createVerifiedUser']>[0]) {
    return this.db.kullanici
      .create({
        data: { eposta: data.email, epostaDogrulamaTarihi: data.emailVerifiedAt },
        select: userSelect,
      })
      .then(toUser);
  }
  async markEmailVerified(userId: string, at: Date) {
    await this.db.kullanici.updateMany({
      where: { kimlik: Number(userId), epostaDogrulamaTarihi: null },
      data: { epostaDogrulamaTarihi: at },
    });
  }
  upsertPasswordUser(data: Parameters<AuthRepository['upsertPasswordUser']>[0]) {
    const now = new Date();
    // Şifresiz bir hesaba ilk şifre atanırken başlangıç tarihi de doldurulur.
    // Aynı hesaba eşzamanlı seed çağrıları ilk oluşturma tarihini değiştiremez.
    return this.db.$transaction(async (tx) => {
      const row = await tx.kullanici.upsert({
        where: { eposta: data.email },
        create: {
          eposta: data.email,
          gorunenAd: data.displayName,
          sifreHash: data.passwordHash,
          sifreOlusturmaTarihi: now,
          sifreGuncellemeTarihi: now,
        },
        update: {
          sifreHash: data.passwordHash,
          sifreGuncellemeTarihi: now,
        },
        select: userSelect,
      });
      await tx.kullanici.updateMany({
        where: { kimlik: row.kimlik, sifreOlusturmaTarihi: null },
        data: { sifreOlusturmaTarihi: now },
      });
      return toUser(row);
    });
  }
}
