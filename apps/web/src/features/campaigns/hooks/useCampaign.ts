import { useCallback, useEffect, useState } from 'react';
import { dataError } from '../../../lib/catalog-data';
import { useSession } from '../../auth/hooks/session-context';
import { useCampaignService } from '../services/campaign.service';
import type { CampaignData, CampaignKind, CampaignRule, GeneralRule, RuleDraft } from '../types';

/**
 * Bir kampanya sayfasının verisi: genel kural + özel kurallar. Örnek veride (sunucu uçları yokken)
 * değişiklikler yalnızca ekranda yapılır; gerçek veride önce sunucuya yazılır, sonra ekran güncellenir.
 */
export function useCampaign(kind: CampaignKind) {
  const service = useCampaignService();
  const { session } = useSession();
  const [data, setData] = useState<CampaignData | null>(null);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const settled = session.status !== 'loading';

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    void service
      .load(kind)
      .then((r) => {
        if (cancelled) return;
        setData(r.data);
        setSample(r.sample);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(dataError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [service, kind, settled, retry]);

  const refresh = useCallback(() => setRetry((n) => n + 1), []);

  const saveGeneral = async (rule: GeneralRule) => {
    if (!sample) await service.saveGeneral(kind, rule);
    setData((d) => (d ? { ...d, general: rule } : d));
  };

  const saveRule = async (draft: RuleDraft, id?: string): Promise<CampaignRule> => {
    const saved: CampaignRule = sample
      ? { id: id ?? `yeni-${Date.now().toString(36)}`, ...draft }
      : id
        ? await service.updateRule(kind, id, draft)
        : await service.createRule(kind, draft);
    setData((d) =>
      d
        ? {
            ...d,
            rules: id ? d.rules.map((r) => (r.id === id ? saved : r)) : [saved, ...d.rules],
          }
        : d,
    );
    return saved;
  };

  const setRuleActive = async (id: string, active: boolean) => {
    if (!sample) await service.setRuleActive(kind, id, active);
    setData((d) =>
      d ? { ...d, rules: d.rules.map((r) => (r.id === id ? { ...r, active } : r)) } : d,
    );
  };

  const removeRule = async (id: string) => {
    if (!sample) await service.removeRule(kind, id);
    setData((d) => (d ? { ...d, rules: d.rules.filter((r) => r.id !== id) } : d));
  };

  return { data, sample, error, refresh, saveGeneral, saveRule, setRuleActive, removeRule };
}
