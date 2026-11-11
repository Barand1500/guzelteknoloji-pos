import { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Eraser,
  HelpCircle,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize,
  Table,
  Underline,
  Video,
} from 'lucide-react';

interface RichTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** İçerik alanının en az yüksekliği (rem). */
  rows?: number;
  required?: boolean;
  hint?: string;
}

const TOOLS = [
  { label: 'Kalın', icon: Bold, command: 'bold' },
  { label: 'İtalik', icon: Italic, command: 'italic' },
  { label: 'Altı Çizili', icon: Underline, command: 'underline' },
  { label: 'Madde Listesi', icon: List, command: 'insertUnorderedList' },
  { label: 'Numaralı Liste', icon: ListOrdered, command: 'insertOrderedList' },
  { label: 'Sola Hizala', icon: AlignLeft, command: 'justifyLeft' },
  { label: 'Ortala', icon: AlignCenter, command: 'justifyCenter' },
  { label: 'Sağa Hizala', icon: AlignRight, command: 'justifyRight' },
  { label: 'Biçimi Temizle', icon: Eraser, command: 'removeFormat' },
] as const;

const PENDING_TOOLS = [
  { label: 'Tablo Ekle', icon: Table },
  { label: 'Görsel Ekle', icon: ImageIcon },
  { label: 'Video Ekle', icon: Video },
  { label: 'Tam Ekran', icon: Maximize },
  { label: 'Yardım', icon: HelpCircle },
] as const;

/**
 * Referanstaki zengin metin editörünün karşılığı: içerik düzenlenebilir alanda tutulur,
 * araç çubuğu tarayıcının kendi komutlarını kullanır (yeni paket yok).
 * - "Kaynak" görünümünde HTML düz metin olarak düzenlenir; hiçbir yerde çalıştırılmaz.
 * - Tablo/görsel/video/tam ekran/yardım düğmeleri medya ve backend bağlantısı gelince açılacak.
 */
export function RichTextField({
  label,
  value,
  onChange,
  rows = 10,
  required = false,
  hint,
}: RichTextFieldProps) {
  const editor = useRef<HTMLDivElement>(null);
  const [source, setSource] = useState(false);

  useEffect(() => {
    const node = editor.current;
    if (!node || source) return;
    // Kullanıcı yazarken imleç yerini bozmamak için yalnızca dışarıdan gelen değer yazılır.
    if (document.activeElement !== node && node.innerHTML !== value) node.innerHTML = value;
  }, [value, source]);

  const exec = (command: string, argument?: string) => {
    const node = editor.current;
    if (!node) return;
    node.focus();
    document.execCommand(command, false, argument);
    onChange(node.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt('Bağlantı adresi');
    if (url) exec('createLink', url);
  };

const toolButton =
  'inline-flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600';


  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold">
        {label} {required && <span className="text-danger">*</span>}
      </p>
      <div className="overflow-hidden rounded-2xl border border-field-border bg-surface-raised focus-within:border-brand-600">
        <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              aria-label={tool.label}
              title={tool.label}
              className={toolButton}
              // Odak düzenleme alanında kalsın: tıklama odağı çalmasın.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => exec(tool.command)}
            >
              <tool.icon className="size-4" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            aria-label="Bağlantı Ekle"
            title="Bağlantı Ekle"
            className={toolButton}
            onMouseDown={(event) => event.preventDefault()}
            onClick={addLink}
          >
            <Link2 className="size-4" aria-hidden="true" />
          </button>
          {PENDING_TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              aria-label={tool.label}
              title={`${tool.label} — bağlantı gelince açılacak`}
              disabled
              className={`${toolButton} disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <tool.icon className="size-4" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            aria-pressed={source}
            className={`${toolButton} ml-auto w-auto gap-1 px-2 text-xs font-semibold`}
            onClick={() => {
              if (!source && editor.current) onChange(editor.current.innerHTML);
              setSource((previous) => !previous);
            }}
          >
            <Code2 className="size-4" aria-hidden="true" />
            {source ? 'Editör' : 'Kaynak'}
          </button>
        </div>
        {source ? (
          <textarea
            aria-label={`${label} kaynak kodu`}
            value={value}
            rows={rows}
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
            className="block w-full resize-y bg-surface-raised p-3 font-mono text-xs text-ink outline-none"
          />
        ) : (
          <div
            ref={editor}
            role="textbox"
            aria-label={label}
            aria-multiline="true"
            aria-required={required}
            contentEditable
            suppressContentEditableWarning
            onInput={(event) => onChange(event.currentTarget.innerHTML)}
            onBlur={(event) => onChange(event.currentTarget.innerHTML)}
            className="w-full resize-y overflow-auto p-3 text-sm leading-relaxed text-ink outline-none [&_a]:text-brand-ink [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            style={{ minHeight: `${rows * 1.6}rem` }}
          />
        )}
      </div>
      <p className="text-xs text-ink-muted">
        {hint ?? 'İçerik HTML olarak tutulur; kayıt backend bağlantısı gelince açılacak.'}
      </p>
    </div>
  );
}
