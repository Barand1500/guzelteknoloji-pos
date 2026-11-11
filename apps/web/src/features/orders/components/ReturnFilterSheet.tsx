import { CalendarDays, Repeat2, RotateCcw, ShieldQuestion, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { emptyReturnFilters, filterReturns, type ReturnFilters } from '../return-filter';
import {
  RETURN_KIND_LABEL,
  RETURN_STATUS_LABEL,
  type ReturnKind,
  type ReturnRequest,
  type ReturnStatus,
} from '../types';
import { Choice, Section, presets } from './OrderFilterSheet';

const KIND_ICON = { return: Undo2, exchange: Repeat2 } as const;
const STATUSES: ReturnStatus[] = ['pending', 'approved', 'rejected', 'completed'];

interface ReturnFilterSheetProps {
  rows: ReturnRequest[];
  value: ReturnFilters;
  onApply: (next: ReturnFilters) => void;
  onClose: () => void;
}

/** Süzgeçler penceresi (Siparişler'dekiyle aynı dil): tip, durum ve tarih; altta canlı sayı. */
export function ReturnFilterSheet({ rows, value, onApply, onClose }: ReturnFilterSheetProps) {
  const [draft, setDraft] = useState<ReturnFilters>(value);
  const set = <K extends keyof ReturnFilters>(key: K, v: ReturnFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));
  const count = filterReturns(rows, draft).length;
  const ranges = presets();
  const activePreset = ranges.find((r) => r.from === draft.from && r.to === draft.to)?.id;

  return (
    <Sheet open onClose={onClose} title="Süzgeçler" size="lg">
      <div className="flex flex-col gap-6">
        <Section icon={RotateCcw} title="Talep tipi">
          <div role="radiogroup" aria-label="Talep tipi" className="flex flex-wrap gap-2">
            <Choice on={draft.kind === 'all'} onClick={() => set('kind', 'all')}>
              Hepsi
            </Choice>
            {(Object.keys(RETURN_KIND_LABEL) as ReturnKind[]).map((k) => (
              <Choice
                key={k}
                on={draft.kind === k}
                onClick={() => set('kind', k)}
                icon={KIND_ICON[k]}
              >
                {RETURN_KIND_LABEL[k]}
              </Choice>
            ))}
          </div>
        </Section>

        <Section icon={ShieldQuestion} title="Durum">
          <div role="radiogroup" aria-label="Talep durumu" className="flex flex-wrap gap-2">
            <Choice on={draft.status === 'all'} onClick={() => set('status', 'all')}>
              Hepsi
            </Choice>
            {STATUSES.map((s) => (
              <Choice key={s} on={draft.status === s} onClick={() => set('status', s)}>
                {RETURN_STATUS_LABEL[s]}
              </Choice>
            ))}
          </div>
        </Section>

        <Section icon={CalendarDays} title="Tarih">
          <div role="radiogroup" aria-label="Hazır tarih aralığı" className="flex flex-wrap gap-2">
            <Choice
              on={!draft.from && !draft.to}
              onClick={() => setDraft((d) => ({ ...d, from: '', to: '' }))}
            >
              Tümü
            </Choice>
            {ranges.map((r) => (
              <Choice
                key={r.id}
                on={activePreset === r.id}
                onClick={() => setDraft((d) => ({ ...d, from: r.from, to: r.to }))}
              >
                {r.label}
              </Choice>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Başlangıç tarihi"
              type="date"
              value={draft.from}
              onChange={(e) => set('from', e.target.value)}
            />
            <TextField
              label="Bitiş tarihi"
              type="date"
              value={draft.to}
              onChange={(e) => set('to', e.target.value)}
            />
          </div>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-6 flex flex-row-reverse gap-3 border-t border-line bg-surface-raised px-6 pt-3 pb-4 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0">
          <Button
            flow={false}
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {count} Talebi Göster
          </Button>
          <Button
            variant="outline"
            flow={false}
            onClick={() => setDraft((d) => ({ ...emptyReturnFilters, query: d.query }))}
          >
            Sıfırla
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
