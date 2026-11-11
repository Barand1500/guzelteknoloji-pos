import { ApiError, apiRequest } from '../../../lib/http';
import { useDataService } from '../../../lib/catalog-data';
import { campaignSeed } from '../../../mocks/campaigns.mock';
import {
  CAMPAIGN_SLUG,
  type CampaignData,
  type CampaignKind,
  type CampaignRule,
  type GeneralRule,
  type RuleDraft,
} from '../types';

export interface LoadedCampaign {
  data: CampaignData;
  /** true: sunucu uçları henüz yok (404); ekranda örnek veri var, değişiklikler yalnızca ekranda. */
  sample: boolean;
}

const base = (kind: CampaignKind) => `/api/kampanyalar/${CAMPAIGN_SLUG[kind]}`;
const rulePath = (kind: CampaignKind, id: string) => `${base(kind)}/kurallar/${encodeURIComponent(id)}`;

/** Sunucu sözleşmesi: bkz. types.ts. Uç yoksa (404) örnek veriyle çalışılır. */
export const campaignService = {
  load: async (kind: CampaignKind): Promise<LoadedCampaign> => {
    try {
      return { data: await apiRequest<CampaignData>(base(kind)), sample: false };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        return { data: campaignSeed(kind), sample: true };
      throw e;
    }
  },
  saveGeneral: (kind: CampaignKind, rule: GeneralRule) =>
    apiRequest<void>(`${base(kind)}/genel`, { method: 'POST', body: rule }),
  createRule: (kind: CampaignKind, draft: RuleDraft) =>
    apiRequest<CampaignRule>(`${base(kind)}/kurallar`, { method: 'POST', body: draft }),
  updateRule: (kind: CampaignKind, id: string, draft: RuleDraft) =>
    apiRequest<CampaignRule>(rulePath(kind, id), { method: 'POST', body: draft }),
  setRuleActive: (kind: CampaignKind, id: string, active: boolean) =>
    apiRequest<void>(`${rulePath(kind, id)}/aktiflik`, { method: 'POST', body: { active } }),
  removeRule: (kind: CampaignKind, id: string) =>
    apiRequest<void>(`${rulePath(kind, id)}/sil`, { method: 'POST' }),
};

/** Deneme verisi (yalnızca geçici test girişi): her şey örnek, bellekte. */
export const demoCampaignService: typeof campaignService = {
  load: async (kind) => ({ data: campaignSeed(kind), sample: true }),
  saveGeneral: async () => undefined,
  createRule: async (_kind, draft) => ({
    id: `yeni-${Math.random().toString(36).slice(2, 8)}`,
    ...draft,
  }),
  updateRule: async (_kind, id, draft) => ({ id, ...draft }),
  setRuleActive: async () => undefined,
  removeRule: async () => undefined,
};

export const useCampaignService = () => useDataService(campaignService, demoCampaignService);
