import { beforeEach, expect, it, vi } from 'vitest';
import { apiRequest } from '../../../lib/http';
import { productService } from './product.service';

vi.mock('../../../lib/http', () => ({ apiRequest: vi.fn() }));

beforeEach(() => vi.mocked(apiRequest).mockReset());

it('yalnız mevcut görsellerin sırasını yeniden yükleme yapmadan kaydeder', async () => {
  vi.mocked(apiRequest).mockResolvedValueOnce({ images: 0 });
  await productService.applyImages(
    [
      {
        productId: '3',
        urls: [],
        finalOrder: ['/api/stok/gorseller/43?v=b', '/api/stok/gorseller/42?v=a'],
      },
    ],
    false,
  );
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith('/api/stok/gorseller/kaydet', {
    method: 'POST',
    body: {
      replace: false,
      entries: [{ productId: '3', tickets: [], finalOrder: [{ imageId: 43 }, { imageId: 42 }] }],
    },
    timeoutMs: 120000,
  });
});

it('mevcut ve yeni görsel sırasını ID ve yükleme biletiyle sunucuya gönderir', async () => {
  vi.mocked(apiRequest)
    .mockResolvedValueOnce({ ticket: 'upload-ticket' })
    .mockResolvedValueOnce({ images: 1 });
  const uploaded = 'data:image/png;base64,AAAA';
  const existing = '/api/stok/gorseller/42?v=old.png';
  expect(
    await productService.applyImages(
      [{ productId: '3', urls: [uploaded], finalOrder: [uploaded, existing] }],
      false,
    ),
  ).toBe(1);
  expect(apiRequest).toHaveBeenLastCalledWith('/api/stok/gorseller/kaydet', {
    method: 'POST',
    body: {
      replace: false,
      entries: [
        {
          productId: '3',
          tickets: ['upload-ticket'],
          finalOrder: [{ ticket: 'upload-ticket' }, { imageId: 42 }],
        },
      ],
    },
    timeoutMs: 120000,
  });
});
