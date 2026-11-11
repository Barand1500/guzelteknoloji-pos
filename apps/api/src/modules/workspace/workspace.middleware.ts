import type { RequestHandler } from 'express';
import type { WorkspaceResource, PermissionAction } from '@gt/shared';
import type { PrismaClient } from '../../lib/prisma';
import type { Logger } from '../../lib/logger';
import type { Env } from '../../config/env';
import type { AuthService } from '../auth/auth.service';
import { readSessionToken } from '../auth/auth.cookies';
import { HttpError } from '../../lib/http-error';
import { WorkspaceAccess, hasPermission, type AccessContext } from './workspace.access';

export function requestPermission(
  path: string,
  method: string,
  body?: unknown,
): { resource: WorkspaceResource; action: PermissionAction } | null {
  const section = path.split('/')[2];
  const resource = (
    {
      stok: 'products',
      markalar: 'brands',
      kategoriler: 'categories',
      katalog: 'categories',
      ozellikler: 'attributes',
      firsatlar: 'deals',
    } as const
  )[section as 'stok'];
  if (!resource) return null;
  const bulkDelete = body && typeof body === 'object' && 'islem' in body && body.islem === 'sil';
  return {
    resource,
    action:
      method === 'GET' ? 'read' : /\/(sil|kaldir)$/.test(path) || bulkDelete ? 'delete' : 'save',
  };
}

