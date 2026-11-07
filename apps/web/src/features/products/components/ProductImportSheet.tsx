import { Download, FileSpreadsheet } from 'lucide-react';
import { useRef, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { IMPORT_COLUMNS, sampleImportCsv } from '../import.csv';
import { useProductService } from '../services/product.service';
import { dataError } from '../../../lib/catalog-data';
import { WizardSteps } from './WizardSteps';
import type { ImportPreview, ImportRow } from '../types';

interface ProductImportSheetProps {
  onDone: (result: { created: number; updated: number; errors?: string[] }) => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3;
type Preview = ImportPreview & { missingColumns: string[] };

const STEPS = ['Hazırla', 'Yükle', 'Onayla'] as const;
const MAX_LISTED = 60;

const readText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsText(file, 'utf-8');
  });

async function readImportFile(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Dosya en fazla 5 MB olabilir.');
  if (/\.csv$/i.test(file.name)) return readText(file);
  if (!/\.xlsx$/i.test(file.name)) throw new Error('CSV veya XLSX dosyası seçin.');
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Dosyada çalışma sayfası bulunamadı.');
  if (sheet.rowCount > 1001 || sheet.columnCount > 100)
    throw new Error('Dosyada en fazla 1000 ürün ve 100 sütun olabilir.');
  const rows: string[] = [];
  for (let row = 1; row <= sheet.rowCount; row++) {
    const cells: string[] = [];
    for (let column = 1; column <= sheet.columnCount; column++) {
      const value = sheet.getRow(row).getCell(column).text;
      cells.push('"' + value.replace(/"/g, '""') + '"');
    }
    rows.push(cells.join(';'));
  }
  return rows.join('\n');
}

const STATUS_STYLE: Record<ImportRow['status'], { label: string; cls: string }> = {
  new: { label: 'Yeni', cls: 'bg-success-soft text-success' },
  update: { label: 'Güncelle', cls: 'bg-accent-soft text-ink' },
  error: { label: 'Hata', cls: 'bg-danger-soft text-danger' },
};

/**
 * Excel ile ürün yükleme sihirbazı: 1) örnek dosyayı indir 2) dosyayı yükle 3) önizle ve
 * onayla. Önizlemede hangi satırın doğru/yanlış olduğu görülür; onaylayınca yalnızca doğru
 * satırlar kaydedilir, hatalılar atlanır.
 */
export function ProductImportSheet({ onDone, onClose }: ProductImportSheetProps) {
  const productService = useProductService();
  const [step, setStep] = useState<Step>(1);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const downloadSample = () => {
    const url = URL.createObjectURL(
      new Blob([sampleImportCsv()], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'urun-yukleme-ornek.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setText('');
    setFileName('');
    try {
      setText(await readImportFile(file));
      setFileName(file.name);
    } catch (error) {
      setError(dataError(error));
    }
  };

  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await productService.previewImport(text);
      setBusy(false);
      if (result.missingColumns.length > 0) {
        setError(`Dosyada şu sütunlar yok: ${result.missingColumns.join(', ')}.`);
        return;
      }
      if (result.rows.length === 0) {
        setError('Dosyada okunacak ürün satırı bulunamadı.');
        return;
      }
      setPreview(result);
      setStep(3);
    } catch (error) {
      setError(dataError(error));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await productService.commitImport(text);
      setBusy(false);
      if ('errors' in result && result.errors?.length)
        setError(result.errors.slice(0, 5).join(' · '));
      onDone(result);
    } catch (error) {
      setError(dataError(error));
    } finally {
      setBusy(false);
    }
  };

  const saveCount = preview ? preview.newCount + preview.updateCount : 0;
  // Hatalılar önce görünür; çok satırda liste kısaltılır.
  const listed = preview
    ? [...preview.rows].sort((a, b) => Number(b.status === 'error') - Number(a.status === 'error'))
    : [];

  return (
    <Sheet open onClose={onClose} title="Excel ile Ürün Yükle" size="lg">
      <div className="flex flex-col gap-5">
        <WizardSteps steps={STEPS} current={step} />

        {error ? <Alert tone="error">{error}</Alert> : null}

        {step === 1 ? (
          <>
            <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface-raised p-4">
              <p className="font-bold">Örnek dosyayı indir</p>
              <p className="text-sm text-ink-muted">
                Dosyayı kendi ürünlerinle doldur, ilk satırdaki (başlık) satırı silme. Excel&apos;de
                XLSX veya CSV olarak kaydet.
              </p>
              <Button
                variant="outline"
                flow={false}
                onClick={downloadSample}
                leadingIcon={<Download className="size-5" aria-hidden="true" />}
              >
                Örnek Dosyayı İndir
              </Button>
            </div>
            <div className="flex flex-col gap-2 rounded-3xl border border-line bg-surface-raised p-4">
              <p className="font-bold">Sütunlar</p>
              <ul className="flex flex-wrap gap-2">
                {IMPORT_COLUMNS.map((c) => (
                  <li
                    key={c.key}
                    className={[
                      'rounded-full px-3 py-1 text-xs font-bold',
                      c.required ? 'bg-brand-50 text-brand-ink' : 'bg-surface-muted text-ink-muted',
                    ].join(' ')}
                  >
                    {c.title}
                    {c.required ? ' *' : ''}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-muted">
                * zorunlu · Kategori ve marka adı, sistemdeki adla aynı yazılmalı.
              </p>
            </div>
            <Button flow={false} onClick={() => setStep(2)}>
              Dosyam Hazır, Devam
            </Button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-field-border bg-surface-raised p-6 text-center transition-colors hover:border-brand-500"
            >
              <FileSpreadsheet className="size-8 text-brand-ink" aria-hidden="true" />
              <span className="font-bold">{fileName || 'Excel veya CSV dosyasını seç'}</span>
              <span className="text-sm text-ink-muted">
                {fileName ? 'Başka dosya seçmek için dokun' : 'Dokunup dosyayı seç (.xlsx, .csv)'}
              </span>
            </button>
            <input
              ref={input}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-label="Excel veya CSV dosyası seç"
              className="sr-only"
              onChange={(e) => void pick(e.target.files?.[0])}
            />
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                flow={false}
                disabled={text === ''}
                loading={busy}
                loadingLabel="Denetleniyor…"
                onClick={() => void check()}
              >
                Denetle ve Önizle
              </Button>
              <Button variant="outline" flow={false} onClick={() => setStep(1)}>
                Geri
              </Button>
            </div>
          </>
        ) : null}

        {step === 3 && preview ? (
          <>
            <p className="flex flex-wrap gap-2 text-sm font-bold" aria-label="Özet">
              <span className="rounded-full bg-success-soft px-3 py-1 text-success">
                {preview.newCount} yeni
              </span>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-ink">
                {preview.updateCount} güncellenecek
              </span>
              <span className="rounded-full bg-danger-soft px-3 py-1 text-danger">
                {preview.errorCount} hatalı
              </span>
            </p>
            <ul aria-label="Satırlar" className="flex flex-col gap-2">
              {listed.slice(0, MAX_LISTED).map((r) => (
                <li
                  key={r.line}
                  className={[
                    'flex items-center gap-3 rounded-2xl border p-3 text-sm',
                    r.status === 'error'
                      ? 'border-danger/30 bg-danger-soft'
                      : 'border-line bg-surface-raised',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      Satır {r.line} · {r.code || '—'}
                    </span>
                    <span className="block text-xs text-ink-muted">{r.message}</span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[r.status].cls}`}
                  >
                    {STATUS_STYLE[r.status].label}
                  </span>
                </li>
              ))}
            </ul>
            {listed.length > MAX_LISTED ? (
              <p className="text-center text-sm text-ink-muted">
                +{listed.length - MAX_LISTED} satır daha
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                flow={false}
                disabled={saveCount === 0}
                loading={busy}
                loadingLabel="Kaydediliyor…"
                onClick={() => void save()}
              >
                {saveCount} Ürünü Kaydet
              </Button>
              <Button variant="outline" flow={false} onClick={() => setStep(2)}>
                Geri
              </Button>
            </div>
            {preview.errorCount > 0 ? (
              <p className="text-sm text-ink-muted">Hatalı satırlar kaydedilmez, atlanır.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
