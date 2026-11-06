import { CheckCircle2, ChevronRight, FolderTree, Package, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { PRODUCTS_PATH, stockEditPath } from '../../../config/navigation';
import type { StockExtraOptions, StockExtras } from '../types';
import type { SideBoxId } from './StockSidePanel';

interface StockSavedScreenProps {
  /** create/copy: yeni kart kaydedildi · edit: mevcut kart güncellendi. */
  mode: 'create' | 'edit' | 'copy';
  /** Deneme verisiyse veritabanına yazılmadığı açıkça söylenir. */
  demo: boolean;
  name: string;
  code: string;
  brand: string;
  /** Kaydedilen kartın kimliği (bölüm kartları bu kartın düzenleme ekranına gider). */
  savedId: string | null;
  extras: StockExtras;
  /** `null`: kategori/fırsat henüz sunucuya bağlı değil; bölüm kartları gösterilmez. */
  extraOptions: StockExtraOptions | null;
  onNew: () => void;
  onKeepEditing: () => void;
}

/**
 * Kaydetme sonrası ekran. Yeni kartta formu kalabalıklaştırmamak için kategori ve fırsat gibi ek
 * bilgiler kayıttan SONRA doldurulur: kartlar neyi doldurabileceğini ve şu anki durumunu gösterir,
 * dokununca düzenleme ekranında ilgili yan kutu açık gelir. Hızlı gidenler yeni kart ekler.
 */
export function StockSavedScreen({
  mode,
  demo,
  name,
  code,
  brand,
  savedId,
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
  const detail = [code, brand].filter(Boolean).join(' · ');

  const sections: {
    id: SideBoxId;
    title: string;
    hint: string;
    state: string;
    icon: typeof Package;
  }[] = [
    {
      id: 'kategori',
      title: 'Kategori',
      hint: 'Ürün hangi kategorilerde görünsün?',
      state: extras.categoryIds.length === 0 ? 'Boş' : `${extras.categoryIds.length} kategori`,
      icon: FolderTree,
    },
    {
      id: 'firsat',
      title: 'Fırsat Yönetimi',
      hint: 'Yeni, İndirim gibi rozetler',
      state: extras.dealIds.length === 0 ? 'Boş' : `${extras.dealIds.length} fırsat`,
      icon: Sparkles,
    },
  ];
  const showSections = !editing && savedId !== null && extraOptions !== null;

  return (
    <div className="mx-auto flex w-full max-w-xl animate-pop flex-col items-center gap-5 rounded-[1.75rem] bg-surface-raised px-5 py-10 text-center shadow-soft sm:px-8 sm:py-14">
      <CheckCircle2 className="size-16 text-success" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-extrabold">{title}</p>
        {demo ? (
          <p className="text-sm text-ink-muted">Deneme verisi veritabanına kaydedilmedi.</p>
        ) : null}
      </div>

      <div className="flex w-full items-center gap-3 rounded-3xl bg-surface-muted p-3 text-left">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-ink">
          <Package className="size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold">{name || code || 'Yeni ürün'}</span>
          {detail ? <span className="block truncate text-sm text-ink-muted">{detail}</span> : null}
        </span>
      </div>

      {showSections ? (
        <div className="flex w-full flex-col gap-2 text-left">
          <p className="px-1 text-xs font-bold tracking-wide text-ink-muted uppercase">
            İstersen şimdi doldur
          </p>
          <ul className="flex flex-col gap-2">
            {sections.map((section) => (
              <li key={section.id}>
                <Link
                  to={stockEditPath(savedId, section.id)}
                  className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-brand-500"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-ink">
                    <section.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{section.title}</span>
                    <span className="block truncate text-sm text-ink-muted">{section.hint}</span>
                  </span>
                  <span
                    className={[
                      'rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
                      section.state === 'Boş'
                        ? 'bg-brand-50 text-brand-ink'
                        : 'bg-success-soft text-success',
                    ].join(' ')}
                  >
                    {section.state}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
