import type { CommerceChoices } from '@gt/shared';
import { Router } from 'express';
import type { Env } from '../../config/env';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { createRateLimiter } from '../../middleware/rate-limit';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';
import { StockDefRepository } from './stockdef.repository';
import { PaymentRepository } from './payment.repository';

/** Form seçenekleri ekranın kendi okuma yetkisiyle alınır; ayar yönetimi yetkisi gerektirmez. */
export function createCommerceChoicesRouter(db: PrismaClient, env: Env) {
  const router = Router();
  const definitions = new StockDefRepository(db);
  const payments = new PaymentRepository(db, env.UPLOADS_DIR);
  const limit = createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 120 });
  for (const [path, resource] of [['musteriler', 'customers'], ['kampanyalar', 'campaigns'], ['siparisler', 'orders']] as const) {
    router.get(`/${path}/secenekler`, limit, async (_req, res) => {
      const ctx = res.locals.workspace as AccessContext | undefined;
      if (!ctx) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
      requirePermission(ctx, resource, 'read');
      const [customerTypes, priceLists, paymentRows] = await Promise.all([
        definitions.names(ctx.business.id, ctx.ownerId, 'cari-tipleri'),
        definitions.priceLists(ctx.business.id, ctx.ownerId),
        payments.list(ctx.business.id),
      ]);
      const result: CommerceChoices = {
        customerTypes,
        priceLists,
        payments: paymentRows.filter((row) => row.active).map(({ id, name }) => ({ id, name })),
      };
      if (resource === 'orders') {
        const [customers, products] = await Promise.all([
          db.musteri.findMany({ where: { businessId: ctx.business.id, durum: true }, select: { id: true, ad: true }, orderBy: { ad: 'asc' } }),
          db.stokKarti.findMany({ where: { kullaniciKimligi: ctx.ownerId, satisAcik: true, varyantlar: { none: {} }, vergiler: { none: {} } }, select: { kimlik: true, stokAdi: true, stokKodu: true }, orderBy: { stokAdi: 'asc' } }),
        ]);
        res.set('Cache-Control', 'no-store').json({ ...result,
          customers: customers.map((c) => ({ id: String(c.id), name: c.ad })),
          products: products.map((p) => ({ id: String(p.kimlik), name: p.stokAdi ?? '', code: p.stokKodu ?? '' })),
        });
        return;
      }
      res.set('Cache-Control', 'no-store').json(result);
    });
  }
  return router;
}
