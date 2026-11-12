import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  menuEntryDraftSchema,
  siteImageUploadSchema,
  type SiteImageKind,
  sitePageDraftSchema,
  siteReorderSchema,
  sliderDraftSchema,
  templateVariableDraftSchema,
  widgetDraftSchema,
} from '@gt/shared';
import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import type { PrismaClient } from '../../lib/prisma';
import { createRateLimiter } from '../../middleware/rate-limit';
import { BrandLogoStorage, logoMime } from '../brands/brand-logo.storage';
import { prepareBrandLogo } from '../brands/brand.repository';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { SiteRepository } from './site.repository';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      result.error.issues[0]?.message ?? 'Bilgileri kontrol edin.',
    );
  return result.data;
}

function context(res: Response): AccessContext {
  const value = res.locals.workspace as AccessContext | undefined;
  if (!value) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
  return value;
}

const idSchema = z.string().regex(/^\d+$/, 'Geçersiz kayıt kimliği.');
const idOf = (raw: string) => Number(parse(idSchema, raw));

/** E-ticaret site içeriği: sayfa, menü, slider, widget, şablon değişkeni ve görseller. */
export function createSiteRouter(db: PrismaClient, env: Env) {
  const repo = new SiteRepository(db);
  const storage = new BrandLogoStorage(env.UPLOADS_DIR, 'site');
  const router = Router();
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 180 }));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // ── Görseller ─────────────────────────────────────────────────────────────
  router.post('/gorseller', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const body = parse(siteImageUploadSchema, req.body);
    const image = await prepareBrandLogo(body.dataUrl);
    if (!image) throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir görsel seçin.');
    const file = await storage.write(image.data, image.format);
    const hash = createHash('sha256').update(image.data).digest('hex');
    const row = await db.siteGorseli.create({
      data: {
        isletmeId: ctx.business.id,
        tur: body.kind,
        dosyaAdi: file,
        hash,
        mime: logoMime(image.format),
        boyut: image.data.length,
      },
    });
    res.status(201).json({
      id: String(row.id),
      kind: row.tur as SiteImageKind,
      url: `/api/site/gorseller/${row.id}`,
    });
  });

  router.get('/gorseller/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    const id = idOf(req.params.id!);
    const row = await db.siteGorseli.findFirst({ where: { id, isletmeId: ctx.business.id } });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Görsel bulunamadı.');
    const image = await storage.read(row.dosyaAdi);
    res.set('Cache-Control', 'private, max-age=86400');
    res.type(row.mime).send(image.data);
  });

  /** Site köküne konacak doğrulama dosyası (HTML/TXT/XML, en çok 1 MB). */
  router.post('/kok-dosya', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    const body = parse(
      z.strictObject({
        name: z.string().trim().min(1).max(160),
        dataUrl: z.string().min(30).max(2_000_000),
      }),
      req.body,
    );
    const clean = path.basename(body.name).replace(/[^\w.\- ]/g, '_');
    if (!/\.(html?|txt|xml)$/i.test(clean))
      throw new HttpError(400, 'VALIDATION_ERROR', 'Yalnızca HTML, TXT veya XML dosyası yükleyin.');
    const match = /^data:[^;]+;base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl);
    if (!match) throw new HttpError(400, 'VALIDATION_ERROR', 'Dosya okunamadı.');
    const data = Buffer.from(match[1]!, 'base64');
    if (data.length > 1024 * 1024)
      throw new HttpError(400, 'VALIDATION_ERROR', 'Dosya en çok 1 MB olabilir.');
    const directory = path.resolve(env.UPLOADS_DIR, 'site-kok', String(ctx.business.id));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, clean), data, { mode: 0o600 });
    res.status(201).json({ name: clean });
  });
  // ── Sayfalar ──────────────────────────────────────────────────────────────
  router.get('/sayfalar', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.pages(ctx.business.id));
  });
  /** Sürükle-bırak sonrası toplu sıra. `/sayfalar/:id`'den ÖNCE tanımlı olmalı. */
  router.post('/sayfalar/sirala', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    await repo.reorderPages(ctx.business.id, parse(siteReorderSchema, req.body).ids);
    res.status(204).end();
  });
  router.post('/sayfalar', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res
      .status(201)
      .json(await repo.savePage(ctx.business.id, parse(sitePageDraftSchema, req.body)));
  });
  router.post('/sayfalar/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.json(
      await repo.savePage(
        ctx.business.id,
        parse(sitePageDraftSchema, req.body),
        idOf(req.params.id!),
      ),
    );
  });
  router.post('/sayfalar/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removePage(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  // ── Menü ──────────────────────────────────────────────────────────────────
  router.get('/menu', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.menu(ctx.business.id));
  });
  router.post('/menu/sirala', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    await repo.reorderMenu(ctx.business.id, parse(siteReorderSchema, req.body).ids);
    res.status(204).end();
  });
  router.post('/menu', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res
      .status(201)
      .json(await repo.saveMenu(ctx.business.id, parse(menuEntryDraftSchema, req.body)));
  });
  router.post('/menu/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.json(
      await repo.saveMenu(
        ctx.business.id,
        parse(menuEntryDraftSchema, req.body),
        idOf(req.params.id!),
      ),
    );
  });
  router.post('/menu/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeMenu(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  // ── Sliderlar ─────────────────────────────────────────────────────────────
  router.get('/sliderlar', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.sliders(ctx.business.id));
  });
  router.post('/sliderlar/sirala', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    await repo.reorderSliders(ctx.business.id, parse(siteReorderSchema, req.body).ids);
    res.status(204).end();
  });
  router.post('/sliderlar', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res
      .status(201)
      .json(await repo.saveSlider(ctx.business.id, parse(sliderDraftSchema, req.body)));
  });
  router.post('/sliderlar/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.json(
      await repo.saveSlider(
        ctx.business.id,
        parse(sliderDraftSchema, req.body),
        idOf(req.params.id!),
      ),
    );
  });
  router.post('/sliderlar/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeSlider(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  // ── Widgetlar ─────────────────────────────────────────────────────────────
  router.get('/widgetlar', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.widgets(ctx.business.id));
  });
  router.post('/widgetlar/sirala', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    await repo.reorderWidgets(ctx.business.id, parse(siteReorderSchema, req.body).ids);
    res.status(204).end();
  });
  router.post('/widgetlar', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res
      .status(201)
      .json(await repo.saveWidget(ctx.business.id, parse(widgetDraftSchema, req.body)));
  });
  router.post('/widgetlar/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.json(
      await repo.saveWidget(
        ctx.business.id,
        parse(widgetDraftSchema, req.body),
        idOf(req.params.id!),
      ),
    );
  });
  router.post('/widgetlar/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeWidget(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  // ── Şablon değişkenleri ───────────────────────────────────────────────────
  router.get('/sablon-degiskenleri', async (_req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'read');
    res.json(await repo.variables(ctx.business.id));
  });
  router.post('/sablon-degiskenleri', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res
      .status(201)
      .json(await repo.saveVariable(ctx.business.id, parse(templateVariableDraftSchema, req.body)));
  });
  router.post('/sablon-degiskenleri/:id', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'save');
    res.json(
      await repo.saveVariable(
        ctx.business.id,
        parse(templateVariableDraftSchema, req.body),
        idOf(req.params.id!),
      ),
    );
  });
  router.post('/sablon-degiskenleri/:id/sil', async (req, res) => {
    const ctx = context(res);
    requirePermission(ctx, 'settings', 'delete');
    await repo.removeVariable(ctx.business.id, idOf(req.params.id!));
    res.status(204).end();
  });

  return router;
}
