import { Router } from 'express';
import { z } from 'zod';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import { requirePermission, type AccessContext } from '../workspace/workspace.access';

export function createMessageHistoryRouter(db: PrismaClient) {
  const router = Router();
  router.get('/', async (req, res) => {
    const context = res.locals.workspace as AccessContext | undefined;
    if (!context) throw new HttpError(401, 'UNAUTHENTICATED', 'Hesabınıza giriş yapın.');
    requirePermission(context, 'settings', 'read');
    const channel = z.enum(['email', 'sms']).parse(req.query.kanal);
    const rows = await db.sablonGonderimi.findMany({
      where: { isletmeId: context.business.id, kanal: channel },
      orderBy: { id: 'desc' },
      take: 50,
      select: {
        id: true,
        olay: true,
        kanal: true,
        durum: true,
        olusturmaTarihi: true,
        gonderimTarihi: true,
      },
    });
    res
      .set('Cache-Control', 'no-store')
      .json(
        rows.map((row) => ({
          id: String(row.id),
          event: row.olay,
          channel: row.kanal,
          status: row.durum,
          createdAt: row.olusturmaTarihi.toISOString(),
          sentAt: row.gonderimTarihi?.toISOString() ?? null,
        })),
      );
  });
  return router;
}
