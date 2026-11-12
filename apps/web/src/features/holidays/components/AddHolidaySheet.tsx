import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { RangeCalendar } from '../../stockdefs/components/RangeCalendar';
import type { CustomDraft } from '../types';

/** "+" ile doğrudan tarih seçerek tatil ekleme: ad + başlangıç/bitiş (aynı gün seçilirse tek günlük). */
export function AddHolidaySheet({
  initial,
  onSave,
  onClose,
}: {
  /** Takvimde seçili aralık varsa hazır gelir. */
  initial: { start: string; end: string } | null;
  onSave: (draft: CustomDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [start, setStart] = useState(initial?.start ?? '');
  const [end, setEnd] = useState(initial?.end ?? '');
  const [errors, setErrors] = useState<{ name?: string; date?: string; save?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Tatilin adını yazın.';
    if (!start) next.date = 'Başlangıç gününü seçin.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), start, end: end || start });
    } catch (e) {
      setErrors({ save: dataError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet permission="save" open onClose={onClose} size="md" title="Tatil Ekle">
      <div className="flex flex-col gap-4">
        {errors.save ? (
          <p role="alert" className="text-danger">
            {errors.save}
          </p>
        ) : null}
        <TextField
          label="Tatilin Adı"
          value={name}
          error={errors.name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
        <RangeCalendar
          start={start}
          end={end}
          error={errors.date}
          onChange={(a, b) => {
            setStart(a);
            setEnd(b);
          }}
        />
        <p className="-mt-2 text-center text-xs text-ink-muted">Tek gün için yalnızca bir güne basın.</p>
        <div className="flex gap-3 border-t border-line pt-4">
          <Button variant="outline" flow={false} onClick={onClose}>
            Vazgeç
          </Button>
          <Button flow={false} loading={saving} loadingLabel="Kaydediliyor…" onClick={() => void submit()}>
            Kaydet
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