export function workspaceMiddleware(
  db: PrismaClient,
  env: Env,
  auth: AuthService,
  logger: Logger,
): RequestHandler {
  const access = new WorkspaceAccess(db);
  return async (req, res, next) => {
    const path = req.path;
    const permission = requestPermission(path, req.method, req.body);
    const account = path.startsWith('/api/hesap');
    const logout = path === '/api/auth/logout';
    // Siparişler, anasayfa ve müşteriler yalnızca oturum ister; ayrı bir bölüm yetkisi yoktur.
    const sessionOnly =
      path.startsWith('/api/siparisler') ||
      path.startsWith('/api/anasayfa') ||
      path.startsWith('/api/musteriler');
    if (!permission && !account && !logout && !sessionOnly) return next();
    const token = readSessionToken(req, env);
    const session = token ? await auth.getSession(token) : null;
    if (!session) {
      if (logout) return next();
      throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
    }
    let ctx: AccessContext;
    try {
      ctx = await access.resolve(session.user);
    } catch (error) {
      if (logout) return next();
      throw error;
    }
    res.locals.workspace = ctx;
    res.locals.actorUser = session.user;
    res.locals.actorSessionId = Number(session.session.id);
    const denied = permission && !hasPermission(ctx, permission.resource, permission.action);
    // Okuma istekleri logları şişirmez; yetkisiz denemeler ve tüm yazma işlemleri kayıt altındadır.
    if (req.method !== 'GET' || denied) {
      const section =
        permission?.resource ??
        (path.includes('/kullanicilar')
          ? 'users'
          : path.includes('/roller')
            ? 'roles'
            : path.includes('/ayarlar') || path.includes('/google')
              ? 'settings'
              : path.startsWith('/api/siparisler') || path.startsWith('/api/anasayfa')
                ? 'orders'
                : path.startsWith('/api/musteriler')
                  ? 'customers'
                  : 'profile');
      const action = logout
        ? 'Çıkış Yap'
        : permission?.action === 'delete' || path.endsWith('/sil')
          ? 'Sil'
          : path.includes('/durum')
            ? 'Durum Değiştir'
            : path.endsWith('/giris')
              ? 'Giriş Aç/Kapat'
              : path.includes('/adresler')
                ? 'Adres Kaydet'
                : path.endsWith('/cikar')
                  ? 'Ürün Çıkar'
                  : path.endsWith('/ata')
                    ? 'Ürün Ata'
                    : path.includes('sirala')
                      ? 'Sırala'
                      : 'Kaydet';
      const target =
        path
          .split('/')
          .filter((p) => /^[1-9]\d{0,9}$/.test(p) && Number(p) <= 2147483647)
          .join('/')
          .slice(0, 200) || null;
      const entry = await db.islemKaydi.create({
        data: {
          businessId: ctx.business.id,
          userId: ctx.user.id,
          userName: ctx.user.name ?? ctx.user.email ?? 'Kullanıcı',
          section,
          action,
          target,
          status: denied ? 'Reddedildi' : 'İşleniyor',
        },
      });
      res.locals.auditChanges = [];
      const batchIds =
        !denied && permission?.resource === 'products' && Array.isArray(req.body?.ids)
          ? (req.body.ids
              .filter(
                (v: unknown) =>
                  typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 2147483647,
              )
              .slice(0, 1000) as number[])
          : !denied && permission?.resource === 'products' && Array.isArray(req.body?.entries)
            ? req.body.entries
                .map((v: { productId?: unknown }) => Number(v?.productId))
                .filter((v: number) => Number.isInteger(v) && v > 0 && v <= 2147483647)
                .slice(0, 300)
            : [];
      const batchBefore = batchIds.length
        ? await db.stokKarti.findMany({
            where: { kullaniciKimligi: ctx.ownerId, kimlik: { in: batchIds } },
            select: {
              kimlik: true,
              stokKodu: true,
              envanterTakibi: true,
              satisAcik: true,
              gorseller: { select: { dosyaAdi: true, sira: true }, orderBy: { sira: 'asc' } },
            },
          })
        : [];
      const before =
        !denied && !path.endsWith('/degerler') && target && permission
          ? await snapshot(db, ctx, permission.resource, Number(target.split('/')[0]), path)
          : {};
      let responseId: number | null = null;
      const originalJson = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (body && typeof body === 'object' && 'id' in body && /^\d+$/.test(String(body.id)))
          responseId = Number(body.id);
        return originalJson(body);
      }) as typeof res.json;
      let completed = false;
      const complete = (aborted: boolean) => {
        if (completed) return;
        completed = true;
        void (async () => {
          const success = !aborted && res.statusCode < 400;
          const id = path.endsWith('/degerler')
            ? responseId
            : target
              ? Number(target.split('/')[0])
              : responseId;
          const after =
            success && permission && id
              ? await snapshot(db, ctx, permission.resource, id, path)
              : {};
          if (success && batchIds.length) {
            const current = await db.stokKarti.findMany({
              where: { kullaniciKimligi: ctx.ownerId, kimlik: { in: batchIds } },
              select: {
                kimlik: true,
                envanterTakibi: true,
                satisAcik: true,
                gorseller: { select: { dosyaAdi: true, sira: true }, orderBy: { sira: 'asc' } },
              },
            });
            for (const old of batchBefore) {
              const now = current.find((r) => r.kimlik === old.kimlik);
              const field = `Ürün #${old.kimlik}${old.stokKodu ? ' / ' + old.stokKodu : ''}`.slice(
                0,
                150,
              );
              const beforeValue =
                req.body?.islem === 'sil'
                  ? 'Kayıtlı'
                  : req.body?.islem?.startsWith('stok_')
                    ? old.envanterTakibi
                    : req.body?.islem?.startsWith('satis_')
                      ? String(old.satisAcik)
                      : old.gorseller.map((g) => g.dosyaAdi).join('\n');
              const afterValue = !now
                ? null
                : req.body?.islem?.startsWith('stok_')
                  ? now.envanterTakibi
                  : req.body?.islem?.startsWith('satis_')
                    ? String(now.satisAcik)
                    : now.gorseller.map((g) => g.dosyaAdi).join('\n');
              if (beforeValue !== afterValue)
                res.locals.auditChanges.push({ field, before: beforeValue, after: afterValue });
            }
          }
          const keys = success
            ? new Set([...Object.keys(before), ...Object.keys(after)])
            : new Set<string>();
          await db.islemKaydi.update({
            where: { id: entry.id },
            data: {
              status: aborted ? 'Tamamlanmadı' : success ? 'Başarılı' : 'Reddedildi',
              ...(id ? { target: String(id) } : {}),
              changes: {
                create: [
                  ...[...keys]
                    .filter((key) => before[key] !== after[key])
                    .slice(0, 200)
                    .map((field) => ({
                      field,
                      before: before[field] ?? null,
                      after: after[field] ?? null,
                    })),
                  ...(success
                    ? (res.locals.auditChanges as {
                        field: string;
                        before: string | null;
                        after: string | null;
                      }[])
                    : []),
                ],
              },
            },
          });
        })().catch(() => logger.error({ logId: entry.id }, 'İşlem kaydının sonucu güncellenemedi'));
      };
      res.once('finish', () => complete(false));
      res.once('close', () => complete(!res.writableFinished));
    }
    if (denied) throw new HttpError(403, 'FORBIDDEN', 'Bu işlem için yetkiniz yok.');
    next();
  };
}

