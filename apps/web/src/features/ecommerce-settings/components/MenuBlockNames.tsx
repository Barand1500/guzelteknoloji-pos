import type { useSiteSettings } from '../hooks/useSiteSettings';
import { TextField } from '../../../components/ui/TextField';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';

export function MenuBlockNames({
  block,
  label,
  settings,
}: {
  block: string;
  label: string;
  settings: ReturnType<typeof useSiteSettings>;
}) {
  const { values, setValue, loading, ready, saving, error, message, save } = settings;
  return (
    <div className="space-y-3 pb-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-52 flex-1">
          <TextField
            label={`${label} Adı`}
            maxLength={120}
            value={values[block] ?? ''}
            disabled={loading || saving || !ready}
            onChange={(event) => setValue(block, event.target.value)}
          />
        </div>
        <Button
          fullWidth={false}
          flow={false}
          loading={saving}
          disabled={loading || !ready}
          aria-label={`${label} adını kaydet`}
          onClick={() => void save()}
        >
          Kaydet
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert>{message}</Alert>}
    </div>
  );
}
