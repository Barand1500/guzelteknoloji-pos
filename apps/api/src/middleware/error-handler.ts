import type { ApiErrorBody } from '@gt/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error';
import type { Logger } from '../lib/logger';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', 'İstenen kaynak bulunamadı.'));
};

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, req, res, _next) => {
    let status = 500;
    let body: ApiErrorBody = {
      error: { code: 'INTERNAL_ERROR', message: 'Beklenmeyen bir hata oluştu.' },
    };

    if (error instanceof HttpError) {
      status = error.status;
      body = { error: { code: error.code, message: error.message } };
    } else if (error instanceof ZodError) {
      status = 400;
      body = {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message ?? 'Gönderilen bilgiler geçersiz.',
        },
      };
    } else if (
      error instanceof SyntaxError &&
      'type' in error &&
      error.type === 'entity.parse.failed'
    ) {
      status = 400;
      body = { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz istek gövdesi.' } };
    } else {
      // Ayrıntı yalnızca sunucu log'una; istemciye iç hata bilgisi sızdırılmaz.
      logger.error({ err: error, method: req.method, path: req.path }, 'İşlenmeyen hata');
    }

    res.status(status).json(body);
  };
}
