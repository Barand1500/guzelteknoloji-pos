import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  SETTINGS_PAGES,
  WORKSPACE_RESOURCES,
  normalizeEmail,
  type RolePermission,
  type WorkspaceResource,
} from '@gt/shared';
import type { PrismaClient } from '../../lib/prisma';
import type { Env } from '../../config/env';
import type { PasswordHasher } from '../../lib/password';
import { HttpError } from '../../lib/http-error';
import { canGrant, forbidden, requirePermission, type AccessContext } from './workspace.access';
import {
  WorkspaceSettings,
  environmentConnection,
  hasOwnConnection,
  type ConnectionSection,
} from './workspace.settings';
import { verifySmtp } from '../../lib/mailer';
import {
  testMailConnection,
  googleConnect,
  googleCallback,
  workspaceGoogleRedirect,
} from './workspace.connections';
import { Prisma } from '../../generated/prisma/client';
import { createRateLimiter } from '../../middleware/rate-limit';
import { verifyRobot, whatsappRequest } from './workspace.integrations';
import { sendNetgsmSms } from './netgsm';
import { createWorkspaceDocumentsRouter } from './workspace.documents';

const id = z.coerce.number().int().positive().max(2147483647);
const name = z.string().trim().min(1, 'Ad girin.').max(120);
const permission = z
  .strictObject({
    resource: z.custom<WorkspaceResource>((v) => WORKSPACE_RESOURCES.some((r) => r.key === v)),
    read: z.boolean(),
    save: z.boolean(),
    delete: z.boolean(),
  })
  .refine((p) => p.read || (!p.save && !p.delete), 'Kaydet/Sil için Görüntüle açık olmalı.')
  .refine(
    (p) => p.resource !== 'logs' || (!p.save && !p.delete),
    'Log kayıtları yalnızca görüntülenebilir.',
  );
const roleSchema = z
  .strictObject({ name, permissions: z.array(permission).max(WORKSPACE_RESOURCES.length) })
  .refine(
    (p) => new Set(p.permissions.map((v) => v.resource)).size === p.permissions.length,
    'Bölüm izinleri yinelenemez.',
  );
const ctxOf = (res: Response) => res.locals.workspace as AccessContext;
function note(res: Response, field: string, before: unknown, after: unknown) {
  if (String(before ?? '') !== String(after ?? ''))
    res.locals.auditChanges.push({
      field,
      before: before == null ? null : String(before),
      after: after == null ? null : String(after),
    });
}

