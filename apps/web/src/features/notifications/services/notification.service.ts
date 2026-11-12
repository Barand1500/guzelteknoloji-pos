import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { notificationSeeds } from '../../../mocks/notifications.mock';
import type { MobileNotification, NotificationDraft } from '../types';

export interface LoadedNotifications {
  items: MobileNotification[];
  /** true: sunucu uçları henüz yok (404); ekranda örnek veri var, gönderimler yalnızca ekranda. */
  sample: boolean;
}

const base = '/api/bildirimler/mobil';

/** Sunucu: bkz. types.ts. Uç yoksa (404) örnek veriyle çalışılır. */
export const notificationService = {
  list: async (): Promise<LoadedNotifications> => {
    try {
      return { items: await apiRequest<MobileNotification[]>(base), sample: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { items: notificationSeeds(), sample: true };
      throw e;
    }
  },
  send: (draft: NotificationDraft) =>
    apiRequest<MobileNotification>(base, { method: 'POST', body: draft }),
  cancel: (id: string) => apiRequest<void>(`${base}/${encodeURIComponent(id)}/iptal`, { method: 'POST' }),
};

/** Deneme verisi (yalnızca geçici test girişi): her şey örnek, bellekte. */
export const demoNotificationService: typeof notificationService = {
  list: async () => ({ items: notificationSeeds(), sample: true }),
  send: async (draft) => ({
    id: `yeni-${Math.random().toString(36).slice(2, 8)}`,
    title: draft.title,
    text: draft.text,
    at: draft.sendAt ?? '',
    status: 'sent',
    auto: false,
    audience: draft.customerIds.length || null,
  }),
  cancel: async () => undefined,
};

export const useNotificationService = () => useDataService(notificationService, demoNotificationService);
