import { Check, ImagePlus, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { stockErrorMessage } from '../../stock/services/stock.service';
import { matchBrandByFile } from '../brand-name';
import type { Brand } from '../types';

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 2 * 1024 * 1024;

interface Entry {
  fileName: string;
  dataUrl: string | null;
  brand: Brand | null;
  problem: string | null;
}

interface BulkLogoSheetProps {
  brands: Brand[];
  /** Logoyu markaya kaydeder; hata olursa fırlatır. */
  onApply: (brand: Brand, dataUrl: string) => Promise<void>;
  onClose: () => void;
}

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('okunamadı'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

/**
 * Toplu logo: dosya adı marka adıyla eşleşen logolar (apple.png → Apple) tek seferde yüklenir.
 * Eşleşmeyen dosyalar atlanır; uygulamadan önce hangi dosyanın hangi markaya gideceği görünür.
 */
export function BulkLogoSheet({ brands, onApply, onClose }: BulkLogoSheetProps) {
  const input = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  const take = async (files: File[]) => {
    setError(null);
    setDoneCount(null);
    const next: Entry[] = [];
    for (const file of files) {
      const brand = matchBrandByFile(file.name, brands);
      let problem: string | null = null;
      let dataUrl: string | null = null;
      if (!TYPES.includes(file.type)) problem = 'Desteklenmeyen dosya türü';
      else if (file.size > MAX_BYTES) problem = 'En çok 2 MB olabilir';
      else if (!brand) problem = 'Eşleşen marka yok';
      else dataUrl = await readFile(file).catch(() => null);
      if (!problem && !dataUrl) problem = 'Dosya okunamadı';
      next.push({ fileName: file.name, dataUrl, brand, problem });
    }
    // Aynı markaya birden çok dosya geldiyse yalnızca ilki kullanılır.
    const seen = new Set<string>();
    for (const e of next) {
      if (e.problem || !e.brand) continue;
      if (seen.has(e.brand.id)) e.problem = 'Aynı marka için başka dosya var';
      seen.add(e.brand.id);
    }
    setEntries(next);
  };

  const ready = entries.filter((e) => !e.problem && e.brand && e.dataUrl);

  const apply = async () => {
    setBusy(true);
    setError(null);
    let done = 0;
    try {
      for (const e of ready) {
        await onApply(e.brand!, e.dataUrl!);
        done++;
      }
      setDoneCount(done);
      setEntries([]);
    } catch (e) {
      setError(`${done} logo yüklendi, sonra hata oluştu: ${stockErrorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="Toplu Logo Yükle"
      description="Dosya adı marka adıyla aynı olsun: apple.png → Apple"
    >
      <div className="flex flex-col gap-5">
        <input
          ref={input}
          type="file"
          multiple
          accept={TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-label="Logo dosyaları seç"
          onChange={(e) => {
            void take(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong/60 bg-surface-muted px-4 py-6 text-center font-semibold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-ink"
        >
          <ImagePlus className="size-7" aria-hidden="true" />
          Logo dosyalarını seç
          <span className="text-sm font-normal">PNG, JPG, WebP, SVG · en çok 2 MB</span>
        </button>

        {doneCount !== null ? (
          <Alert tone="info">{doneCount} markanın logosu güncellendi.</Alert>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {entries.length > 0 ? (
          <ul aria-label="Eşleşmeler" className="flex flex-col gap-2">
            {entries.map((e, i) => (
              <li
                key={`${e.fileName}-${i}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-2.5"
              >
                {e.dataUrl ? (
                  <img
                    src={e.dataUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-xl bg-surface-muted object-contain"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-muted">
                    <TriangleAlert className="size-5" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-muted">{e.fileName}</span>
                  {e.problem ? (
                    <span className="block text-sm font-semibold text-danger">
                      {e.problem} · atlanacak
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 truncate font-bold">
                      <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                      {e.brand!.name}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Button variant="ghost" flow={false} fullWidth={false} onClick={onClose}>
            Kapat
          </Button>
          <div className="flex-1">
            <Button
              flow={false}
              disabled={ready.length === 0}
              loading={busy}
              loadingLabel="Yükleniyor…"
              onClick={() => void apply()}
            >
              {ready.length > 0 ? `${ready.length} logoyu yükle` : 'Yükle'}
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
