import { Alert } from '../../../components/ui/Alert';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { SaveFooter, ScreenCard } from './Parts';

const defaults = {
  text: "“Teknolojinin en güzel hali GÜZEL Teknoloji'de!” Akıllı alışverişin adresi — güvenli, hızlı ve uygun fiyatlı.",
};

/** Header üst yazı: tek alan (Yazı) ve sayfa altındaki ortak Kaydet çubuğu (`site_header`). */
export function HeaderTextScreen() {
  const { values, setValue, loading, ready, saving, error, message, save } = useSiteSettings(
    'site_header',
    defaults,
  );

  return (
    <div className="flex flex-col gap-4">
      <ScreenCard
        title="Header Üst Yazı"
        description="Sitenin en üstündeki duyuru şeridinde görünen yazı."
      >
        <div className="space-y-4">
          <TextAreaField
            label="Yazı"
            required
            rows={4}
            value={values.text ?? ''}
            onChange={(e) => setValue('text', e.target.value)}
          />
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </ScreenCard>
      <SaveFooter
        onSave={() => void save()}
        saving={saving}
        disabled={loading || !ready || !values.text?.trim()}
        message={message ?? (values.text?.trim() ? null : 'Yazı boş olamaz.')}
      />
    </div>
  );
}
