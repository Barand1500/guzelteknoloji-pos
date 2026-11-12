import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { MultiSelectField, type MultiOption } from '../../../components/ui/MultiSelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { dataError } from '../../../lib/catalog-data';
import { useCustomerService } from '../../customers/services/customer.service';
import { formatStamp, isPast, localStamp, quickSlots, type NotificationDraft } from '../types';
import { DayTimePicker } from './DayTimePicker';
import { PhonePreview } from './PhonePreview';

export interface ComposeInitial {
  title: string;
  text: string;
}

/**
 * Bildirim yaz: solda başlık, metin, kimlere ve ne zaman; sağda telefonun kilit ekranında nasıl görüneceği canlı
 * önizlenir. Zaman: "Hemen" (1 dakika içinde), hazır zamanlar ya da özel gün + saat. Müşteri seçilmezse herkese gider.
 */
export function ComposeSheet({
  initial,
  onSend,
  onClose,
}: {
  initial: ComposeInitial | null;
  onSend: (draft: NotificationDraft) => Promise<void>;
  onClose: () => void;
}) {
  const customerService = useCustomerService();
  const [options, setOptions] = useState<MultiOption[]>([]);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [ids, setIds] = useState<string[]>([]);
  const [at, setAt] = useState<string | null>(null); // null = hemen
  const [custom, setCustom] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; when?: string; save?: string }>({});
  const [sending, setSending] = useState(false);
  const now = useMemo(() => new Date(), []);
  const today = localStamp(now).slice(0, 10);
  const slots = useMemo(() => quickSlots(now), [now]);

  useEffect(() => {
    let cancelled = false;
    void customerService
      .list()
      .then((r) => {
        if (!cancelled) setOptions(r.items.map((c) => ({ id: c.id, name: c.name, path: c.email })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [customerService]);

  const whenText = at ? `${formatStamp(at).date} ${formatStamp(at).time}` : '1 dakika içinde';
  const audience = ids.length === 0 ? 'Tüm müşteriler' : `${ids.length} müşteri`;

  const submit = async () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Başlık gerekli.';
    if (at && isPast(at, new Date())) next.when = 'Gelecek bir zaman seçin.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSending(true);
    try {
      await onSend({ title: title.trim(), text: text.trim(), customerIds: ids, sendAt: at });
    } catch (e) {
      setErrors({ save: dataError(e) });
    } finally {
      setSending(false);
    }
  };

  const chip = (on: boolean) =>
    `min-h-10 rounded-full border px-4 text-sm font-bold transition-colors ${on ? 'border-brand-600 bg-brand-700 text-white shadow-soft' : 'border-field-border bg-surface text-ink-muted hover:border-brand-500 hover:text-ink'}`;

  return (
    <Sheet permission="save" open onClose={onClose} size="xl" title="Bildirim Yaz">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
          {errors.save ? (
            <p role="alert" className="text-danger">
              {errors.save}
            </p>
          ) : null}
          <div>
            <TextField label="Başlık" value={title} error={errors.title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
            <p className="mt-1 px-2 text-right text-xs text-ink-muted tabular-nums">{title.length}/60</p>
          </div>
          <div>
            <TextAreaField label="Metin (isteğe bağlı)" rows={4} maxLength={240} value={text} onChange={(e) => setText(e.target.value)} />
            <p className="mt-1 px-2 text-right text-xs text-ink-muted tabular-nums">{text.length}/240</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <MultiSelectField label="Müşteriler" options={options} value={ids} onChange={setIds} emptyText="Tüm müşteriler" listText />
            <p className="px-2 text-sm text-ink-muted">Hiç seçim yapmazsanız herkese gider.</p>
          </div>

          <div role="radiogroup" aria-label="Ne zaman" className="flex flex-col gap-2">
            <p className="text-xs font-extrabold tracking-wider text-ink-muted uppercase">Ne zaman</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" role="radio" aria-checked={at === null && !custom} onClick={() => { setAt(null); setCustom(false); }} className={chip(at === null && !custom)}>
                Hemen
              </button>
              {slots.map((s) => (
                <button key={s.at} type="button" role="radio" aria-checked={at === s.at && !custom} onClick={() => { setAt(s.at); setCustom(false); }} className={chip(at === s.at && !custom)}>
                  {s.label}
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={custom}
                onClick={() => {
                  setCustom(true);
                  setAt((a) => a ?? `${today}T${String(now.getHours() + 1).padStart(2, '0')}:00`);
                }}
                className={chip(custom)}
              >
                Özel gün ve saat
              </button>
            </div>
            {custom && at ? (
              <div className="animate-fade-in">
                <DayTimePicker value={at} today={today} onChange={setAt} />
              </div>
            ) : null}
            {errors.when ? (
              <p role="alert" className="text-sm text-danger">
                {errors.when}
              </p>
            ) : null}
          </div>

          <div className="flex gap-3 border-t border-line pt-4">
            <Button variant="outline" flow={false} onClick={onClose}>
              Vazgeç
            </Button>
            <Button flow={false} loading={sending} loadingLabel="Gönderiliyor…" onClick={() => void submit()}>
              {at ? 'Planla' : 'Gönder'}
            </Button>
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-0 lg:self-start">
          <PhonePreview title={title} text={text} audience={audience} when={whenText} />
        </div>
      </div>
    </Sheet>
  );
}
