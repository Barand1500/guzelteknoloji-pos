import { Router } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { createRateLimiter } from '../../middleware/rate-limit';
import { readSessionToken } from '../auth/auth.cookies';
import type { AuthService } from '../auth/auth.service';
import { logoMime } from '../brands/brand-logo.storage';
import { CategoryRepository } from './category.repository';
import { categoryDraftSchema, categoryIds, categoryKey } from './category.schemas';

export function createCatalogRouter(env: Env, auth: AuthService, db: PrismaClient) {
  const router = Router();
  const repo = new CategoryRepository(db, env.UPLOADS_DIR);
  router.use(async (req, res, next) => {
    const token = readSessionToken(req, env);
    const session = token ? await auth.getSession(token) : null;
    if (!session) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
    res.locals.catalogUserId = Number(res.locals.workspace?.ownerId ?? session.user.id);
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 300 }));
  router.get('/', async (_req, res) =>
    res.json(await repo.list(res.locals.catalogUserId as number)),
  );
  router.get('/urunler', async (_req, res) =>
    res.json(await repo.listProducts(res.locals.catalogUserId as number)),
  );
  router.post('/', async (req, res) =>
    res
      .status(201)
      .json(
        await repo.save(res.locals.catalogUserId as number, categoryDraftSchema.parse(req.body)),
      ),
  );
  router.post('/sirala', async (req, res) => {
    const data = z
      .strictObject({ parentId: categoryKey.nullable(), ids: categoryIds })
      .parse(req.body);
    await repo.reorder(res.locals.catalogUserId as number, data.parentId, data.ids);
    res.status(204).end();
  });
  router.get('/:id/gorsel', async (req, res) => {
    const image = await repo.image(
      res.locals.catalogUserId as number,
      categoryKey.parse(req.params.id),
    );
    if (image.format === 'svg') res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.type(logoMime(image.format)).send(image.data);
  });
  router.post('/:id', async (req, res) =>
    res.json(
      await repo.save(
        res.locals.catalogUserId as number,
        categoryDraftSchema.parse(req.body),
        categoryKey.parse(req.params.id),
      ),
    ),
  );
  router.post('/:id/tasi', async (req, res) => {
    const { parentId } = z.strictObject({ parentId: categoryKey.nullable() }).parse(req.body);
    await repo.move(res.locals.catalogUserId as number, categoryKey.parse(req.params.id), parentId);
    res.status(204).end();
  });
  router.post('/:id/birlestir', async (req, res) => {
    const { targetId } = z.strictObject({ targetId: categoryKey }).parse(req.body);
    await repo.merge(
      res.locals.catalogUserId as number,
      categoryKey.parse(req.params.id),
      targetId,
    );
    res.status(204).end();
  });
  router.post('/:id/aktiflik', async (req, res) => {
    const { active } = z.strictObject({ active: z.boolean() }).parse(req.body);
    await repo.setActive(
      res.locals.catalogUserId as number,
      categoryKey.parse(req.params.id),
      active,
    );
    res.status(204).end();
  });
  router.post('/:id/sil', async (req, res) => {
    await repo.remove(res.locals.catalogUserId as number, categoryKey.parse(req.params.id));
    res.status(204).end();
  });
  for (const [path, remove] of [
    ['ata', false],
    ['cikar', true],
  ] as const)
    router.post('/:id/urunler/' + path, async (req, res) => {
      const { productIds } = z.strictObject({ productIds: categoryIds }).parse(req.body);
      await repo.assign(
        res.locals.catalogUserId as number,
        categoryKey.parse(req.params.id),
        productIds,
        remove,
      );
      res.status(204).end();
    });
  return router;
}
