import { apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { notificationSeeds } from '../../../mocks/notifications.mock';
import type { MobileNotification, NotificationDraft } from '../types';

export interface LoadedNotifications {
  items: MobileNotification[];
  /** true: açıkça seçilen test oturumunun örnek verisi. */
  sample: boolean;
}

const base = '/api/bildirimler/mobil';

/** Sunucu: bkz. types.ts. */
export const notificationService = {
  list: async (): Promise<LoadedNotifications> => {
    return { items: await apiRequest<MobileNotification[]>(base), sample: false };
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
