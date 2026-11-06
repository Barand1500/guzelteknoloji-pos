import { CheckCircle2, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { PRODUCTS_PATH, stockEditPath } from '../../../config/navigation';

interface StockSavedScreenProps {
  /** create/copy: yeni kart kaydedildi · edit: mevcut kart güncellendi. */
  mode: 'create' | 'edit' | 'copy';
  /** Deneme verisiyse veritabanına yazılmadığı açıkça söylenir. */
  demo: boolean;
  name: string;
  code: string;
  brand: string;
  /** Kaydedilen kartın kimliği ("Ayrıntıları Doldur" bu karta gider). */
  savedId: string | null;
  onNew: () => void;
  onKeepEditing: () => void;
}

/**
 * Kaydetme sonrası ekran. Yeni kartta asıl yol "Ayrıntıları Doldur"dur: kategori, görsel, fırsat,
 * özellik, açıklama gibi ek bilgiler ekleme formunu kalabalıklaştırmasın diye kayıttan SONRA
 * düzenleme ekranında doldurulur. Hızlı gidenler yeni kart ekleyebilir ya da listeye döner.
 */
export function StockSavedScreen({
  mode,
  demo,
  name,
  code,
  brand,
  savedId,
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
            {savedId ? (
              <div className="flex flex-col gap-1.5">
                <Button flow={false} onClick={() => navigate(stockEditPath(savedId))}>
                  Ayrıntıları Doldur
                </Button>
                <p className="text-sm text-ink-muted">
                  Kategori, görsel, fırsat, özellik ve açıklamayı şimdi ya da sonra ekleyebilirsin.
                </p>
              </div>
            ) : null}
            <Button variant="outline" flow={false} onClick={onNew}>
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
