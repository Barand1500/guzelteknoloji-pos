import { Download, Layers, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { returnsToCsv } from '../return-filter';
import type { ReturnRequest } from '../types';
import { cleanFileName } from './OrderExportSheet';

interface ReturnExportSheetProps {
  rows: ReturnRequest[];
  /** Süzgeç ve aramanın uygulandığı güncel liste. */
  listed: ReturnRequest[];
  onClose: () => void;
}

/** Dışa aktarma: listedekiler ya da hepsi; dosya adı yazılabilir (uzantı .csv). */
export function ReturnExportSheet({ rows, listed, onClose }: ReturnExportSheetProps) {
  const [all, setAll] = useState(false);
  const [fileText, setFileText] = useState('iade-degisim');
  const fileName = cleanFileName(fileText);
  const chosen = all ? rows : listed;

  const download = () => {
    if (typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(
        new Blob([returnsToCsv(chosen)], { type: 'text/csv;charset=utf-8' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Talepleri Dışa Aktar" size="md">
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Ne indirilsin" className="grid gap-2.5">
          {[
            {
              all: false,
              icon: ListChecks,
              title: 'Listedeki talepler',
              hint: 'Süzgeç ve aramanın sonucu',
            },
            { all: true, icon: Layers, title: 'Tüm talepler', hint: 'Hiçbir süzgeç uygulanmadan' },
          ].map((o) => {
            const Icon = o.icon;
            const on = all === o.all;
            return (
              <button
                key={o.title}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setAll(o.all)}
                className={[
                  'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200',
                  on
                    ? 'border-brand-600 bg-brand-50 shadow-soft'
                    : 'border-line bg-surface hover:border-brand-500/60',
                ].join(' ')}
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink'}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{o.title}</span>
                  <span className="block text-sm text-ink-muted">{o.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-ink-muted" aria-live="polite">
          <b className="text-ink">{chosen.length} talep</b> indirilecek.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Dosya adı</span>
          <span className="flex items-end gap-1 border-b-2 border-brand-600 pb-1 transition-colors focus-within:border-brand-800">
            <input
              type="text"
              value={fileText}
              onChange={(e) => setFileText(e.target.value)}
              aria-label="Dosya adı"
              maxLength={80}
              placeholder="iade-degisim"
              className="min-w-0 flex-1 bg-transparent py-1 text-lg font-bold outline-none placeholder:text-ink-muted/60"
            />
            <span aria-hidden="true" className="pb-1 text-lg font-bold text-ink-muted">
              .csv
            </span>
          </span>
          <span className="text-xs text-ink-muted">
            Dosya {fileName}.csv olarak iner (Excel&apos;de açılır).
          </span>
        </label>

        <Button
          flow={false}
          disabled={chosen.length === 0}
          leadingIcon={<Download className="size-5" aria-hidden="true" />}
          onClick={download}
        >
          İndir
        </Button>
      </div>
    </Sheet>
  );
}
