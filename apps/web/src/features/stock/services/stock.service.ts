import type { SelectOption } from '../../../components/ui/SelectField';
import { ApiError, apiRequest, NetworkError } from '../../../lib/http';
import type { OptionListKey, StockCardDraft, StockLookups } from '../types';

export interface StockService {
  getLookups(): Promise<StockLookups>;
  addOption(list: OptionListKey, label: string): Promise<SelectOption>;
  removeOption(list: OptionListKey, value: string): Promise<void>;
  save(draft: StockCardDraft, requestId: string): Promise<{ id: string }>;
}

export const stockService: StockService = {
  getLookups: () => apiRequest('/api/stok/secenekler'),
  addOption: (list, label) =>
    apiRequest('/api/stok/secenekler/ekle', { method: 'POST', body: { list, label } }),
  removeOption: (list, value) =>
    apiRequest('/api/stok/secenekler/kaldir', { method: 'POST', body: { list, value } }),
  save: (draft, requestId) =>
    apiRequest('/api/stok/kartlar', { method: 'POST', body: { draft, requestId } }),
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
