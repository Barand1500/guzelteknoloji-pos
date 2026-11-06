import type { SelectOption } from '../../../components/ui/SelectField';
import { ApiError, apiRequest, NetworkError } from '../../../lib/http';
import type {
  OptionListKey,
  StockCardDraft,
  StockExtraOptions,
  StockExtras,
  StockLookups,
} from '../types';

export interface StockService {
  getLookups(): Promise<StockLookups>;
  addOption(list: OptionListKey, label: string): Promise<SelectOption>;
  removeOption(list: OptionListKey, value: string): Promise<void>;
  save(draft: StockCardDraft, requestId: string, extras?: StockExtras): Promise<{ id: string }>;
  /** Düzenleme: kayıtlı kartı forma dolu getirir. */
  get(id: string): Promise<StockCardDraft>;
  /** Düzenleme: kayıtlı kartı günceller (sunucuda POST /kartlar/:id/guncelle gerekir). */
  update(
    id: string,
    draft: StockCardDraft,
    requestId: string,
    extras?: StockExtras,
  ): Promise<{ id: string }>;
  /**
   * Kategori ve fırsat kutularının seçenekleri. `null` = bu kutular henüz sunucuya bağlı değil;
   * ekranda kilitli görünür ve seçim kaydedilmez (sahte başarı gösterilmez).
   */
  getExtraOptions(): Promise<StockExtraOptions | null>;
  /** Kartın kayıtlı kategori ve fırsat seçimleri. */
  getExtras(id: string): Promise<StockExtras>;
}

export const stockService: StockService = {
  getLookups: () => apiRequest('/api/stok/secenekler'),
  addOption: (list, label) =>
    apiRequest('/api/stok/secenekler/ekle', { method: 'POST', body: { list, label } }),
  removeOption: (list, value) =>
    apiRequest('/api/stok/secenekler/kaldir', { method: 'POST', body: { list, value } }),
  save: (draft, requestId) =>
    apiRequest('/api/stok/kartlar', { method: 'POST', body: { draft, requestId } }),
  get: (id) => apiRequest(`/api/stok/kartlar/${encodeURIComponent(id)}`),
  update: (id, draft, requestId) =>
    apiRequest(`/api/stok/kartlar/${encodeURIComponent(id)}/guncelle`, {
      method: 'POST',
      body: { draft, requestId },
    }),
  // Kategori ve fırsat sunucu uçları ön yüze bağlanana kadar kutular kilitlidir.
  getExtraOptions: async () => null,
  getExtras: async () => ({ categoryIds: [], dealIds: [] }),
};

export function stockErrorMessage(error: unknown): string {
  if (error instanceof NetworkError)
    return 'Sunucuya ulaşılamadı. Bilgileriniz korundu; tekrar deneyin.';
  if (error instanceof ApiError) {
    if (error.code === 'UNAUTHENTICATED') return 'Oturumunuz sona erdi. Tekrar giriş yapın.';
    if (error.code === 'VALIDATION_ERROR' || error.code === 'CONFLICT') return error.message;
    if (error.code === 'RATE_LIMITED')
      return 'Çok fazla işlem yapıldı. Biraz bekleyip tekrar deneyin.';
  }
  return 'İşlem tamamlanamadı. Bilgileriniz korundu; tekrar deneyin.';
}
