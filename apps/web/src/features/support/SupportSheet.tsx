import { Sheet } from '../../components/ui/Sheet';
import { supportConfig as defaultConfig, type SupportConfig } from '../../config/support.config';
import { SupportForm } from './SupportForm';

interface SupportSheetProps {
  open: boolean;
  onClose: () => void;
  config?: SupportConfig;
}

/** "Yardıma mı İhtiyacınız Var?" penceresi: destek formunu doğrudan içinde gösterir. */
export function SupportSheet({ open, onClose, config = defaultConfig }: SupportSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={config.title} size="lg" flush>
      {config.formUrl && config.formOrigin ? (
        <SupportForm url={config.formUrl} origin={config.formOrigin} />
      ) : (
        <div className="m-3 rounded-control border border-dashed border-line-strong/60 bg-surface p-5 text-center md:m-2">
          <p className="font-semibold text-ink">Destek formu henüz eklenmedi</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Destek formu çok yakında burada olacak. Lütfen daha sonra tekrar deneyin.
          </p>
        </div>
      )}
    </Sheet>
  );
}
