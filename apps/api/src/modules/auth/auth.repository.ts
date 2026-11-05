import type { PrismaClient } from '../../lib/prisma';
import type { EpostaGirisKodu, Prisma } from '../../generated/prisma/client';
import type {
  AuthProvider,
  LoginMethod,
  EmailCodeRecord,
  SessionRecord,
  UserRecord,
} from './auth.types';

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
  /** E-posta kodu akışı: kod kaydı en yeni olandan okunur. */
  findLatestLoginCode(email: string): Promise<EmailCodeRecord | null>;
  countLoginCodesSince(email: string, since: Date): Promise<number>;
  createLoginCode(data: {
    email: string;
    codeHash: string;
    expiresAt: Date;
    ipAddress: string | null;
  }): Promise<EmailCodeRecord>;
  incrementLoginCodeAttempts(id: string): Promise<void>;
  consumeLoginCode(id: string, at: Date): Promise<void>;
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
  epostaDogrulamaZamani: true,
  gorunenAd: true,
  profilResmiAdresi: true,
  durum: true,
} as const;

type KullaniciKaydi = Prisma.KullaniciGetPayload<{
  select: typeof userSelect;
}>;
const toUser = (row: KullaniciKaydi): UserRecord => ({
  id: row.kimlik,
  email: row.eposta,
  emailVerifiedAt: row.epostaDogrulamaZamani,
  displayName: row.gorunenAd,
  avatarUrl: row.profilResmiAdresi,
  status: row.durum === 'AKTIF' ? 'ACTIVE' : 'DISABLED',
});
const optionalUser = (row: KullaniciKaydi | null) => (row ? toUser(row) : null);
const toSession = (row: {
  kimlik: string;
  kullaniciKimligi: string;
  gecerlilikBitisZamani: Date;
  sonGorulmeZamani: Date;
}): SessionRecord => ({
  id: row.kimlik,
  userId: row.kullaniciKimligi,
  expiresAt: row.gecerlilikBitisZamani,
  lastSeenAt: row.sonGorulmeZamani,
});
const toCode = (row: EpostaGirisKodu): EmailCodeRecord => ({
  id: row.kimlik,
  email: row.eposta,
  codeHash: row.kodOzeti,
  expiresAt: row.gecerlilikBitisZamani,
  attempts: row.denemeSayisi,
  consumedAt: row.kullanimZamani,
  createdAt: row.olusturmaZamani,
});

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findUserById(id: string) {
    return this.db.kullanici
      .findUnique({ where: { kimlik: id }, select: userSelect })
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
      select: { ...userSelect, sifreBilgisi: { select: { sifreOzeti: true } } },
    });
    if (!row?.sifreBilgisi) return null;
    return { user: toUser(row), passwordHash: row.sifreBilgisi.sifreOzeti };
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
          epostaDogrulamaZamani: data.emailVerifiedAt,
          gorunenAd: data.displayName,
          profilResmiAdresi: data.avatarUrl,
          girisKimlikleri: {
            create: {
              saglayici: data.provider,
              saglayiciKullaniciKimligi: data.providerUserId,
              eposta: data.email,
              sonKullanimZamani: new Date(),
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
        kullaniciKimligi: data.userId,
        saglayici: data.provider,
        saglayiciKullaniciKimligi: data.providerUserId,
        eposta: data.email,
        sonKullanimZamani: new Date(),
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
      data: { sonKullanimZamani: at },
    });
  }
  createSession(data: Parameters<AuthRepository['createSession']>[0]) {
    return this.db.$transaction(async (tx) => {
      const row = await tx.oturum.create({
        data: {
          kullaniciKimligi: data.userId,
          girisYontemi: data.loginMethod === 'EMAIL' ? 'EPOSTA' : data.loginMethod,
          oturumAnahtariOzeti: data.tokenHash,
          gecerlilikBitisZamani: data.expiresAt,
          ipAdresi: data.ipAddress,
          istemciBilgisi: data.userAgent,
        },
      });
      await tx.kullanici.update({
        where: { kimlik: data.userId },
        data: {
          sonGirisYontemi: data.loginMethod === 'EMAIL' ? 'EPOSTA' : data.loginMethod,
          sonGirisZamani: new Date(),
        },
      });
      return toSession(row);
    });
  }
  async findActiveSession(tokenHash: string, now: Date) {
    const row = await this.db.oturum.findFirst({
      where: {
        oturumAnahtariOzeti: tokenHash,
        iptalZamani: null,
        gecerlilikBitisZamani: { gt: now },
      },
      include: { kullanici: { select: userSelect } },
    });
    return row ? { session: toSession(row), user: toUser(row.kullanici) } : null;
  }
  async touchSession(sessionId: string, at: Date) {
    await this.db.oturum.update({ where: { kimlik: sessionId }, data: { sonGorulmeZamani: at } });
  }
  async revokeSessionByTokenHash(tokenHash: string, at: Date) {
    await this.db.oturum.updateMany({
      where: { oturumAnahtariOzeti: tokenHash, iptalZamani: null },
      data: { iptalZamani: at },
    });
  }
  async findLatestLoginCode(email: string) {
    const row = await this.db.epostaGirisKodu.findFirst({
      where: { eposta: email },
      orderBy: { olusturmaZamani: 'desc' },
    });
    return row ? toCode(row) : null;
  }
  countLoginCodesSince(email: string, since: Date) {
    return this.db.epostaGirisKodu.count({
      where: { eposta: email, olusturmaZamani: { gte: since } },
    });
  }
  createLoginCode(data: Parameters<AuthRepository['createLoginCode']>[0]) {
    return this.db.epostaGirisKodu
      .create({
        data: {
          eposta: data.email,
          kodOzeti: data.codeHash,
          gecerlilikBitisZamani: data.expiresAt,
          ipAdresi: data.ipAddress,
        },
      })
      .then(toCode);
  }
  async incrementLoginCodeAttempts(id: string) {
    await this.db.epostaGirisKodu.update({
      where: { kimlik: id },
      data: { denemeSayisi: { increment: 1 } },
    });
  }
  async consumeLoginCode(id: string, at: Date) {
    await this.db.epostaGirisKodu.update({ where: { kimlik: id }, data: { kullanimZamani: at } });
  }
  createVerifiedUser(data: Parameters<AuthRepository['createVerifiedUser']>[0]) {
    return this.db.kullanici
      .create({
        data: { eposta: data.email, epostaDogrulamaZamani: data.emailVerifiedAt },
        select: userSelect,
      })
      .then(toUser);
  }
  async markEmailVerified(userId: string, at: Date) {
    await this.db.kullanici.updateMany({
      where: { kimlik: userId, epostaDogrulamaZamani: null },
      data: { epostaDogrulamaZamani: at },
    });
  }
  upsertPasswordUser(data: Parameters<AuthRepository['upsertPasswordUser']>[0]) {
    return this.db.kullanici
      .upsert({
        where: { eposta: data.email },
        create: {
          eposta: data.email,
          gorunenAd: data.displayName,
          sifreBilgisi: { create: { sifreOzeti: data.passwordHash } },
        },
        update: {
          sifreBilgisi: {
            upsert: {
              create: { sifreOzeti: data.passwordHash },
              update: { sifreOzeti: data.passwordHash },
            },
          },
        },
        select: userSelect,
      })
      .then(toUser);
  }
}
