import { CheckCircle2, FolderTree, Package, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { CatalogImage } from '../../../components/ui/CatalogImage';
import { PRODUCTS_PATH } from '../../../config/navigation';
import { DealBadge } from '../../deals/components/DealBadge';
import type { Deal, DealPosition, DealSize } from '../../deals/types';
import { blockTotals, formatMoney, marginPercent } from '../stock.calc';
import type { StockCardDraft, StockExtraOptions, StockExtras } from '../types';

interface StockSavedScreenProps {
  /** create/copy: yeni kart kaydedildi · edit: mevcut kart güncellendi. */
  mode: 'create' | 'edit' | 'copy';
  /** Deneme verisiyse veritabanına yazılmadığı açıkça söylenir. */
  demo: boolean;
  draft: StockCardDraft;
  /** Marka adı (taslakta yalnızca kimliği vardır). */
  brand: string;
  extras: StockExtras;
  /** `null`: kategori/fırsat/özellik sunucuya bağlı değil; o satırlar gösterilmez. */
  extraOptions: StockExtraOptions | null;
  onNew: () => void;
  onKeepEditing: () => void;
}

/** Rozetin ürün resmindeki yeri (kutunun içinde). */
const BADGE_PLACE: Record<DealPosition, string> = {
  tl: 'top-2 left-2',
  tc: 'top-2 left-1/2 -translate-x-1/2',
  tr: 'top-2 right-2',
  ml: 'top-1/2 left-2 -translate-y-1/2',
  mr: 'top-1/2 right-2 -translate-y-1/2',
  bl: 'bottom-2 left-2',
  bc: 'bottom-2 left-1/2 -translate-x-1/2',
  br: 'bottom-2 right-2',
};
const BADGE_SIZE: Record<DealSize, string> = {
  small: 'size-8',
  medium: 'size-11',
  large: 'size-14',
};

/** Etiket + değer satırı (etiket solda soluk, değer sağda). */
function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Package;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 text-left">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-ink">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <dt className="w-24 shrink-0 pt-1 text-sm font-semibold text-ink-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm font-semibold">{children}</dd>
    </div>
  );
}

/**
 * Kaydetme sonrası ekran: ürünün küçük bir önizlemesi. Solda ürün görseli yeri (seçilen fırsatın
 * rozeti, fırsatta ayarlı konumunda), sağda ad, kod/marka, satış ve alış fiyatı (iki çubukla
 * karşılaştırmalı, kâr oranıyla); altında kategori, fırsat ve özellikler (Renk: ● Siyah) alt alta.
 */
