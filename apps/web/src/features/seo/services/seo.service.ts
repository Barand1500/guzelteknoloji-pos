import type {
  SeoKind,
  SeoListDto,
  SeoRedirectDraftInput,
  SeoSaveInput,
} from '@gt/shared';
import { useDataService } from '../../../lib/catalog-data';
import { apiRequest } from '../../../lib/http';
import { useSession } from '../../auth/hooks/session-context';
import { hasDevAccess } from '../../dev-login/devAccess';
import { seoDemoRows } from '../../../mocks/seo.mock';

const enc = encodeURIComponent;

/** SEO Ayarları: kayıt türüne göre başlık/açıklama listesi, kaydet ve 301 yönlendirmeleri. */
export const seoService = {
  load: (kind: SeoKind, ara: string | undefined, page: number, adet: number) =>
    apiRequest<SeoListDto>(
      `/api/seo/${enc(kind)}?sayfa=${page}&adet=${adet}${ara ? `&ara=${enc(ara)}` : ''}`,
    ),
  save: (kind: SeoKind, id: string, input: SeoSaveInput) =>
    apiRequest<void>(`/api/seo/${enc(kind)}/${enc(id)}`, { method: 'POST', body: input }),
  addRedirect: (draft: SeoRedirectDraftInput) =>
    apiRequest<void>('/api/seo/yonlendirme', { method: 'POST', body: draft }),
  updateRedirect: (id: string, input: SeoSaveInput) =>
    apiRequest<void>(`/api/seo/yonlendirme/${enc(id)}`, { method: 'POST', body: input }),
  removeRedirect: (id: string) =>
    apiRequest<void>(`/api/seo/yonlendirme/${enc(id)}/sil`, { method: 'POST' }),
};

const fold = (s: string) => s.toLocaleLowerCase('tr');

/** Deneme verisi (yalnızca geçici test girişi): mock satırlar, değişiklikler bellekte. */
export const demoSeoService: typeof seoService = {
  load: async (kind, ara, page, adet) => {
    const rows = seoDemoRows[kind] ?? [];
    const q = ara?.trim() ? fold(ara.trim()) : '';
    const filtered = rows.filter((r) =>
      q
        ? [r.name, r.address, r.seoTitle, r.seoDescription, ...r.redirects.map((x) => x.from)].some((t) =>
            fold(t).includes(q),
          )
        : true,
    );
    return {
      total: filtered.length,
      items: filtered
        .slice((page - 1) * adet, page * adet)
        .map((r) => ({ ...r, redirects: r.redirects.map((x) => ({ ...x })) })),
    };
  },
  save: async () => undefined,
  addRedirect: async () => undefined,
  updateRedirect: async () => undefined,
  removeRedirect: async () => undefined,
};

export const useSeoService = () => useDataService(seoService, demoSeoService);

/** Örnek veri modunda mıyız (useDataService ile aynı kural)? */
export const useSeoSample = (): boolean => {
  const { session } = useSession();
  return session.status === 'anonymous' && hasDevAccess();
};
