import { ArrowLeft, Download, FileSpreadsheet, MoveRight } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { SelectField, type SelectOption } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import {
  IMPORT_COLUMNS,
  autoMapping,
  buildImportText,
  missingRequired,
  readTable,
  sampleImportCsv,
  type ImportAssignment,
  type ImportKey,
  type ImportTable,
} from '../import.csv';
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

const STEPS = ['Dosya Seç', 'Sütunları Eşleştir', 'Ön İzleme'] as const;
const MAX_LISTED = 60;
const SKIP = '';

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
 * Excel ile ürün yükleme sihirbazı: 1) dosyayı seç 2) dosyadaki sütun başlıklarını tablo
 * sütunlarıyla EŞLEŞTİR (benzer adlar kendiliğinden eşleşir, istenmeyen sütun atlanır) 3) önizle ve
 * onayla. Dosyanın başlıkları örnek dosyayla aynı olmak zorunda değildir. Önizlemede hangi satırın
 * doğru/yanlış olduğu görülür; onaylayınca yalnızca doğru satırlar kaydedilir, hatalılar atlanır.
 */
export function ProductImportSheet({ onDone, onClose }: ProductImportSheetProps) {
  const productService = useProductService();
  const [step, setStep] = useState<Step>(1);
  const [table, setTable] = useState<ImportTable | null>(null);
  const [assignment, setAssignment] = useState<ImportAssignment>([]);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Eşleştirmeden üretilen, sunucunun beklediği başlıklı metin.
  const text = useMemo(
    () => (table ? buildImportText(table, assignment) : ''),
    [table, assignment],
  );
  const missing = table ? missingRequired(assignment) : [];

  const targetOptions = useMemo<SelectOption[]>(
    () => [
      { value: SKIP, label: 'Bu sütunu atla' },
      ...IMPORT_COLUMNS.map((c) => ({
        value: c.key,
        label: `${c.label}${c.required ? ' *' : ''}`,
      })),
    ],
    [],
  );

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
    try {
      const parsed = readTable(await readImportFile(file));
      if (parsed.headers.length === 0 || parsed.records.length === 0) {
        setError('Dosyada okunacak ürün satırı bulunamadı.');
        return;
      }
      setTable(parsed);
      setAssignment(autoMapping(parsed.headers));
      setFileName(file.name);
      setStep(2);
    } catch (e) {
      setError(dataError(e));
    }
  };

  const assign = (index: number, key: string) =>
    setAssignment((current) =>
      current.map((value, i) => {
        if (i === index) return key as ImportKey | '';
        // Bir tablo sütunu yalnızca tek Excel sütunundan beslenir.
        return key !== SKIP && value === key ? SKIP : value;
      }),
    );

  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await productService.previewImport(text);
      if (result.missingColumns.length > 0) {
        setError(`Şu sütunlar eşleştirilmeli: ${result.missingColumns.join(', ')}.`);
        return;
      }
      if (result.rows.length === 0) {
        setError('Dosyada okunacak ürün satırı bulunamadı.');
        return;
      }
      setPreview(result);
      setStep(3);
    } catch (e) {
      setError(dataError(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await productService.commitImport(text);
      if ('errors' in result && result.errors?.length)
        setError(result.errors.slice(0, 5).join(' · '));
      onDone(result);
    } catch (e) {
      setError(dataError(e));
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
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title="Excel'den İçe Aktar"
      description="Dosyanı seç, sütunları eşleştir ve kayıtları kontrol ederek ekle."
    >
      <div className="flex flex-col gap-5">
        <WizardSteps steps={STEPS} current={step} />

        {error ? <Alert tone="error">{error}</Alert> : null}

        <input
          ref={input}
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Excel veya CSV dosyası seç"
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {step === 1 ? (
          <>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-field-border bg-surface-raised p-6 text-center transition-colors hover:border-brand-500"
            >
              <FileSpreadsheet className="size-9 text-brand-ink" aria-hidden="true" />
              <span className="text-lg font-bold">Excel veya CSV dosyasını seç</span>
              <span className="text-sm text-ink-muted">
                Dokunup dosyayı seç (.xlsx, .csv) · en fazla 1000 ürün, 5 MB
              </span>
            </button>

            <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold">Dosya başlıkları aynı olmak zorunda değil</p>
                <p className="text-sm text-ink-muted">
                  Bir sonraki adımda dosyandaki her sütunu tablodaki karşılığıyla eşleştirirsin.
                  Hazır bir şablon istersen örnek dosyayı indir.
                </p>
              </div>
              <Button
                variant="outline"
                fullWidth={false}
                flow={false}
                onClick={downloadSample}
                leadingIcon={<Download className="size-5" aria-hidden="true" />}
              >
                Örnek Dosyayı İndir
              </Button>
            </div>
            <p className="text-xs text-ink-muted">
              Zorunlu alanlar:{' '}
              {IMPORT_COLUMNS.filter((c) => c.required)
                .map((c) => c.label)
                .join(', ')}
              . Kategori ve marka adı, sistemdeki adla aynı yazılmalı.
            </p>
          </>
        ) : null}

        {step === 2 && table ? (
          <>
            <div className="flex items-center gap-3 rounded-3xl border border-line bg-brand-50/50 p-4">
              <FileSpreadsheet className="size-6 shrink-0 text-brand-ink" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{fileName}</p>
                <p className="text-sm text-ink-muted">
                  {table.records.length} satır · {table.headers.length} sütun bulundu
                </p>
              </div>
              <Button
                variant="outline"
                fullWidth={false}
                flow={false}
                onClick={() => input.current?.click()}
              >
                Dosyayı Değiştir
              </Button>
            </div>

            <div>
              <p className="text-lg font-extrabold">Dosya başlıklarını tablo sütunlarına bağla</p>
              <p className="text-sm text-ink-muted">
                Benzer adları otomatik eşleştirdik. İstersen seçimleri değiştirebilirsin.
              </p>
            </div>

            <ul aria-label="Sütun eşleştirme" className="flex flex-col gap-2.5">
              {table.headers.map((header, index) => {
                const sample = table.records.find((r) => (r[index] ?? '').trim() !== '')?.[index];
                const value = assignment[index] ?? SKIP;
                return (
                  <li
                    key={index}
                    className={[
                      'grid items-center gap-3 rounded-2xl border bg-surface-raised p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
                      value === SKIP ? 'border-line' : 'border-brand-500/50',
                    ].join(' ')}
                  >
                    <div className="min-w-0">
                      <p className="text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">
                        Excel sütunu
                      </p>
                      <p className="truncate font-bold">{header || `Sütun ${index + 1}`}</p>
                      {sample ? (
                        <p className="truncate text-sm text-ink-muted">{sample.trim()}</p>
                      ) : null}
                    </div>
                    <MoveRight
                      className="hidden size-5 text-ink-muted sm:block"
                      aria-hidden="true"
                    />
                    <SelectField
                      label="Tablodaki karşılığı"
                      options={targetOptions}
                      value={value}
                      onChange={(v) => assign(index, v)}
                    />
                  </li>
                );
              })}
            </ul>

            {missing.length > 0 ? (
              <p role="status" className="text-sm font-semibold text-danger">
                Eşleştirilmesi gereken zorunlu alan: {missing.join(', ')}.
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                flow={false}
                disabled={missing.length > 0}
                loading={busy}
                loadingLabel="Denetleniyor…"
                onClick={() => void check()}
              >
                Ön İzlemeyi Gör
              </Button>
              <Button
                variant="outline"
                flow={false}
                onClick={() => setStep(1)}
                leadingIcon={<ArrowLeft className="size-5" aria-hidden="true" />}
              >
                Dosyayı Değiştir
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
                Eşleştirmeye Dön
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
