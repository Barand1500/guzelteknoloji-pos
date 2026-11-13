import { useEffect, useState } from 'react';
import { MESSAGE_EVENTS } from '@gt/shared';
import { Alert } from '../../components/ui/Alert';
import { apiRequest } from '../../lib/http';
import { dataError } from '../../lib/catalog-data';

interface Delivery {
  id: string;
  event: string;
  channel: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
}
const statuses: Record<string, string> = {
  pending: 'Bekliyor',
  sending: 'Gönderiliyor',
  sent: 'Gönderildi',
  failed: 'Başarısız',
  uncertain: 'Sonuç belirsiz',
  skipped: 'Atlandı',
};
export function MessageDeliveryHistory({
  channel,
  demo,
}: {
  channel: 'sms' | 'email';
  demo: boolean;
}) {
  const [items, setItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (demo) return;
    let active = true;
    void apiRequest<Delivery[]>(`/api/hesap/sablon-gonderimleri?kanal=${channel}`)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch((cause) => {
        if (active) setError(dataError(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [channel, demo]);
  return (
    <section aria-label="Gönderim Geçmişi" className="rounded-2xl border border-line p-4">
      <h3 className="mb-3 font-bold">Gönderim Geçmişi</h3>
      {demo ? (
        <p className="text-sm text-ink-muted">Deneme modunda gönderim geçmişi bulunmaz.</p>
      ) : error ? (
        <Alert tone="error">{error}</Alert>
      ) : loading ? (
        <p role="status">Gönderimler yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">Henüz gönderim kaydı yok.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <span>
                {MESSAGE_EVENTS.find((event) => event.value === item.event)?.label ?? item.event}
              </span>
              <span>{statuses[item.status] ?? item.status}</span>
              <time dateTime={item.sentAt ?? item.createdAt}>
                {new Date(item.sentAt ?? item.createdAt).toLocaleString('tr-TR')}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
