import { apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import type { HomeData, HomePeriod } from '../types';
import { demoHomeService } from './home.demo';

/** Sunucu: GET /api/anasayfa?donem=today|week|month|year|all (bkz. HomeData). */
export const homeService = {
  load: (period: HomePeriod) => apiRequest<HomeData>(`/api/anasayfa?donem=${period}`),
};
export const useHomeService = () => useDataService(homeService, demoHomeService);
