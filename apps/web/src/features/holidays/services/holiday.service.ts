import { apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import {
  FALLBACK_2026,
  parseNager,
  type CustomDraft,
  type CustomHoliday,
  type OfficialDay,
} from '../types';

export interface LoadedYear {
  official: OfficialDay[];
  custom: CustomHoliday[];
  /** true: sunucu uçları yok (404); resmî günler API'den doğrudan çekildi, özel tatiller yalnızca ekranda. */
  sample: boolean;
  /** Resmî günler alınamadı (çevrimdışı); yedek liste (varsa) gösteriliyor. */
  offline: boolean;
}

const NAGER = 'https://date.nager.at/api/v3/PublicHolidays';

/** Tarayıcıdan doğrudan resmî tatil API'si (sunucu ucu hazır olana kadar). Başarısızsa yedek liste. */
async function fromPublicApi(year: number): Promise<{ official: OfficialDay[]; offline: boolean }> {
  try {
    const res = await fetch(`${NAGER}/${year}/TR`);
    if (!res.ok) throw new Error(String(res.status));
    return { official: parseNager(await res.json()), offline: false };
  } catch {
    return { official: year === 2026 ? FALLBACK_2026 : [], offline: true };
  }
}

/** Sunucu: bkz. types.ts. */
export const holidayService = {
  load: async (year: number): Promise<LoadedYear> => {
    const r = await apiRequest<{
      official: OfficialDay[];
      custom: CustomHoliday[];
      offline?: boolean;
    }>(`/api/resmi-tatiller?yil=${year}`);
    return { ...r, sample: false, offline: r.offline ?? false };
  },
  create: (draft: CustomDraft) =>
    apiRequest<CustomHoliday>('/api/resmi-tatiller', { method: 'POST', body: draft }),
  update: (id: string, draft: CustomDraft) =>
    apiRequest<CustomHoliday>(`/api/resmi-tatiller/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: draft,
    }),
  remove: (id: string) =>
    apiRequest<void>(`/api/resmi-tatiller/${encodeURIComponent(id)}/sil`, { method: 'POST' }),
};

/** Deneme verisi (yalnızca geçici test girişi): resmî günler API'den (olmazsa yedek listeden), özel tatiller bellekte. */
export const demoHolidayService: typeof holidayService = {
  load: async (year) => {
    const { official, offline } = await fromPublicApi(year);
    return { official, custom: [], sample: true, offline };
  },
  create: async (draft) => ({ id: `yeni-${Math.random().toString(36).slice(2, 8)}`, ...draft }),
  update: async (id, draft) => ({ id, ...draft }),
  remove: async () => undefined,
};

export const useHolidayService = () => useDataService(holidayService, demoHolidayService);
