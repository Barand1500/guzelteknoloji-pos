import { WIDGET_LAYOUTS } from '@gt/shared';

export function WidgetLayoutPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-bold">Widget Düzeni</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {WIDGET_LAYOUTS.map((layout, index) => (
          <label
            key={layout.value}
            className={`cursor-pointer rounded-xl border-2 p-2 transition-colors ${value === layout.value ? 'border-brand-500 bg-brand-soft' : 'border-line hover:border-brand-500'}`}
          >
            <input
              className="sr-only peer"
              type="radio"
              name="widget-layout"
              value={layout.value}
              checked={value === layout.value}
              onChange={() => onChange(layout.value)}
            />
            <svg
              viewBox="0 0 160 86"
              className="w-full rounded bg-surface-muted text-ink-muted peer-focus-visible:ring-2"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="35" height="5" rx="2" fill="currentColor" />
              {index < 5 ? (
                <>
                  {index === 4 &&
                    [72, 99, 126].map((x) => (
                      <rect
                        key={x}
                        x={x}
                        y="8"
                        width="22"
                        height="5"
                        rx="2"
                        fill="currentColor"
                        opacity=".5"
                      />
                    ))}
                  {index === 2 && (
                    <>
                      <rect
                        x="8"
                        y="24"
                        width="40"
                        height="7"
                        rx="2"
                        fill="currentColor"
                        opacity=".6"
                      />
                      <rect
                        x="8"
                        y="36"
                        width="32"
                        height="5"
                        rx="2"
                        fill="currentColor"
                        opacity=".3"
                      />
                    </>
                  )}
                  {Array.from(
                    {
                      length:
                        index === 0 || index === 4 ? 10 : index === 3 ? 4 : index === 2 ? 3 : 5,
                    },
                    (_, n) => (
                      <rect
                        key={n}
                        x={(index === 2 ? 57 : 8) + (n % (index === 3 ? 2 : 5)) * 29}
                        y={24 + Math.floor(n / (index === 3 ? 2 : 5)) * 25}
                        width="23"
                        height="20"
                        rx="3"
                        fill="currentColor"
                        opacity=".25"
                      />
                    ),
                  )}
                  {index === 3 && (
                    <>
                      <rect
                        x="75"
                        y="23"
                        width="76"
                        height="46"
                        rx="3"
                        fill="currentColor"
                        opacity=".15"
                      />
                      <path
                        d="m98 54 10-13 10 13M99 37h1"
                        stroke="currentColor"
                        fill="none"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  {(index === 5 ? [8, 84] : [8]).map((x) => (
                    <g key={x}>
                      <rect
                        x={x}
                        y="23"
                        width={index === 5 ? 68 : 144}
                        height="48"
                        rx="3"
                        fill="currentColor"
                        opacity=".2"
                      />
                      <rect
                        x={x + 8}
                        y="35"
                        width={index === 5 ? 42 : 75}
                        height="5"
                        rx="2"
                        fill="currentColor"
                        opacity=".6"
                      />
                      <rect
                        x={x + 8}
                        y="46"
                        width="32"
                        height="4"
                        rx="2"
                        fill="currentColor"
                        opacity=".4"
                      />
                    </g>
                  ))}
                </>
              )}
            </svg>
            <span className="mt-2 block text-xs font-semibold">{layout.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