export function createWorkspaceRouter(db: PrismaClient, env: Env, hasher: PasswordHasher) {
  const router = Router();
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 180 }));
  router.use('/belgeler', createWorkspaceDocumentsRouter(env.UPLOADS_DIR));
  const settings = new WorkspaceSettings(db, env.COOKIE_SECRET);
  const write = <T>(ctx: AccessContext, fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
    db.$transaction(async (tx) => {
      // Yetki ve üye yazmaları aynı işletmede sıralanır; işlem içindeki yetki değişiklikleri çakışmaz.
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM isletmeler WHERE id=${ctx.business.id} FOR UPDATE`,
      );
      return fn(tx);
    });
  router.get('/', async (_req, res) => {
    const ctx = ctxOf(res);
    const credentials = await db.kullanici.findUniqueOrThrow({
      where: { kimlik: ctx.user.id },
      select: { sifreHash: true },
    });
    res.json({
      hasPassword: !!credentials.sifreHash,
      business: ctx.business,
      user: ctx.user,
      owner: ctx.owner,
      permissions: ctx.permissions,
      imageAppearance: await settings.values(ctx.business.id, 'images'),
    });
  });
  router.post('/profil', async (req, res) => {
    const { name: displayName } = z.strictObject({ name }).parse(req.body);
    const ctx = ctxOf(res);
    note(res, 'Ad', ctx.user.name, displayName);
    await db.kullanici.update({ where: { kimlik: ctx.user.id }, data: { gorunenAd: displayName } });
    res.json({ name: displayName });
  });
  router.get('/sosyal-giris', (_req, res) => {
    requirePermission(ctxOf(res), 'settings', 'read');
    res.set('Cache-Control', 'no-store');
    res.json({
      google: !!env.google,
      apple: !!env.apple,
      googleRedirect:
        env.google?.redirectUri ?? new URL('/api/auth/google/callback', env.APP_URL).href,
      appleRedirect:
        env.apple?.redirectUri ?? new URL('/api/auth/apple/callback', env.APP_URL).href,
    });
  });
  router.post(
    '/profil/sifre',
    createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 900000, limit: 8 }),
    async (req, res) => {
      const input = z
        .strictObject({
          current: z.string().max(256),
          password: z.string().min(10, 'Şifre en az 10 karakter olmalı.').max(256),
        })
        .parse(req.body);
      const user = await db.kullanici.findUniqueOrThrow({ where: { kimlik: ctxOf(res).user.id } });
      if (user.sifreHash && !(await hasher.verify(user.sifreHash, input.current)))
        throw new HttpError(400, 'VALIDATION_ERROR', 'Mevcut şifreniz hatalı.');
      await db.$transaction(async (tx) => {
        await tx.kullanici.update({
          where: { kimlik: user.kimlik },
          data: {
            sifreHash: await hasher.hash(input.password),
            sifreOlusturmaTarihi: user.sifreOlusturmaTarihi ?? new Date(),
            sifreGuncellemeTarihi: new Date(),
          },
        });
        // Diğer cihazların oturumlarını kapat; mevcut oturum değişmeden kalır.
        const currentId = res.locals.actorSessionId as number | undefined;
        await tx.oturum.updateMany({
          where: {
            kullaniciKimligi: user.kimlik,
            ...(currentId ? { kimlik: { not: currentId } } : {}),
          },
          data: { iptalTarihi: new Date() },
        });
      });
      note(res, 'Şifre', 'Mevcut', 'Değiştirildi');
      res.status(204).end();
    },
  );
  router.get('/roller', async (_req, res) => {
    const ctx = ctxOf(res);
    if (
      !ctx.owner &&
      !ctx.permissions.some(
        (p) => (p.resource === 'roles' && p.read) || (p.resource === 'users' && p.save),
      )
    )
      throw forbidden();
    const roles = await db.isletmeRolu.findMany({
      where: { businessId: ctx.business.id },
      include: { permissions: true, _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(
      roles.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions,
        users: r._count.members,
      })),
    );
  });
  for (const path of ['/roller', '/roller/:id'])
    router.post(path, async (req, res) => {
      const ctx = ctxOf(res);
      requirePermission(ctx, 'roles', 'save');
      const input = roleSchema.parse(req.body);
      if (!canGrant(ctx, input.permissions))
        throw new HttpError(
          403,
          'FORBIDDEN',
          'Sahip olmadığınız bir yetkiyi başka bir role veremezsiniz.',
        );
      const roleId = req.params.id ? id.parse(req.params.id) : null;
      const saved = await write(ctx, async (tx) => {
        const old = roleId
          ? await tx.isletmeRolu.findFirst({
              where: { id: roleId, businessId: ctx.business.id },
              include: { permissions: true, members: true },
            })
          : null;
        if (roleId && !old) throw new HttpError(404, 'NOT_FOUND', 'Rol bulunamadı.');
        if (old && !canGrant(ctx, old.permissions as RolePermission[])) throw forbidden();
        if (old?.members.some((m) => m.userId === ctx.user.id))
          throw new HttpError(
            409,
            'CONFLICT',
            'Kendi rolünüzün yetkilerini değiştiremezsiniz. İşletme sahibinden yardım isteyin.',
          );
        if (
          await tx.isletmeRolu.findFirst({
            where: {
              businessId: ctx.business.id,
              name: input.name,
              ...(roleId ? { id: { not: roleId } } : {}),
            },
          })
        )
          throw new HttpError(409, 'CONFLICT', 'Bu isimde bir rol zaten var.');
        note(res, 'Rol Adı', old?.name, input.name);
        for (const p of input.permissions)
          for (const a of ['read', 'save', 'delete'] as const)
            note(
              res,
              `${WORKSPACE_RESOURCES.find((r) => r.key === p.resource)?.label} / ${{ read: 'Görüntüle', save: 'Kaydet', delete: 'Sil' }[a]}`,
              old?.permissions.find((o) => o.resource === p.resource)?.[a] ?? false,
              p[a],
            );
        if (old) await tx.rolYetkisi.deleteMany({ where: { roleId: old.id } });
        return old
          ? tx.isletmeRolu.update({
              where: { id: old.id },
              data: { name: input.name, permissions: { create: input.permissions } },
            })
          : tx.isletmeRolu.create({
              data: {
                businessId: ctx.business.id,
                name: input.name,
                permissions: { create: input.permissions },
              },
            });
      });
      res.json({ id: saved.id });
    });
  router.post('/roller/:id/sil', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'roles', 'delete');
    await write(ctx, async (tx) => {
      const role = await tx.isletmeRolu.findFirst({
        where: { id: id.parse(req.params.id), businessId: ctx.business.id },
        include: { permissions: true, _count: { select: { members: true } } },
      });
      if (!role) throw new HttpError(404, 'NOT_FOUND', 'Rol bulunamadı.');
      if (!canGrant(ctx, role.permissions as RolePermission[])) throw forbidden();
      if (role._count.members)
        throw new HttpError(
          409,
          'CONFLICT',
          'Bu rol kullanıcılara atanmış. Önce kullanıcıların rolünü değiştirin.',
        );
      await tx.isletmeRolu.delete({ where: { id: role.id } });
      note(res, 'Rol', role.name, null);
    });
    res.status(204).end();
  });
  router.get('/kullanicilar', async (_req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'users', 'read');
    const rows = await db.isletmeUyesi.findMany({
      where: { businessId: ctx.business.id },
      include: { role: true, user: true },
      orderBy: { id: 'asc' },
    });
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.user?.gorunenAd ?? r.name,
        email: r.email ?? '',
        roleId: r.roleId,
        roleName: r.userId === ctx.ownerId ? 'İşletme Sahibi' : (r.role?.name ?? 'Rol Atanmadı'),
        owner: r.userId === ctx.ownerId,
        active: r.durum,
        pending: r.userId === null,
      })),
    );
  });
  const memberSchema = z.strictObject({
    name,
    email: z.email().max(254).transform(normalizeEmail),
    roleId: id,
    active: z.boolean().default(true),
  });
  router.post('/kullanicilar', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'users', 'save');
    const input = memberSchema.parse(req.body);
    const saved = await write(ctx, async (tx) => {
      const role = await tx.isletmeRolu.findFirst({
        where: { id: input.roleId, businessId: ctx.business.id },
        include: { permissions: true },
      });
      if (!role) throw new HttpError(404, 'NOT_FOUND', 'Rol bulunamadı.');
      if (!canGrant(ctx, role.permissions as RolePermission[])) throw forbidden();
      if (await tx.isletmeUyesi.findUnique({ where: { email: input.email } }))
        throw new HttpError(409, 'CONFLICT', 'Bu e-posta zaten bir işletmeye bağlı veya eklenmiş.');
      const existing = await tx.kullanici.findUnique({ where: { eposta: input.email } });
      if (existing && (await tx.isletmeUyesi.findUnique({ where: { userId: existing.kimlik } })))
        throw new HttpError(409, 'CONFLICT', 'Bu kullanıcı başka bir işletmeye bağlı.');
      const row = await tx.isletmeUyesi.create({
        data: {
          businessId: ctx.business.id,
          name: input.name,
          email: input.email,
          roleId: input.roleId,
          durum: input.active,
        },
      });
      note(res, 'Kullanıcı', null, input.name);
      note(res, 'E-posta', null, input.email);
      note(res, 'Rol', null, role.name);
      return row;
    });
    res.status(201).json({ id: saved.id });
  });
  router.post('/kullanicilar/:id', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'users', 'save');
    const input = memberSchema.omit({ email: true }).parse(req.body);
    await write(ctx, async (tx) => {
      const member = await tx.isletmeUyesi.findFirst({
        where: { id: id.parse(req.params.id), businessId: ctx.business.id },
        include: { role: { include: { permissions: true } } },
      });
      if (!member) throw new HttpError(404, 'NOT_FOUND', 'Kullanıcı bulunamadı.');
      if (member.userId === ctx.ownerId || member.userId === ctx.user.id)
        throw new HttpError(
          409,
          'CONFLICT',
          'İşletme sahibini veya kendi erişiminizi bu ekrandan değiştiremezsiniz.',
        );
      const role = await tx.isletmeRolu.findFirst({
        where: { id: input.roleId, businessId: ctx.business.id },
        include: { permissions: true },
      });
      if (!role) throw new HttpError(404, 'NOT_FOUND', 'Rol bulunamadı.');
      if (
        !canGrant(ctx, role.permissions as RolePermission[]) ||
        (member.role && !canGrant(ctx, member.role.permissions as RolePermission[]))
      )
        throw forbidden();
      if (member.durum && !input.active) requirePermission(ctx, 'users', 'delete');
      await tx.isletmeUyesi.update({
        where: { id: member.id },
        data: { name: input.name, roleId: input.roleId, durum: input.active },
      });
      note(res, 'Ad', member.name, input.name);
      note(res, 'Rol', member.role?.name, role.name);
      note(res, 'Erişim', member.durum, input.active);
    });
    res.status(204).end();
  });
  router.post('/kullanicilar/:id/sil', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'users', 'delete');
    await write(ctx, async (tx) => {
      const member = await tx.isletmeUyesi.findFirst({
        where: { id: id.parse(req.params.id), businessId: ctx.business.id },
        include: { role: { include: { permissions: true } } },
      });
      if (!member) throw new HttpError(404, 'NOT_FOUND', 'Kullanıcı bulunamadı.');
      if (member.userId === ctx.ownerId || member.userId === ctx.user.id)
        throw new HttpError(409, 'CONFLICT', 'İşletme sahibi veya kendi üyeliğiniz silinemez.');
      if (member.role && !canGrant(ctx, member.role.permissions as RolePermission[]))
        throw forbidden();
      // Katılmış üyelerin kimlik bağlantısını koru; erişim kapatılır. Bekleyen ekleme kaldırılabilir.
      if (member.userId)
        await tx.isletmeUyesi.update({ where: { id: member.id }, data: { durum: false } });
      else await tx.isletmeUyesi.delete({ where: { id: member.id } });
      note(res, 'Kullanıcı Erişimi', member.name, 'Kaldırıldı');
    });
    res.status(204).end();
  });
  const page = (value: unknown) =>
    z
      .enum([
        'general',
        'images',
        'smtp',
        'imap',
        'google',
        'cloudflare',
        'recaptcha',
        'whatsapp',
        'sms',
        'site_system',
        'site_menu',
        'site_header',
        'site_defaults',
        'site_appearance',
        'site_erp',
        'site_xml',
        'site_iletisim',
        'site_sms_sablonlari',
        'site_eposta_sablonlari',
      ])
      .parse(value);
  router.get('/ayarlar/:section', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'settings', 'read');
    const result = await settings.read(ctx.business.id, page(req.params.section));
    const section = page(req.params.section);
    const connection = ['smtp', 'imap', 'google'].includes(section)
      ? (section as ConnectionSection)
      : null;
    const own =
      connection &&
      (hasOwnConnection(connection, {
        ...result.values,
        ...Object.fromEntries(result.configured.map((key) => [key, 'configured'])),
      }) ||
        result.values.enabled !== undefined);
    const source = connection
      ? own
        ? 'database'
        : Object.keys(environmentConnection(env, connection)).length
          ? 'environment'
          : 'unconfigured'
      : undefined;
    res.json({
      ...result,
      ...(section === 'site_xml'
        ? { feedUrl: new URL(`/api/site-feed/${ctx.business.id}/google.xml`, env.APP_URL).href }
        : {}),
      ...(section === 'whatsapp'
        ? { webhookUrl: new URL(`/api/webhooks/whatsapp/${ctx.business.id}`, env.APP_URL).href }
        : {}),
      source,
      system: { smtp: !!env.smtp, google: !!env.google },
      googleRedirect: workspaceGoogleRedirect(
        env,
        own ? result.values.clientId : env.google?.clientId,
      ),
    });
  });
  router.post('/ayarlar/:section', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'settings', 'save');
    const section = page(req.params.section);
    if (Array.isArray(req.body?.clear) && req.body.clear.length)
      requirePermission(ctx, 'settings', 'delete');
    const before = await settings.read(ctx.business.id, section);
    const after = await settings.save(ctx.business.id, section, req.body);
    for (const field of SETTINGS_PAGES.find((p) => p.key === section)!.fields) {
      if ('type' in field && field.type === 'secret') {
        if (req.body.values?.[field.key])
          note(
            res,
            field.label,
            before.configured.includes(field.key) ? 'Tanımlı' : null,
            'Güncellendi',
          );
        else
          note(
            res,
            field.label,
            before.configured.includes(field.key) ? 'Tanımlı' : null,
            after.configured.includes(field.key) ? 'Tanımlı' : null,
          );
      } else note(res, field.label, before.values[field.key], after.values[field.key]);
    }
    res.json(after);
  });
  router.post('/ayarlar/:section/test', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'settings', 'save');
    const section = z
      .enum(['smtp', 'imap', 'cloudflare', 'recaptcha', 'whatsapp', 'sms'])
      .parse(req.params.section);
    if (section === 'cloudflare' || section === 'recaptcha') {
      await verifyRobot(
        section,
        await settings.values(ctx.business.id, section, true),
        req.body?.challengeToken,
        new URL(env.APP_URL).hostname,
        req.ip,
      );
      return res.json({ message: 'Robot doğrulaması sunucuda başarıyla doğrulandı.' });
    }
    if (section === 'sms') {
      const values = await settings.values(ctx.business.id, 'sms', true);
      const requested = typeof req.body?.number === 'string' ? req.body.number.trim() : '';
      const target = requested || (values.testNumber ?? '').trim();
      if (!target)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Test için bir telefon numarası girin.');
      // Gönderici: onaylı başlık yoksa Netgsm sanal numarası başlık olarak kullanılır.
      const sender = values.sender?.trim() || values.sanalNumara?.trim() || '';
      if (!values.username?.trim() || !values.password || !sender)
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          'Önce kullanıcı adı, şifre ve gönderici başlığı (ya da sanal numara) kaydedin.',
        );
      const sent = await sendNetgsmSms(
        {
          apiUrl: values.apiUrl ?? '',
          username: values.username.trim(),
          password: values.password,
          sender,
        },
        target,
        'Güzel Teknoloji: SMS ayarları test mesajı.',
      );
      note(res, 'SMS Bağlantısı', null, 'Test gönderildi');
      return res.json({ message: `Test SMS ${sent.number} numarasına gönderildi.` });
    }
    if (section === 'whatsapp') {
      const result = await whatsappRequest(await settings.values(ctx.business.id, section, true));
      note(res, 'WhatsApp Bağlantısı', null, 'Doğrulandı');
      return res.json({
        message: 'Meta WhatsApp bağlantısı doğrulandı. Mesaj gönderilmedi.',
        phone: result.display_phone_number,
        name: result.verified_name,
      });
    }
    const connection = await settings.effective(ctx.business.id, section, env);
    if (section === 'smtp' && connection.source === 'environment') await verifySmtp(env);
    else await testMailConnection(section, connection.values);
    res.json({ message: 'Bağlantı ve kimlik doğrulama başarılı.' });
  });
  router.post('/ayarlar/:section/gizli/:key', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'settings', 'save');
    const section = page(req.params.section);
    const key = z
      .enum(['password', 'clientSecret', 'secretKey', 'accessToken', 'verifyToken', 'appSecret'])
      .parse(req.params.key);
    if (!SETTINGS_PAGES.find((p) => p.key === section)!.fields.some((f) => f.key === key))
      throw new HttpError(400, 'VALIDATION_ERROR', 'Bu bölümde böyle bir gizli alan yok.');
    const values = await settings.values(ctx.business.id, section, true);
    note(res, 'Gizli Ayar', null, 'Görüntülendi');
    res.setHeader('Cache-Control', 'no-store');
    res.json({ value: values[key] ?? '' });
  });
  router.post('/google/baglan', async (_req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'settings', 'save');
    res.json({ url: await googleConnect(settings, ctx, env, res) });
  });
  router.post(
    '/ayarlar/whatsapp/mesaj',
    createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 5 }),
    async (req, res) => {
      const ctx = ctxOf(res);
      requirePermission(ctx, 'settings', 'save');
      const message = z
        .strictObject({
          to: z
            .string()
            .trim()
            .regex(
              /^\+?[1-9]\d{7,14}$/,
              'Telefon numarasını ülke koduyla girin. Örnek: +905xxxxxxxxx.',
            ),
          text: z.string().trim().min(1).max(4096),
        })
        .parse(req.body);
      await whatsappRequest(await settings.values(ctx.business.id, 'whatsapp', true), message);
      note(res, 'WhatsApp Mesajı', null, 'Meta tarafından kabul edildi');
      res.json({
        message:
          'Mesaj Meta tarafından kabul edildi. Teslimat, alıcıya ve Meta kurallarına bağlıdır.',
      });
    },
  );
  router.get('/google/callback', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'settings', 'save');
    await googleCallback(settings, db, ctx, env, req, res);
  });
  router.post('/google/ayir', async (_req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'settings', 'delete');
    await settings.remove(ctx.business.id, 'google', ['refreshToken', 'accessToken', 'expiresAt']);
    note(res, 'Google Bağlantısı', 'Bağlı', 'Ayrıldı');
    res.status(204).end();
  });
  router.get('/loglar', async (req, res) => {
    const ctx = ctxOf(res);
    requirePermission(ctx, 'logs', 'read');
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        user: z.string().max(254).default(''),
        section: z.string().max(30).default(''),
        action: z.string().max(80).default(''),
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(req.query);
    const from = q.from ? new Date(q.from + 'T00:00:00Z') : undefined;
    const to = q.to ? new Date(q.to + 'T23:59:59.999Z') : undefined;
    if (
      (from && !Number.isFinite(+from)) ||
      (to && !Number.isFinite(+to)) ||
      (from && to && from > to)
    )
      throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir tarih aralığı seçin.');
    const where = {
      businessId: ctx.business.id,
      ...(q.user ? { userName: { contains: q.user } } : {}),
      ...(q.section ? { section: q.section } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(from || to ? { olusturmaTarihi: { gte: from, lte: to } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.islemLogu.count({ where }),
      db.islemLogu.findMany({
        where,
        orderBy: [{ olusturmaTarihi: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * 30,
        take: 30,
        include: { changes: true },
      }),
    ]);
    res.json({
      total,
      items: rows.map((r) => ({
        id: r.id,
        user: r.userName,
        section: r.section,
        action: r.action,
        target: r.target,
        time: r.olusturmaTarihi.toISOString(),
        status: r.status,
        changes: r.changes.map((c) => ({ field: c.field, before: c.before, after: c.after })),
      })),
    });
  });
  return router;
}
