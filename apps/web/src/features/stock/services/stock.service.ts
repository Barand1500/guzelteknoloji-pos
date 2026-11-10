import type { SelectOption } from '../../../components/ui/SelectField';
import { ApiError, apiRequest, NetworkError } from '../../../lib/http';
import { categoryService } from '../../categories/services/category.service';
import { dealService } from '../../deals/services/deal.service';
import { attributeService } from '../../attributes/services/attribute.service';
import type {
  OptionListKey,
  StockCardDraft,
  StockExtraOptions,
  StockExtras,
  StockLookups,
} from '../types';

/** Başka üründe kullanılan kod/barkod: o ürünün kimliği, adı ve kodu. */
export interface DuplicateHit {
  id: string;
  name: string;
  code: string;
}
export interface DuplicateResult {
  code: DuplicateHit | null;
  barcode: DuplicateHit | null;
}

export interface StockService {
  /** Kod/barkod başka bir üründe var mı (düzenlenen kartın kendisi sayılmaz). Kaydetmeden uyarmak içindir. */
  checkDuplicate(params: {
    code: string;
    barcode: string;
    excludeId?: string;
  }): Promise<DuplicateResult>;
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
  checkDuplicate: ({ code, barcode, excludeId }) => {
    const query = new URLSearchParams({ kod: code, barkod: barcode });
    if (excludeId) query.set('haric', excludeId);
    return apiRequest(`/api/stok/kartlar/kontrol?${query.toString()}`);
  },
  getLookups: () => apiRequest('/api/stok/secenekler'),
  addOption: (list, label) =>
    apiRequest('/api/stok/secenekler/ekle', { method: 'POST', body: { list, label } }),
  removeOption: (list, value) =>
    apiRequest('/api/stok/secenekler/kaldir', { method: 'POST', body: { list, value } }),
  save: (draft, requestId, extras) =>
    apiRequest('/api/stok/kartlar', { method: 'POST', body: { draft, requestId, extras } }),
  get: (id) => apiRequest(`/api/stok/kartlar/${encodeURIComponent(id)}`),
  update: (id, draft, requestId, extras) =>
    apiRequest(`/api/stok/kartlar/${encodeURIComponent(id)}/guncelle`, {
      method: 'POST',
      body: { draft, requestId, extras },
    }),
  getExtraOptions: async () => {
    const [categories, deals, attributes] = await Promise.all([
      categoryService.list(),
      dealService.list(),
      attributeService.snapshot(),
    ]);
    return { categories, deals, attributes };
  },
  getExtras: (id) => apiRequest(`/api/stok/kartlar/${encodeURIComponent(id)}/ekler`),
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
