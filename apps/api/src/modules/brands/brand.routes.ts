import {
  brandDraftSchema,
  brandKeySchema,
  brandProductsSchema,
  reorderBrandsSchema,
} from '@gt/shared';
import { Router } from 'express';
import { z } from 'zod';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import { createRateLimiter } from '../../middleware/rate-limit';
import { readSessionToken } from '../auth/auth.cookies';
import type { AuthService } from '../auth/auth.service';
import type { PrismaBrandRepository } from './brand.repository';
import { logoMime } from './brand-logo.storage';

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
export function createBrandRouter(env: Env, service: AuthService, repo: PrismaBrandRepository) {
  const router = Router();
  router.use(async (req, res, next) => {
    const token = readSessionToken(req, env);
    const session = token ? await service.getSession(token) : null;
    if (!session)
      throw new HttpError(401, 'UNAUTHENTICATED', 'Markalar için hesabınıza giriş yapın.');
    res.locals.brandUserId = session.user.id;
    res.set('Cache-Control', 'no-store');
    next();
  });
  const readLimit = createRateLimiter({
    enabled: env.rateLimitEnabled,
    windowMs: 60000,
    limit: 600,
  });
  const writeLimit = createRateLimiter({
    enabled: env.rateLimitEnabled,
    windowMs: 60000,
    limit: 120,
  });
  router.use((req, res, next) => (req.method === 'GET' ? readLimit : writeLimit)(req, res, next));
  router.get('/', async (_req, res) => res.json(await repo.list(res.locals.brandUserId as string)));
  router.get('/urunler', async (_req, res) =>
    res.json(await repo.listProducts(res.locals.brandUserId as string)),
  );
  router.post('/', async (req, res) =>
    res
      .status(201)
      .json(await repo.save(res.locals.brandUserId as string, parse(brandDraftSchema, req.body))),
  );
  router.post('/sirala', async (req, res) => {
    await repo.reorder(res.locals.brandUserId as string, parse(reorderBrandsSchema, req.body).ids);
    res.status(204).end();
  });
  router.get('/:id/logo', async (req, res) => {
    const key = parse(brandKeySchema, req.params.id);
    const image = await repo.logo(res.locals.brandUserId as string, key);
    const mimeType = logoMime(image.format);
    if (req.query.bicim === 'base64') {
      res.json({
        mimeType,
        dataUrl: `data:${mimeType};base64,${image.data.toString('base64')}`,
      });
      return;
    }
    if (image.format === 'svg') res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    if (req.query.indir === '1')
      res.attachment(`marka-${key}.${image.format === 'jpeg' ? 'jpg' : image.format}`);
    res.type(mimeType).send(image.data);
  });
  router.post('/:id', async (req, res) =>
    res.json(
      await repo.save(
        res.locals.brandUserId as string,
        parse(brandDraftSchema, req.body),
        parse(brandKeySchema, req.params.id),
      ),
    ),
  );
  router.post('/:id/aktiflik', async (req, res) => {
    await repo.setActive(
      res.locals.brandUserId as string,
      parse(brandKeySchema, req.params.id),
      parse(z.object({ active: z.boolean() }).strict(), req.body).active,
    );
    res.status(204).end();
  });
  router.post('/:id/sil', async (req, res) => {
    await repo.remove(res.locals.brandUserId as string, parse(brandKeySchema, req.params.id));
    res.status(204).end();
  });
  for (const [path, remove] of [
    ['ata', false],
    ['cikar', true],
  ] as const)
    router.post('/:id/urunler/' + path, async (req, res) => {
      await repo.assign(
        res.locals.brandUserId as string,
        parse(brandKeySchema, req.params.id),
        parse(brandProductsSchema, req.body).productIds,
        remove,
      );
      res.status(204).end();
    });
  return router;
}