export function StockSavedScreen({
  mode,
  demo,
  draft,
  brand,
  extras,
  extraOptions,
  onNew,
  onKeepEditing,
}: StockSavedScreenProps) {
  const navigate = useNavigate();
  const editing = mode === 'edit';
  const title = demo
    ? 'Deneme tamamlandı!'
    : editing
      ? 'Stok kartı güncellendi!'
      : 'Stok kartı kaydedildi!';
  const detail = [draft.code, brand].filter(Boolean).join(' · ');

  // Fiyat: ilk fiyat listesinin ana birimi.
  const firstList = Object.keys(draft.units)[0];
  const rows = (firstList ? draft.units[firstList] : undefined) ?? [];
  const row = rows.find((r) => r.isMain) ?? rows[0];
  const sale = row && row.sale.amount !== '' ? blockTotals(row.sale) : null;
  const buy = row && row.purchase.amount !== '' ? blockTotals(row.purchase) : null;
  const saleCurrency = row?.sale.currency ?? 'TRY';
  const buyCurrency = row?.purchase.currency ?? 'TRY';
  const margin = row ? marginPercent(row) : null;
  const sameCurrency = saleCurrency === buyCurrency;
  const top = Math.max(sale?.incl ?? 0, buy?.incl ?? 0);

  // Seçimler
  const categories = (extraOptions?.categories ?? []).filter((c) =>
    extras.categoryIds.includes(c.id),
  );
  const deals: Deal[] = (extraOptions?.deals ?? []).filter((d) => extras.dealIds.includes(d.id));
  const badgeDeal = deals.find((d) => d.iconUrl && d.showOnImage);
  const attributes = extraOptions?.attributes;
  const attributeRows = attributes
    ? attributes.groups
        .map((group) => ({
          group,
          values: attributes.values.filter(
            (v) => v.groupId === group.id && (extras.attributeValueIds ?? []).includes(v.id),
          ),
        }))
        .filter((r) => r.values.length > 0)
    : [];
  const hasDetails = categories.length > 0 || deals.length > 0 || attributeRows.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-xl animate-pop flex-col items-center gap-5 rounded-[1.75rem] bg-surface-raised px-4 py-8 text-center shadow-soft sm:px-8 sm:py-12">
      <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-extrabold">{title}</p>
        {demo ? (
          <p className="text-sm text-ink-muted">Deneme verisi veritabanına kaydedilmedi.</p>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-1 rounded-3xl border border-line bg-surface p-3 text-left sm:p-4">
        <div className="grid grid-cols-[7rem_1fr] items-center gap-4 sm:grid-cols-[9rem_1fr]">
          {/* Ürün önizlemesi: görsel yeri + fırsat rozeti */}
          <div
            aria-label="Ürün önizlemesi"
            className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-surface-muted to-brand-50"
          >
            <Package className="size-1/3 text-brand-ink/30" aria-hidden="true" />
            {badgeDeal?.iconUrl ? (
              <span className={`absolute ${BADGE_PLACE[badgeDeal.position]}`}>
                <DealBadge url={badgeDeal.iconUrl} className={BADGE_SIZE[badgeDeal.size]} />
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="min-w-0">
              <p className="line-clamp-2 text-lg leading-snug font-extrabold">
                {draft.name || draft.code || 'Yeni ürün'}
              </p>
              {detail ? <p className="truncate text-sm text-ink-muted">{detail}</p> : null}
            </div>
            {sale ? (
              <div>
                <p className="text-2xl font-extrabold tracking-tight text-brand-ink">
                  {formatMoney(sale.incl, saleCurrency)}
                </p>
                <p className="text-xs text-ink-muted">
                  KDV Hariç {formatMoney(sale.excl, saleCurrency)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Satış fiyatı girilmedi</p>
            )}
          </div>
        </div>

        {/* Alış / satış karşılaştırması */}
        {sale || buy ? (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-surface-muted/70 p-3">
            {[
              { name: 'Satış', value: sale?.incl, currency: saleCurrency, tone: 'bg-brand-600' },
              { name: 'Alış', value: buy?.incl, currency: buyCurrency, tone: 'bg-line-strong' },
            ].map((bar) =>
              bar.value === undefined ? null : (
                <div key={bar.name} className="flex items-center gap-3 text-sm">
                  <span className="w-10 shrink-0 font-semibold text-ink-muted">{bar.name}</span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface">
                    <span
                      className={`block h-full rounded-full ${bar.tone}`}
                      style={{
                        width: `${sameCurrency && top > 0 ? Math.max(6, (bar.value / top) * 100) : 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-28 shrink-0 text-right font-bold">
                    {formatMoney(bar.value, bar.currency)}
                  </span>
                </div>
              ),
            )}
            {margin !== null ? (
              <p className="self-end rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success">
                %{margin.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} kâr
              </p>
            ) : null}
          </div>
        ) : null}

        {hasDetails ? (
          <dl className="mt-2 divide-y divide-line">
            {categories.length > 0 ? (
              <Row icon={FolderTree} label="Kategori">
                <span className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-brand-50 px-2.5 py-0.5 text-brand-ink"
                    >
                      {c.name}
                    </span>
                  ))}
                </span>
              </Row>
            ) : null}
            {deals.length > 0 ? (
              <Row icon={Sparkles} label="Fırsat">
                <span className="flex flex-wrap gap-x-3 gap-y-1.5">
                  {deals.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1.5">
                      {d.iconUrl ? <DealBadge url={d.iconUrl} className="size-5" /> : null}
                      {d.name}
                    </span>
                  ))}
                </span>
              </Row>
            ) : null}
            {attributeRows.length > 0 ? (
              <Row icon={SlidersHorizontal} label="Özellikler">
                <ul className="flex flex-col gap-1.5">
                  {attributeRows.map(({ group, values }) => (
                    <li key={group.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-ink-muted">{group.name}:</span>
                      {values.map((v) => (
                        <span key={v.id} className="inline-flex items-center gap-1.5">
                          {group.kind === 'color' ? (
                            <span
                              aria-hidden="true"
                              className="size-3.5 rounded-full ring-1 ring-black/20"
                              style={{ backgroundColor: v.color ?? '#9ca3af' }}
                            />
                          ) : null}
                          {group.kind === 'image' && v.imageUrl ? (
                            <CatalogImage
                              page="attributes"
                              src={v.imageUrl}
                              alt=""
                              className="size-4 rounded bg-white object-contain"
                            />
                          ) : null}
                          {v.name}
                        </span>
                      ))}
                    </li>
                  ))}
                </ul>
              </Row>
            ) : null}
          </dl>
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-3">
        {editing ? (
          <>
            <Button flow={false} onClick={() => navigate(PRODUCTS_PATH)}>
              Ürünlere Dön
            </Button>
            <Button variant="outline" flow={false} onClick={onKeepEditing}>
              Düzenlemeye Devam Et
            </Button>
          </>
        ) : (
          <>
            <Button flow={false} onClick={onNew}>
              Yeni Stok Kartı
            </Button>
            <Link
              to={PRODUCTS_PATH}
              className="inline-flex min-h-12 items-center justify-center rounded-full font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              Ürünlere Dön
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
