import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DEFAULT_STOCK_LOOKUPS } from '@gt/shared';
import { createEmptyDraft } from '../stock.rules';
import type { StockService } from '../services/stock.service';
import { useStockEditor } from './useStockEditor';

it('birim/barkod ortak, fiyatlar ayrı kalır; ekleme ve silme tüm listelere yansır', async () => {
  const initial = createEmptyDraft('fiyat');
  initial.units.fiyat![0]!.sale.amount = '100';
  initial.units.perakende = structuredClone(initial.units.fiyat!);
  initial.units.perakende[0]!.sale.amount = '150';
  const service: StockService = {
    getLookups: vi.fn(),
    checkDuplicate: vi.fn().mockResolvedValue({ code: null, barcode: null }),
    addOption: vi.fn(),
    removeOption: vi.fn(),
    get: vi.fn(),
    getExtraOptions: vi.fn(),
    getExtras: vi.fn(),
    update: vi.fn(),
    save: vi.fn().mockResolvedValue({ id: '123' }),
  };
  const { result } = renderHook(() =>
    useStockEditor(DEFAULT_STOCK_LOOKUPS, service, { initialDraft: initial }),
  );
  const mainId = result.current.rows[0]!.id;
  act(() => result.current.setActiveList('perakende'));
  act(() =>
    result.current.updateRow(mainId, {
      barcodes: [{ id: 'barcode-1', type: 'EAN13', code: '8691234567890' }],
      note: 'Ortak not',
    }),
  );
  expect(result.current.draft.units.fiyat![0]!.barcodes).toEqual([
    { id: 'barcode-1', type: 'EAN13', code: '8691234567890' },
  ]);
  expect(result.current.draft.units.fiyat![0]!.sale.amount).toBe('100');
  expect(result.current.draft.units.perakende![0]!.sale.amount).toBe('150');
  act(() => result.current.addRow());
  const secondId = result.current.rows[1]!.id;
  act(() =>
    result.current.updateRow(secondId, {
      barcodes: [{ id: 'duplicate', type: 'EAN13', code: '8691234567890' }],
    }),
  );
  expect(result.current.rows[1]!.barcodes).toEqual([]);
  expect(result.current.saveError).toContain('başka bir birimde');
  act(() => result.current.updateRow(secondId, { unit: 'koli', multiplier: '12' }));
  expect(result.current.draft.units.fiyat![1]!.multiplier).toBe('12');
  act(() => result.current.setActiveList('toptan'));
  expect(result.current.rows).toHaveLength(2);
  expect(result.current.rows[0]!.barcodes[0]!.code).toBe('8691234567890');
  act(() => result.current.removeRow(secondId));
  expect(Object.values(result.current.draft.units).map((rows) => rows.length)).toEqual([1, 1, 1]);
  await act(() => result.current.save());
  expect(result.current.saveError).toBeNull();
  expect(service.save).toHaveBeenCalledWith(result.current.draft, expect.any(String), undefined);
});
