import { useId, type TextareaHTMLAttributes } from 'react';

interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'placeholder'
> {
  label: string;
}

/** Yüzen etiketli çok satırlı alan; görünüm index.css içindeki .field-* sınıflarından gelir. */
export function TextAreaField({
  label,
  id,
  className = '',
  rows = 3,
  ...rest
}: TextAreaFieldProps) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <div className="field">
      <textarea
        id={areaId}
        rows={rows}
        placeholder=" "
        className={`field-input resize-none pt-5 ${className}`}
        {...rest}
      />
      <label htmlFor={areaId} className="field-label">
        {label}
      </label>
    </div>
  );
}
