import express from 'express';
import request from 'supertest';
import sharp from 'sharp';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import type { Env } from '../config/env';
import type { PrismaClient } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import { errorHandler } from '../middleware/error-handler';
import { createStockImages } from '../modules/stock/stock-images';

it('işletmenin ayarını kullanır; normal ve şeffaf yüklemeyi uploads altında WebP saklar', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pos-product-webp-'));
  let businessId = 3;
  const findUnique = vi.fn(async ({ where }) => ({
    values: { products: where.businessId_section.businessId === 3 ? 'true' : 'false' },
  }));
  const db = { isletmeAyari: { findUnique } } as unknown as PrismaClient;
  const env = {
    UPLOADS_DIR: root,
    COOKIE_SECRET: 'test-webp-secret',
    rateLimitEnabled: false,
  } as Env;
  const app = express().use(express.json({ limit: '7mb' }));
  app.use((_req, res, next) => {
    res.locals.stockUserId = '7';
    res.locals.workspace = { business: { id: businessId } };
    next();
  });
  app.use(createStockImages(env, db).router, errorHandler(createLogger('silent')));
  try {
    const bytes = await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    for (const transparent of [true, false]) {
      businessId = transparent ? 3 : 4;
      const result = await request(app)
        .post('/gorseller/yukle')
        .send({
          dataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
        });
      expect(result.status).toBe(201);
      const ticket = JSON.parse(
        Buffer.from(result.body.ticket.split('.')[0], 'base64url').toString('utf8'),
      );
      expect(ticket.user).toBe(7);
      expect(ticket.file).toMatch(/^[a-f0-9]{48}\.webp$/);
      const saved = await readFile(path.join(root, 'urunler', ticket.file));
      expect((await sharp(saved).metadata()).format).toBe('webp');
      const pixels = await sharp(saved).ensureAlpha().raw().toBuffer();
      expect(pixels[3]).toBe(transparent ? 0 : 255);
      expect(findUnique).toHaveBeenLastCalledWith({
        where: { businessId_section: { businessId, section: 'images' } },
        select: { values: true },
      });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
