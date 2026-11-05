import { pino, type Logger } from 'pino';

export function createLogger(level: string): Logger {
  return pino({
    level,
    // Gizli bilgiler hiçbir koşulda log'a yazılmamalı.
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.token',
      ],
      censor: '[GİZLİ]',
    },
  });
}

export type { Logger };
