import { describe, expect, it } from 'vitest';
import { audienceOptions, audienceSelection, audienceLabels } from './campaign-audience';

describe('Kampanya seçimleri gerçek tanımlamalardan gelir', () => {
  const options = [{ id: '41', name: 'PERAKENDE' }, { id: '42', name: 'Yeni fiyat' }];
  it('eski adları kayıt kimliğine çevirir; tanınmayan seçimi sessizce kaldırmaz', () => {
    expect(audienceSelection(['perakende', '42', 'Eski liste'], options)).toEqual(['41', '42', 'Eski liste']);
    expect(audienceOptions(options, ['Eski liste'])).toContainEqual({ id: 'Eski liste', name: 'Eski liste' });
  });
  it('kimlikle kaydedilmiş seçenekleri kullanıcıya adlarıyla gösterir', () => {
    expect(audienceLabels(['41', 'Eski liste'], options)).toEqual(['PERAKENDE', 'Eski liste']);
  });
});
