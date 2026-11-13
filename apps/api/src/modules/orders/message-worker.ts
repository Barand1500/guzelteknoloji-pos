import type { PrismaClient } from '../../lib/prisma';
import type { Logger } from '../../lib/logger';
import type { SablonGonderimi } from '../../generated/prisma/client';

export class MessageRejected extends Error {}
export type DeliverMessage = (message: SablonGonderimi) => Promise<'sent' | 'skipped'>;

export async function processMessageQueue(
  db: PrismaClient,
  deliver: DeliverMessage,
  stopping = () => false,
) {
  // Önceki süreç gönderirken kapanmış olabilir. Tekrar gönderim çift ücret doğurabilir.
  await db.sablonGonderimi.updateMany({
    where: { durum: 'sending', guncellemeTarihi: { lt: new Date(Date.now() - 5 * 60000) } },
    data: { durum: 'uncertain', hataKodu: 'GONDERIM_SONUCU_BELIRSIZ' },
  });
  const pending = await db.sablonGonderimi.findMany({
    where: { durum: 'pending' },
    orderBy: { id: 'asc' },
    take: 5,
  });
  for (const message of pending) {
    if (stopping()) break;
    const claimed = await db.sablonGonderimi.updateMany({
      where: { id: message.id, durum: 'pending' },
      data: { durum: 'sending' },
    });
    if (claimed.count !== 1) continue;
    let status: 'sent' | 'skipped' | 'failed' | 'uncertain',
      error: string | null = null;
    try {
      status = await deliver(message);
    } catch (cause) {
      status = cause instanceof MessageRejected ? 'failed' : 'uncertain';
      error = status === 'failed' ? 'GONDERIM_REDDEDILDI' : 'GONDERIM_SONUCU_BELIRSIZ';
    }
    await db.sablonGonderimi.update({
      where: { id: message.id },
      data: {
        durum: status,
        hataKodu: error,
        ...(status === 'sent' ? { gonderimTarihi: new Date() } : {}),
      },
    });
  }
}

export function startMessageWorker(db: PrismaClient, deliver: DeliverMessage, logger: Logger) {
  let stopped = false,
    running: Promise<void> | null = null;
  const tick = () => {
    if (stopped || running) return;
    running = processMessageQueue(db, deliver, () => stopped)
      .catch(() => {
        // Mesaj, alıcı, SMTP hatası ve parolalar log'a yazılmaz.
        logger.error(
          'Şablon gönderim kuyruğu işlenemedi. Migration ve veritabanı bağlantısını kontrol edin.',
        );
      })
      .finally(() => {
        running = null;
      });
  };
  const timer = setInterval(tick, 10000);
  timer.unref();
  tick();
  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await running;
    },
  };
}
