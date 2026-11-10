import { homeSeed } from '../../../mocks/home.mock';
import type { HomeData, HomePeriod } from '../types';

/** Anasayfa deneme verisi (yalnızca geçici test girişinde kullanılır). */
export const demoHomeService = {
  async load(period: HomePeriod): Promise<HomeData> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return homeSeed(period);
  },
};
