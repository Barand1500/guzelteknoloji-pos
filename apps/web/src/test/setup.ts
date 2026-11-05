import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Sahte servislerin gecikmeleri yoğun çalışmada (tüm testler birlikte) 1 sn varsayılanını aşabilir.
configure({ asyncUtilTimeout: 4000 });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
