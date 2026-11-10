import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import type { HomeData, HomePeriod } from '../types';
import { demoHomeService } from './home.demo';
import { homeSeed } from '../../../mocks/home.mock';

/** Sunucu: GET /api/anasayfa?donem=today|week|month|year|all (bkz. HomeData). */
/**
 * Sunucu uç noktası henüz yazılmadıysa (404) örnek veriyle çalışılır (`sample: true`); böylece
 * sayfa boş/hatalı görünmez. Uç hazır olunca bu geri dönüş kendiliğinden devre dışı kalır.
 */
export const homeService = {
  load: async (period: HomePeriod): Promise<HomeData> => {
    try {
      return await apiRequest<HomeData>(`/api/anasayfa?donem=${period}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { ...homeSeed(period), sample: true };
      throw e;
    }
  },
};
export const useHomeService = () => useDataService(homeService, demoHomeService);
