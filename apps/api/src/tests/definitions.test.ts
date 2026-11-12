import { describe, expect, it } from 'vitest';
import {
  currencyDraftSchema,
  definitionDraftSchema,
  priceTableSchema,
} from '@gt/shared';
import { parseTcmbRate } from '../modules/definitions/tcmb';

const sample = `<?xml version="1.0" encoding="UTF-8"?>
< Tarih_Date Tarih="12.11.2026">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD">
    <Unit>1</Unit>
    <Isim>ABD DOLARI</Isim>
    <ForexBuying>42.1000</ForexBuying>
    <ForexSelling>42.2500</ForexSelling>
    <BanknoteBuying>42.0500</BanknoteBuying>
    <BanknoteSelling>42.4000</BanknoteSelling>
  </Currency>
  <Currency CrossOrder="1" Kod="JPY" CurrencyCode="JPY">
    <Unit>100</Unit>
    <ForexBuying>28.0000</ForexBuying>
    <ForexSelling>28.2000</ForexSelling>
    <BanknoteBuying></BanknoteBuying>
    <BanknoteSelling></BanknoteSelling>
  </Currency>
</ Tarih_Date>`;

describe('TCMB kur ayrıştırma', () => {
  it('döviz ve efektif kurlarını okur', () => {
    expect(parseTcmbRate(sample, 'USD', 'dovizAlis')).toBe(42.1);
    expect(parseTcmbRate(sample, 'USD', 'dovizSatis')).toBe(42.25);
    expect(parseTcmbRate(sample, 'USD', 'efektifSatis')).toBe(42.4);
  });

  it('100 birimlik kuru 1 birime indirir', () => {
    expect(parseTcmbRate(sample, 'JPY', 'dovizSatis')).toBe(0.282);
  });

  it('efektif alanı boşsa döviz kuruna düşer', () => {
    expect(parseTcmbRate(sample, 'JPY', 'efektifAlis')).toBe(0.28);
  });

  it('olmayan kodu null döndürür', () => {
    expect(parseTcmbRate(sample, 'GBP', 'dovizAlis')).toBeNull();
  });
});

describe('Tanımlamalar şemaları', () => {
  it('para birimi kısa adını büyük harfe çevirir', () => {
    const parsed = currencyDraftSchema.parse({
      name: 'ABD Doları',
      shortName: 'usd',
      symbol: '$',
      rateType: 'dovizSatis',
      auto: true,
      rate: 0,
      apiUrl: 'https://www.tcmb.gov.tr/kurlar/today.xml',
    });
    expect(parsed.shortName).toBe('USD');
  });

  it('fiyat basamağında son satır açık ve artan olmalı', () => {
    expect(
      priceTableSchema.safeParse({
        vat: 20,
        desi: [
          { to: 2, price: 100, perUnit: false },
          { to: null, price: 150, perUnit: false },
        ],
        weight: [{ to: null, price: 90, perUnit: false }],
      }).success,
    ).toBe(true);

    expect(
      priceTableSchema.safeParse({
        vat: 20,
        desi: [
          { to: 5, price: 100, perUnit: false },
          { to: 3, price: 150, perUnit: false },
          { to: null, price: 200, perUnit: false },
        ],
        weight: [{ to: null, price: 90, perUnit: false }],
      }).success,
    ).toBe(false);
  });

  it('tanım başlığı boş olamaz', () => {
    expect(definitionDraftSchema.safeParse({ title: ' ', short: '', text: '' }).success).toBe(false);
  });
});
