import { useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useNotificationService } from '../services/notification.service';
import { isPast, localStamp, type MobileNotification, type NotificationDraft } from '../types';

/**
 * Mobil bildirim listesi + gönder/iptal. Örnek veride (sunucu uçları yokken) gönderim yalnızca ekranda yapılır:
 * geçmiş/boş zaman "Gönderildi", gelecek zaman "Planlandı" olarak listeye eklenir.
 */
export function useNotifications() {
  const service = useNotificationService();
  const { session } = useSession();
  const [items, setItems] = useState<MobileNotification[] | null>(null);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settled = session.status !== 'loading';

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    void service
      .list()
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setSample(r.sample);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(dataError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [service, settled]);

  const send = async (draft: NotificationDraft) => {
    const now = new Date();
    const saved: MobileNotification = sample
      ? {
          id: `yeni-${Date.now().toString(36)}`,
          title: draft.title,
          text: draft.text,
          at: draft.sendAt ?? localStamp(new Date(now.getTime() + 60000)),
          status: draft.sendAt && !isPast(draft.sendAt, now) ? 'scheduled' : 'sent',
          auto: false,
          audience: draft.customerIds.length || null,
        }
      : await service.send(draft);
    setItems((l) => (l ? [saved, ...l] : l));
    return saved;
  };

  const cancel = async (id: string) => {
    if (!sample) await service.cancel(id);
    setItems((l) => (l ? l.map((n) => (n.id === id ? { ...n, status: 'cancelled' } : n)) : l));
  };

  return { items, sample, error, send, cancel };
}

export type NotificationStore = ReturnType<typeof useNotifications>;
