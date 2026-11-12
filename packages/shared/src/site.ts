import { z } from 'zod';

/** E-ticaret ayar ekranlarının ortak sözleşmesi (sayfa, menü, slider, widget, değişken, görsel). */

export const SITE_LEGAL_TYPES = [
  'yok',
  'kvkk',
  'uyelik',
  'mesafeli',
  'on-bilgilendirme',
  'tahsilat',
  'teslimat',
] as const;
export type SiteLegalType = (typeof SITE_LEGAL_TYPES)[number];

export const sitePageDraftSchema = z.strictObject({
  title: z.string().trim().min(1, 'Sayfa adı gerekli.').max(120),
  slug: z
    .string()
    .trim()
    .min(1, 'Bağlantı gerekli.')
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Yalnızca küçük harf, rakam ve tire kullanın.'),
  content: z.string().max(200_000),
  legal: z.enum(SITE_LEGAL_TYPES),
  published: z.boolean(),
  order: z.number().int().min(0).max(9999),
});
export type SitePageDraftInput = z.infer<typeof sitePageDraftSchema>;

export const MENU_GROUPS = ['ust', 'alt', 'alt1', 'alt2', 'alt3'] as const;
export type MenuGroup = (typeof MENU_GROUPS)[number];

export const menuEntryDraftSchema = z.strictObject({
  group: z.enum(MENU_GROUPS),
  label: z.string().trim().min(1, 'Menü adı gerekli.').max(120),
  url: z.string().trim().max(300),
  newTab: z.boolean(),
  active: z.boolean(),
  order: z.number().int().min(0).max(9999),
});
export type MenuEntryDraftInput = z.infer<typeof menuEntryDraftSchema>;

export const sliderDraftSchema = z.strictObject({
  title: z.string().trim().min(1, 'Başlık gerekli.').max(120),
  description: z.string().max(2000),
  link: z.string().trim().max(300),
  active: z.boolean(),
  order: z.number().int().min(0).max(9999),
  imageId: z.string().regex(/^\d+$/).nullable(),
});
export type SliderDraftInput = z.infer<typeof sliderDraftSchema>;

export const WIDGET_TYPES = [
  'slider',
  'banner',
  'kategori',
  'urun-raflari',
  'duyuru',
  'metin',
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const widgetDraftSchema = z.strictObject({
  name: z.string().trim().min(1, 'Widget adı gerekli.').max(120),
  type: z.enum(WIDGET_TYPES),
  title: z.string().trim().max(120),
  visible: z.boolean(),
  order: z.number().int().min(0).max(9999),
  /** Widget görseli (site görselleri tablosundaki kimlik); yoksa null. */
  imageId: z.string().regex(/^\d+$/).nullable(),
  settings: z.record(z.string(), z.string().max(2000)),
});
export type WidgetDraftInput = z.infer<typeof widgetDraftSchema>;

export const TEMPLATE_TYPES = ['E-Posta', 'Sms'] as const;
export const templateVariableDraftSchema = z.strictObject({
  name: z.string().trim().min(1, 'Görünen ad gerekli.').max(120),
  type: z.enum(TEMPLATE_TYPES),
  module: z.string().trim().min(1, 'Modül gerekli.').max(60),
  description: z.string().trim().max(1000),
  fields: z
    .array(
      z.strictObject({
        column: z.string().trim().max(120),
        code: z.string().trim().max(120),
      }),
    )
    .max(50),
});
export type TemplateVariableDraftInput = z.infer<typeof templateVariableDraftSchema>;

export const IMAGE_KINDS = [
  'logo',
  'favicon',
  'popup',
  'kampanya',
  'slider',
  'widget',
  'stok',
] as const;
export type SiteImageKind = (typeof IMAGE_KINDS)[number];
export const siteImageKindSchema = z.enum(IMAGE_KINDS);

export const siteImageUploadSchema = z.strictObject({
  kind: z.enum(IMAGE_KINDS),
  /** data:image/png;base64,... — en çok ~3 MB. */
  dataUrl: z.string().min(30).max(4_500_000),
});

/**
 * Sürükle-bırak sonrası toplu sıralama: kimlikler yeni sırayla gönderilir.
 * Tek istekte yazılır; yarım kalan sıra (bazı satırlar güncellenip bazıları kalmış) oluşmaz.
 */
export const siteReorderSchema = z.strictObject({
  ids: z.array(z.string().regex(/^\d+$/, 'Geçersiz kayıt kimliği.')).min(1).max(500),
});
export type SiteReorderInput = z.infer<typeof siteReorderSchema>;

export interface SitePageDto {
  id: string;
  title: string;
  slug: string;
  content: string;
  legal: SiteLegalType;
  published: boolean;
  order: number;
}
export interface MenuEntryDto {
  id: string;
  group: MenuGroup;
  label: string;
  url: string;
  newTab: boolean;
  active: boolean;
  order: number;
}
export interface SliderDto {
  id: string;
  title: string;
  description: string;
  link: string;
  active: boolean;
  order: number;
  imageId: string | null;
  imageUrl: string | null;
}
export interface WidgetDto {
  id: string;
  name: string;
  type: WidgetType;
  title: string;
  visible: boolean;
  order: number;
  imageId: string | null;
  imageUrl: string | null;
  settings: Record<string, string>;
}
export interface TemplateFieldDto {
  id: string;
  column: string;
  code: string;
}
export interface TemplateVariableDto {
  id: string;
  name: string;
  type: (typeof TEMPLATE_TYPES)[number];
  module: string;
  description: string;
  fields: TemplateFieldDto[];
}
export type SiteWidgetiSettings = Record<string, string>;

export interface SiteImageDto {
  id: string;
  kind: SiteImageKind;
  url: string;
}
