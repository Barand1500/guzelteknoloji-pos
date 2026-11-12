import { apiRequest } from '../../../lib/http';
import type {
  MenuEntryDto,
  MenuEntryDraftInput,
  SettingsResult,
  SitePageDto,
  SitePageDraftInput,
  SliderDto,
  SliderDraftInput,
  TemplateVariableDto,
  TemplateVariableDraftInput,
  WidgetDto,
  WidgetDraftInput,
} from '@gt/shared';

const base = '/api/site';
const enc = encodeURIComponent;

/** E-ticaret ayarlarının gerçek API katmanı. Demo oturumunda ekranlar yerel veriyle çalışır. */
export const siteService = {
  // ── Ayar bölümleri (mevcut hesap ayarları uçları) ──────────────────────────
  loadSettings: (section: string) =>
    apiRequest<SettingsResult>(`/api/hesap/ayarlar/${enc(section)}`),
  saveSettings: (section: string, values: Record<string, string>) =>
    apiRequest<SettingsResult>(`/api/hesap/ayarlar/${enc(section)}`, {
      method: 'POST',
      body: { values },
    }),

  // ── Sayfalar ──────────────────────────────────────────────────────────────
  pages: () => apiRequest<SitePageDto[]>(`${base}/sayfalar`),
  savePage: (draft: SitePageDraftInput, id?: string) =>
    apiRequest<SitePageDto>(id ? `${base}/sayfalar/${enc(id)}` : `${base}/sayfalar`, {
      method: 'POST',
      body: draft,
    }),
  deletePage: (id: string) =>
    apiRequest<void>(`${base}/sayfalar/${enc(id)}/sil`, { method: 'POST' }),
  /** Sürükle-bırak sonrası yeni sıra tek istekte yazılır (yarım sıra kalmaz). */
  reorderPages: (ids: string[]) =>
    apiRequest<void>(`${base}/sayfalar/sirala`, { method: 'POST', body: { ids } }),

  // ── Menü ──────────────────────────────────────────────────────────────────
  menu: () => apiRequest<MenuEntryDto[]>(`${base}/menu`),
  saveMenu: (draft: MenuEntryDraftInput, id?: string) =>
    apiRequest<MenuEntryDto>(id ? `${base}/menu/${enc(id)}` : `${base}/menu`, {
      method: 'POST',
      body: draft,
    }),
  deleteMenu: (id: string) => apiRequest<void>(`${base}/menu/${enc(id)}/sil`, { method: 'POST' }),
  reorderMenu: (ids: string[]) =>
    apiRequest<void>(`${base}/menu/sirala`, { method: 'POST', body: { ids } }),

  // ── Sliderlar ─────────────────────────────────────────────────────────────
  sliders: () => apiRequest<SliderDto[]>(`${base}/sliderlar`),
  saveSlider: (draft: SliderDraftInput, id?: string) =>
    apiRequest<SliderDto>(id ? `${base}/sliderlar/${enc(id)}` : `${base}/sliderlar`, {
      method: 'POST',
      body: draft,
    }),
  deleteSlider: (id: string) =>
    apiRequest<void>(`${base}/sliderlar/${enc(id)}/sil`, { method: 'POST' }),
  reorderSliders: (ids: string[]) =>
    apiRequest<void>(`${base}/sliderlar/sirala`, { method: 'POST', body: { ids } }),

  // ── Widgetlar ─────────────────────────────────────────────────────────────
  widgets: () => apiRequest<WidgetDto[]>(`${base}/widgetlar`),
  saveWidget: (draft: WidgetDraftInput, id?: string) =>
    apiRequest<WidgetDto>(id ? `${base}/widgetlar/${enc(id)}` : `${base}/widgetlar`, {
      method: 'POST',
      body: draft,
    }),
  deleteWidget: (id: string) =>
    apiRequest<void>(`${base}/widgetlar/${enc(id)}/sil`, { method: 'POST' }),
  reorderWidgets: (ids: string[]) =>
    apiRequest<void>(`${base}/widgetlar/sirala`, { method: 'POST', body: { ids } }),

  // ── Şablon değişkenleri ───────────────────────────────────────────────────
  variables: () => apiRequest<TemplateVariableDto[]>(`${base}/sablon-degiskenleri`),
  saveVariable: (draft: TemplateVariableDraftInput, id?: string) =>
    apiRequest<TemplateVariableDto>(
      id ? `${base}/sablon-degiskenleri/${enc(id)}` : `${base}/sablon-degiskenleri`,
      { method: 'POST', body: draft },
    ),
  deleteVariable: (id: string) =>
    apiRequest<void>(`${base}/sablon-degiskenleri/${enc(id)}/sil`, { method: 'POST' }),

  // ── Görseller ─────────────────────────────────────────────────────────────
  uploadRootFile: (name: string, dataUrl: string) =>
    apiRequest<{ name: string }>(`${base}/kok-dosya`, {
      method: 'POST',
      body: { name, dataUrl },
    }),

  uploadImage: (kind: string, dataUrl: string) =>
    apiRequest<{ id: string; kind: string; url: string }>(`${base}/gorseller`, {
      method: 'POST',
      body: { kind, dataUrl },
    }),
};

/** Dosyayı Base64 veri adresine çevirir (görsel yüklemeden önce). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}
