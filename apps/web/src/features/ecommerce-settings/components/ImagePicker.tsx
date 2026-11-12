import type { ReactNode } from 'react';

export interface PickedImage {
  name: string;
  url: string;
}

/**
 * Seçilen dosyayı yalnızca tarayıcıda önizlemek için nesne adresine çevirir.
 * Eski adres serbest bırakılır; hiçbir dosya sunucuya yüklenmez.
 */
export function pickImage(
  current: PickedImage | null,
  file: File | undefined,
  setter: (value: PickedImage | null) => void,
) {
  if (!file) return;
  if (current) URL.revokeObjectURL(current.url);
  setter({ name: file.name, url: URL.createObjectURL(file) });
}

/** Görsel seçimi: dosya kutusu + önizleme + kaldırma. Demo oturumunda yükleme yapmaz. */
export function ImagePicker({
  label,
  hint,
  value,
  note,
  busy = false,
  onPick,
  onClear,
}: {
  label: string;
  hint?: string;
  value: PickedImage | null;
  /** Önizleme kutusundaki açıklama; verilmezse "yalnızca önizleme" yazar. */
  note?: ReactNode;
  /** Yükleme sürerken dosya seçimi ve kaldırma kapalıdır. */
  busy?: boolean;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        aria-label={`${label} seç`}
        disabled={busy}
        onChange={(e) => onPick(e.target.files?.[0])}
        className="block w-full rounded-2xl border border-field-border bg-surface-raised p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:py-2 file:text-sm file:font-semibold disabled:opacity-60"
      />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      {value && (
        <div className="flex items-center gap-3 rounded-2xl border border-line p-3">
          <img
            src={value.url}
            alt={`${label} önizlemesi`}
            className="h-16 w-28 rounded-xl bg-surface-muted object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{value.name}</p>
            <p className="text-xs text-ink-muted">{note ?? 'Yalnızca önizleme — yüklenmedi.'}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              URL.revokeObjectURL(value.url);
              onClear();
            }}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-40"
          >
            Kaldır
          </button>
        </div>
      )}
    </div>
  );
}
