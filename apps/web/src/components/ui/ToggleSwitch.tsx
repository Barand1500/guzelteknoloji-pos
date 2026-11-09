import { useWorkspacePermission } from '../../features/workspace/workspace-context';
interface ToggleSwitchProps {
  /** Ekran okuyucu adı, ör. "ALATEL aktif". */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Liste satırlarında kullanılan küçük aç/kapa anahtarı. Görünen alan küçüktür ama dokunma alanı
 * (44px) büyüktür. Yalnızca anahtar tıklanabilir; satırın geri kalanı başka iş yapar.
 */
export function ToggleSwitch({ label, checked, onChange }: ToggleSwitchProps) {
  const allowed = useWorkspacePermission('save');
  return (
    <button
      type="button"
      disabled={!allowed}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group inline-flex h-11 w-14 shrink-0 items-center justify-center"
    >
      <span
        aria-hidden="true"
        className={[
          'relative h-7 w-12 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-line-strong/40',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-soft transition-transform duration-200 group-active:scale-90',
            checked ? 'translate-x-5' : '',
          ].join(' ')}
        />
      </span>
    </button>
  );
}
