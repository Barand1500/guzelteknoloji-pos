import type { RequestHandler } from 'express';
import type { Logger } from '../lib/logger';

/**
 * Yalnızca yöntem, yol (query string HARİÇ — OAuth `code`/`state` sızmasın), durum ve süre loglanır.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info(
        { method: req.method, path: req.path, status: res.statusCode, ms: Math.round(ms) },
        'istek',
      );
    });
    next();
  };
}
