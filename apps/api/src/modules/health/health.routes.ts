import { Router } from 'express';

/** checkDatabase verilirse veritabanı erişilebilirliği de raporlanır (ayrıntı sızdırılmadan). */
export function createHealthRouter(checkDatabase?: () => Promise<void>): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!checkDatabase) return res.json({ status: 'ok' });
    try {
      await checkDatabase();
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });
  return router;
}
