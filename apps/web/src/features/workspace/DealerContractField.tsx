import { useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { apiRequest } from '../../lib/http';
import { dataError, imageAddress } from '../../lib/catalog-data';
import { fileToDataUrl } from '../ecommerce-settings/services/site.service';

export function DealerContractField({
  file,
  name,
  disabled,
  onChange,
  onBusy,
}: {
  file: string;
  name: string;
  disabled: boolean;
  onChange: (file: string, name: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <label className="block text-sm font-semibold" htmlFor="dealer-contract-pdf">
        Bayi Sözleşmesi PDF
      </label>
      <input
        id="dealer-contract-pdf"
        type="file"
        accept="application/pdf,.pdf"
        disabled={disabled || busy}
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:py-2"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          e.target.value = '';
          if (!selected) return;
          if (!/\.pdf$/i.test(selected.name) || selected.size > 2 * 1024 * 1024) {
            setError('En fazla 2 MB büyüklüğünde bir PDF seçin.');
            return;
          }
          setBusy(true);
          onBusy(true);
          setError(null);
          void fileToDataUrl(selected)
            .then((dataUrl) =>
              apiRequest<{ file: string; name: string }>('/api/hesap/belgeler', {
                method: 'POST',
                body: { name: selected.name, dataUrl },
              }),
            )
            .then((result) => onChange(result.file, result.name))
            .catch((cause) => setError(dataError(cause)))
            .finally(() => {
              setBusy(false);
              onBusy(false);
            });
        }}
      />
      <p className="text-xs text-ink-muted">
        {busy
          ? 'PDF yükleniyor…'
          : 'PDF · En fazla 2 MB. Dosyayı seçtikten sonra ayarları kaydedin.'}
      </p>
      {file && (
        <a
          className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-brand-ink"
          href={imageAddress(`/api/hesap/belgeler/${encodeURIComponent(file)}`) ?? undefined}
        >
          Belgeyi İndir{name ? ` · ${name}` : ''}
        </a>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
