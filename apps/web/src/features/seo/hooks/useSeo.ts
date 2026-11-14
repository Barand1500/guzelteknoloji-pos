import { useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import type { SeoKind, SeoListDto, SeoRowDto, SeoSaveInput } from '@gt/shared';
import { useSeoSample, useSeoService } from '../services/seo.service';
import type { SeoRedirectDraft } from '../types';

const fresh = () => `yeni-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;

/**
 * Bir sekmenin SEO satırları (sunucu taraflı arama + sayfalama). Örnek veri modunda değişiklikler
 * yalnızca ekranda yapılır; gerçek veride önce sunucuya yazılır, sonra satır güncellenir.
 */
export function useSeo(kind: SeoKind, ara: string, page: number, adet: number) {
  const service = useSeoService();
  const sample = useSeoSample();
  const [data, setData] = useState<SeoListDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void service
      .load(kind, ara.trim() || undefined, page, adet)
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(dataError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [service, kind, ara, page, adet]);

  const patch = (fn: (rows: SeoRowDto[]) => SeoRowDto[]) =>
    setData((d) => (d ? { ...d, items: fn(d.items) } : d));

  const save = async (id: string, input: SeoSaveInput) => {
    if (!sample) await service.save(kind, id, input);
    patch((rows) => rows.map((r) => (r.id === id ? { ...r, ...input } : r)));
  };

  const addRedirect = async (id: string, draft: SeoRedirectDraft) => {
    const redirectId = sample ? fresh() : (await service.addRedirect({ kind, id, ...draft })).id;
    patch((rows) =>
      rows.map((r) =>
        r.id === id ? { ...r, redirects: [...r.redirects, { id: redirectId, ...draft }] } : r,
      ),
    );
  };

  const updateRedirect = async (redirectId: string, input: SeoSaveInput) => {
    if (!sample) await service.updateRedirect(redirectId, input);
    patch((rows) =>
      rows.map((r) => ({
        ...r,
        redirects: r.redirects.map((x) => (x.id === redirectId ? { ...x, ...input } : x)),
      })),
    );
  };

  const removeRedirect = async (redirectId: string) => {
    if (!sample) await service.removeRedirect(redirectId);
    patch((rows) =>
      rows.map((r) => ({ ...r, redirects: r.redirects.filter((x) => x.id !== redirectId) })),
    );
  };

  return { data, sample, error, save, addRedirect, updateRedirect, removeRedirect };
}

export type SeoStore = ReturnType<typeof useSeo>;
