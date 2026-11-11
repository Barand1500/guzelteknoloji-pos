import { useState } from 'react';
import { LayoutTemplate, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { Sheet } from '../../../components/ui/Sheet';
import { TextAreaField } from '../../../components/ui/TextAreaField';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { WIDGETS, WIDGET_TYPES, type WidgetEntry, type WidgetType } from '../../../mocks/ecommerce-settings';
import { ImagePicker, pickImage, type PickedImage } from './ImagePicker';
import { BACKEND_NOTICE_ID, EmptyState, ScreenCard } from './Parts';

/**
 * Widget Yönetimi: referansta liste boştur (RESİM / BAŞLIK sütunları, + Ekle).
 * Ekleme penceresi referansta gösterilmediği için yalnızca temel taslak alanları vardır.
 */
export function WidgetsScreen() {
  const items: readonly WidgetEntry[] = WIDGETS;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<WidgetType>('slider');
  const [title, setTitle] = useState('');
  const [visible, setVisible] = useState(true);
  const [text, setText] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);

  return (
    <ScreenCard
      title="Widget Yönetimi"
      actions={
        <Button flow={false}
          type="button"
          fullWidth={false}
          leadingIcon={<Plus className="size-4" aria-hidden="true" />}
          onClick={() => setOpen(true)}
        >
          Ekle
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="hidden grid-cols-[1fr_1fr] gap-3 border-b border-line px-3 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase sm:grid">
          <span>Resim</span>
          <span>Başlık</span>
        </div>
        {items.length === 0 ? (
          <EmptyState>Henüz widget yok.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {items.map((widget) => (
              <li
                key={widget.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-2"
              >
                <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                  <LayoutTemplate className="size-4 text-ink-muted" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{widget.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Widget Ekle"
        description="Widget türü ve görünürlüğü."
        size="md"
      >
        <div className="space-y-5">
          <TextField label="Widget Adı" value={name} onChange={(e) => setName(e.target.value)} />
          <SelectField
            label="Widget Türü"
            value={type}
            options={WIDGET_TYPES}
            onChange={(value) => setType(value as WidgetType)}
          />
          <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Görünürlük</span>
            <ToggleSwitch label="Widget görünür" checked={visible} onChange={setVisible} />
            <span className="text-sm text-ink-muted">{visible ? 'Görünür' : 'Gizli'}</span>
          </div>
          {type === 'banner' && (
            <ImagePicker
              label="Görsel"
              value={image}
              onPick={(file) => pickImage(image, file, setImage)}
              onClear={() => setImage(null)}
            />
          )}
          {(type === 'duyuru' || type === 'metin') && (
            <TextAreaField
              label="Metin"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={() => setOpen(false)}>
              Kapat
            </Button>
            <Button flow={false} type="button" disabled fullWidth={false} aria-describedby={BACKEND_NOTICE_ID}>
              Kaydet
            </Button>
          </div>
        </div>
      </Sheet>
    </ScreenCard>
  );
}