async function snapshot(
  db: PrismaClient,
  ctx: AccessContext,
  resource: WorkspaceResource,
  id: number,
  path: string,
) {
  let row: unknown;
  if (resource === 'products')
    row = await db.stokKarti.findFirst({
      where: { kimlik: id, kullaniciKimligi: ctx.ownerId },
      include: {
        birimler: { include: { fiyatlar: true, barkodlar: true } },
        kategoriler: true,
        firsatlar: true,
        ozellikDegerleri: true,
        vergiler: true,
        varyantlar: true,
        gorseller: true,
      },
    });
  if (resource === 'brands')
    row = await db.marka.findFirst({
      where: { kimlik: id, kullaniciKimligi: ctx.ownerId },
      include: { stokKartlari: { select: { kimlik: true } } },
    });
  if (resource === 'categories')
    row = await db.kategori.findFirst({
      where: { id, kullaniciId: ctx.ownerId },
      include: { stokKartlari: true },
    });
  if (resource === 'deals')
    row = await db.firsat.findFirst({
      where: { id, kullaniciId: ctx.ownerId },
      include: { stokKartlari: true },
    });
  if (resource === 'attributes') {
    if (path.includes('/sablonlar'))
      row = await db.ozellikSablonu.findFirst({
        where: { id, kullaniciId: ctx.ownerId },
        include: { kategoriler: true },
      });
    else if (path.includes('/gruplar') && !path.endsWith('/degerler'))
      row = await db.ozellikGrubu.findFirst({
        where: { id, sablon: { kullaniciId: ctx.ownerId } },
      });
    else
      row = await db.ozellikDegeri.findFirst({
        where: { id, grup: { sablon: { kullaniciId: ctx.ownerId } } },
      });
  }
  const labels: Record<string, string> = {
    stokKodu: 'Ürün Kodu',
    stokAdi: 'Ürün Adı',
    stokMiktari: 'Stok Miktarı',
    satisAcik: 'Satış Açık',
    envanterTakibi: 'Envanter Takibi',
    markaAdi: 'Marka Adı',
    aciklama: 'Açıklama',
    ad: 'Ad',
    durum: 'Aktif',
    gizli: 'Gizli',
    birimler: 'Birimler',
    fiyatlar: 'Fiyatlar',
    barkodlar: 'Barkodlar',
    girilenFiyat: 'Fiyat',
    fiyatYonu: 'Alış/Satış',
    paraBirimi: 'Para Birimi',
    iskontoOrani: 'İskonto Oranı',
    kdvOrani: 'KDV Oranı',
    kdvDahilGirildi: 'KDV Dahil',
    barkod: 'Barkod',
    carpan: 'Çarpan',
    anaBirim: 'Ana Birim',
    varsayilanBirim: 'Varsayılan Birim',
    altLimit: 'Alt Limit',
    ustLimit: 'Üst Limit',
    mensei: 'Menşei',
    kategoriler: 'Kategoriler',
    firsatlar: 'Fırsatlar',
    gorseller: 'Görseller',
    varyantlar: 'Varyantlar',
    vergiler: 'Diğer Vergiler',
    oran: 'Oran',
    miktar: 'Miktar',
    kod: 'Kod',
    stokKartlari: 'Ürünler',
    sira: 'Sıra',
  };
  const out: Record<string, string> = {};
  const walk = (value: unknown, prefix: string, depth: number) => {
    if (depth > 5 || Object.keys(out).length >= 500 || value === null || value === undefined)
      return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[prefix.slice(0, 150)] = String(value).slice(0, 2000);
      return;
    }
    if (value instanceof Date || Buffer.isBuffer(value)) return;
    if (typeof value === 'object' && 'toFixed' in value) {
      out[prefix] = String(value);
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 30).forEach((v, i) => walk(v, `${prefix}[${i + 1}]`, depth + 1));
      return;
    }
    if (typeof value === 'object')
      for (const [key, v] of Object.entries(value)) {
        if (
          /hash|ozet|secret|token|password|sifre|logoVerisi|kayitIstegi|olusturmaZamani|guncellemeZamani|kullaniciKimligi/i.test(
            key,
          )
        )
          continue;
        const label = labels[key] ?? key;
        walk(v, prefix ? `${prefix}.${label}` : label, depth + 1);
      }
  };
  walk(row, '', 0);
  return out;
}
