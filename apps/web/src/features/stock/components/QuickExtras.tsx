import { ChevronDown, Sparkles, Tag } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { DEALS_PATH } from '../../../config/navigation';
import { DealBadge } from '../../deals/components/DealBadge';
import type { StockEditor } from '../hooks/useStockEditor';

type Open = 'deal' | 'attr' | null;

/** Etiket çipi: seçiliyken dolu, değilken çerçeveli; içinde simge + ad. */
function Pill({
  on,
  role,
  label,
  onClick,
  children,
}: {
  on: boolean;
  role: 'switch' | 'checkbox';
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={[
        'inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-all duration-200 active:scale-95',
        on
          ? 'border-brand-700 bg-brand-700 text-white shadow-soft'
          : 'border-line bg-surface text-ink hover:border-brand-500',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** Altı çizili, eğik yazılı satır içi bağlantı (açıkken vurgulanır, yanında seçili sayısı durur). */
function InlineLink({
  open,
  count,
  controls,
  onClick,
  preview,
  children,
}: {
  open: boolean;
  count: number;
  controls: string;
  onClick: () => void;
  /** Kapalıyken üzerine gelince (ya da odaklanınca) görünen özet; seçim yoksa verilmez. */
  preview?: React.ReactNode;
  children: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={controls}
        onClick={onClick}
        className={[
          'inline-flex items-center gap-1.5 rounded-md italic underline underline-offset-[5px] transition-colors',
          open
            ? 'font-semibold text-brand-700 decoration-brand-700 decoration-2'
            : 'text-ink-muted decoration-line-strong decoration-1 hover:text-brand-700 hover:decoration-brand-700',
        ].join(' ')}
      >
        {children}
        {count > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 text-xs font-bold text-white not-italic no-underline">
            {count}
          </span>
        ) : null}
      </button>
      {hover && !open && preview ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-max max-w-[18rem] animate-fade-in rounded-2xl border border-line bg-surface-raised p-3 text-left not-italic shadow-card"
        >
          {preview}
        </div>
      ) : null}
    </span>
  );
}

/**
 * Ürün Bilgisi kartının en altındaki sessiz satır: "Fırsat ekle / Özellik ekle". Satır varsayılan
 * olarak tek satırlık, altı çizili eğik bir yazıdır; dokununca altında ilgili seçim alanı yumuşakça
 * açılır (yan panel yok). Fırsatlar etiket çipleridir, özellikler gruplarına göre sıralı çiplerdir;
 * her çip tek dokunuşla açılıp kapanır ve karta anında eklenir. Seçili sayısı bağlantının yanında durur.
 */
export function QuickExtras({ editor }: { editor: StockEditor }) {
  const [open, setOpen] = useState<Open>(null);
  // Özellik grupları başta KAPALI gelir; kullanıcı istediğini açar.
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const toggleGroup = (id: string) =>
    setOpenGroups((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const baseId = useId();
  const options = editor.extraOptions;
  const { dealIds, attributeValueIds = [], categoryIds } = editor.extras;

  const attributes = options?.attributes;
  // Kategoriye uygun şablonlar, tüm ürünlere açık olanlar ve içinde zaten seçili değer bulunanlar.
  const templates = useMemo(() => {
    if (!attributes) return [];
    return attributes.templates.filter(
      (t) =>
        t.allProducts ||
        t.categoryIds.some((id) => categoryIds.includes(id)) ||
        attributes.groups.some(
          (g) =>
            g.templateId === t.id &&
            attributes.values.some((v) => v.groupId === g.id && attributeValueIds.includes(v.id)),
        ),
    );
  }, [attributes, categoryIds, attributeValueIds]);

  if (!options) return null;

  const deals = options.deals.filter((d) => d.active || dealIds.includes(d.id));

  // Kapalıyken üzerine gelince görünen özetler: "Fırsat: ikon + ad", "Renk: ● Siyah".
  const chosenDeals = options.deals.filter((d) => dealIds.includes(d.id));
  const chosenAttrs = attributes
    ? attributes.groups
        .map((group) => ({
          group,
          values: attributes.values.filter(
            (v) => v.groupId === group.id && attributeValueIds.includes(v.id),
          ),
        }))
        .filter((g) => g.values.length > 0)
    : [];
  const dealPreview =
    chosenDeals.length > 0 ? (
      <ul aria-label="Seçili fırsatlar" className="flex flex-col gap-1.5 text-sm font-semibold">
        {chosenDeals.map((d) => (
          <li key={d.id} className="flex items-center gap-2">
            {d.iconUrl ? (
              <DealBadge url={d.iconUrl} className="size-5" />
            ) : (
              <Tag className="size-4 shrink-0 opacity-70" aria-hidden="true" />
            )}
            {d.name}
          </li>
        ))}
      </ul>
    ) : undefined;
  const attrPreview =
    chosenAttrs.length > 0 ? (
      <ul aria-label="Seçili özellikler" className="flex flex-col gap-1.5 text-sm">
        {chosenAttrs.map(({ group, values }) => (
          <li key={group.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-ink-muted">{group.name}:</span>
            {values.map((v) => (
              <span key={v.id} className="inline-flex items-center gap-1.5 font-semibold">
                {group.kind === 'color' ? (
                  <span
                    aria-hidden="true"
                    className="size-3.5 rounded-full ring-1 ring-black/20"
                    style={{ backgroundColor: v.color ?? '#9ca3af' }}
                  />
                ) : null}
                {group.kind === 'image' && v.imageUrl ? (
                  <img src={v.imageUrl} alt="" className="size-4 rounded bg-white object-contain" />
                ) : null}
                {v.name}
              </span>
            ))}
          </li>
        ))}
      </ul>
    ) : undefined;
  const toggle = (which: Exclude<Open, null>) => setOpen((o) => (o === which ? null : which));
  const dealPanel = `${baseId}-firsat`;
  const attrPanel = `${baseId}-ozellik`;

  return (
    <div className="col-span-full flex flex-col gap-3 border-t border-dashed border-line pt-4">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Sparkles className="size-4 text-brand-600" aria-hidden="true" />
        <InlineLink
          open={open === 'deal'}
          count={dealIds.length}
          controls={dealPanel}
          onClick={() => toggle('deal')}
          preview={dealPreview}
        >
          Fırsat ekle
        </InlineLink>
        <span aria-hidden="true" className="text-ink-muted">
          /
        </span>
        <InlineLink
          open={open === 'attr'}
          count={attributeValueIds.length}
          controls={attrPanel}
          onClick={() => toggle('attr')}
          preview={attrPreview}
        >
          Özellik ekle
        </InlineLink>
      </p>

      {open === 'deal' ? (
        <div id={dealPanel} className="animate-fade-in rounded-2xl bg-surface-muted/70 p-3">
          {deals.length === 0 ? (
            <p className="px-1 text-sm text-ink-muted">
              Henüz fırsat yok.{' '}
              <Link to={DEALS_PATH} className="font-semibold text-brand-ink underline">
                Fırsatlar ekranından
              </Link>{' '}
              ekleyebilirsin.
            </p>
          ) : (
            <ul aria-label="Fırsatlar" className="flex flex-wrap gap-2">
              {deals.map((deal) => (
                <li key={deal.id}>
                  <Pill
                    on={dealIds.includes(deal.id)}
                    role="switch"
                    label={`${deal.name} fırsatı`}
                    onClick={() => editor.toggleDeal(deal.id)}
                  >
                    {deal.iconUrl ? (
                      <DealBadge url={deal.iconUrl} className="size-5" />
                    ) : (
                      <Tag className="size-4 shrink-0 opacity-70" aria-hidden="true" />
                    )}
                    {deal.name}
                    {deal.active ? null : <span className="text-xs opacity-70">(pasif)</span>}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {open === 'attr' ? (
        <div
          id={attrPanel}
          className="flex animate-fade-in flex-col gap-4 rounded-2xl bg-surface-muted/70 p-3"
        >
          {templates.length === 0 ? (
            <p className="px-1 text-sm text-ink-muted">
              Bu ürüne uygun özellik yok. Kategori seçince o kategorinin özellikleri burada çıkar.
            </p>
          ) : (
            templates.map((template) => (
              <section key={template.id} aria-label={template.name} className="flex flex-col gap-3">
                {attributes!.groups
                  .filter((g) => g.templateId === template.id)
                  .map((group) => {
                    const values = attributes!.values.filter((v) => v.groupId === group.id);
                    const chosen = values.filter((v) => attributeValueIds.includes(v.id));
                    const isOpen = openGroups.includes(group.id);
                    return (
                      <div key={group.id} className="rounded-2xl border border-line bg-surface">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => toggleGroup(group.id)}
                          className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 text-left"
                        >
                          <span className="text-sm font-bold">{group.name}</span>
                          {/* Kapalıyken seçilenler küçük özet olarak görünür */}
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-ink-muted">
                            {!isOpen
                              ? chosen.slice(0, 3).map((v) => (
                                  <span
                                    key={v.id}
                                    className="inline-flex min-w-0 items-center gap-1"
                                  >
                                    {group.kind === 'color' ? (
                                      <span
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0 rounded-full ring-1 ring-black/20"
                                        style={{ backgroundColor: v.color ?? '#9ca3af' }}
                                      />
                                    ) : null}
                                    <span className="truncate">{v.name}</span>
                                  </span>
                                ))
                              : null}
                            {!isOpen && chosen.length > 3 ? (
                              <span>+{chosen.length - 3}</span>
                            ) : null}
                          </span>
                          {chosen.length > 0 ? (
                            <span className="rounded-full bg-brand-700 px-2 text-xs font-bold text-white">
                              {chosen.length}
                            </span>
                          ) : null}
                          <ChevronDown
                            aria-hidden="true"
                            className={`size-5 shrink-0 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isOpen ? (
                          <ul
                            role="group"
                            aria-label={group.name}
                            className="flex animate-fade-in flex-wrap gap-2 px-3.5 pb-3.5"
                          >
                            {values.map((value) => (
                              <li key={value.id}>
                                <Pill
                                  on={attributeValueIds.includes(value.id)}
                                  role="checkbox"
                                  label={value.name}
                                  onClick={() =>
                                    editor.toggleAttribute(
                                      value.id,
                                      group.id,
                                      group.multiple || group.variant,
                                    )
                                  }
                                >
                                  {group.kind === 'color' ? (
                                    <span
                                      aria-hidden="true"
                                      className="size-4 shrink-0 rounded-full ring-1 ring-black/20"
                                      style={{ backgroundColor: value.color ?? '#9ca3af' }}
                                    />
                                  ) : null}
                                  {group.kind === 'image' && value.imageUrl ? (
                                    <img
                                      src={value.imageUrl}
                                      alt=""
                                      className="size-5 shrink-0 rounded-md bg-white object-contain"
                                    />
                                  ) : null}
                                  {value.name}
                                </Pill>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
              </section>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
