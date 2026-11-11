import { useState } from 'react';
import { Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Sheet } from '../../../components/ui/Sheet';
import { SortableList } from '../../../components/ui/SortableList';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { SLIDES, type Slide } from '../../../mocks/ecommerce-settings';
import { RichTextField } from './RichTextField';
import { ImagePicker, pickImage, type PickedImage } from './ImagePicker';
import {
  BACKEND_NOTICE_ID,
  Badge,
  DisabledAction,
  EditAction,
  EmptyState,
  ScreenCard,
  SortableRow,
} from './Parts';

/** Slider listesi: RESİM / BAŞLIK / AKTİF sütunları, satır içi aktiflik ve sıralama. */
export function SlidersScreen() {
  const [items, setItems] = useState<Slide[]>(() => [...SLIDES]);
  const [form, setForm] = useState<Slide | 'new' | null>(null);

  const toggleActive = (id: string, active: boolean) =>
    setItems((previous) => previous.map((slide) => (slide.id === id ? { ...slide, active } : slide)));

  return (
    <ScreenCard
      title="Sliderlar"
      actions={
        <Button flow={false}
          type="button"
          fullWidth={false}
          leadingIcon={<Plus className="size-4" aria-hidden="true" />}
          onClick={() => setForm('new')}
        >
          Ekle
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="hidden grid-cols-[1fr_auto_auto] gap-3 border-b border-line px-3 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase sm:grid">
          <span>Resim / Başlık</span>
          <span>Aktif</span>
          <span className="text-right">İşlem</span>
        </div>
        {items.length === 0 ? (
          <EmptyState>Henüz slider yok. “Ekle” ile başlayın.</EmptyState>
        ) : (
          <SortableList
            label="Sliderlar"
            items={items}
            getId={(slide) => slide.id}
            getLabel={(slide) => slide.title}
            onReorder={setItems}
            renderItem={(slide, context) => (
              <SortableRow
                context={context}
                title={
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                      <ImageIcon className="size-4 text-ink-muted" aria-hidden="true" />
                    </span>
                    <span className="truncate">{slide.title}</span>
                  </span>
                }
                meta={slide.link}
                badges={
                  <ToggleSwitch
                    label={`${slide.title} aktif`}
                    checked={slide.active}
                    onChange={(value) => toggleActive(slide.id, value)}
                  />
                }
                actions={
                  <div className="flex shrink-0 items-center">
                    <EditAction
                      label={`${slide.title} sliderını düzenle`}
                      onClick={() => setForm(slide)}
                    />
                    <DisabledAction label={`${slide.title} sliderını sil`} />
                  </div>
                }
              />
            )}
          />
        )}
      </div>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form === 'new' ? 'Slider Ekle' : 'Sliderı Düzenle'}
        description="Kayıt backend bağlantısı gelince açılacak."
        size="xl"
      >
        {form && (
          <SliderForm
            key={form === 'new' ? 'new' : form.id}
            slide={form === 'new' ? null : form}
            onClose={() => setForm(null)}
          />
        )}
      </Sheet>
    </ScreenCard>
  );
}

function SliderForm({ slide, onClose }: { slide: Slide | null; onClose: () => void }) {
  const [title, setTitle] = useState(slide?.title ?? '');
  const [description, setDescription] = useState(slide?.description ?? '');
  const [link, setLink] = useState(slide?.link ?? '');
  const [active, setActive] = useState(slide?.active ?? true);
  const [image, setImage] = useState<PickedImage | null>(null);

  return (
    <form
      aria-label={slide ? 'Slider düzenleme formu' : 'Yeni slider formu'}
      className="space-y-5"
      onSubmit={(event) => event.preventDefault()}
    >
      <ImagePicker
        label="Resim"
        hint="1920×700 piksel oranında yüklemelisiniz."
        value={image}
        onPick={(file) => pickImage(image, file, setImage)}
        onClear={() => setImage(null)}
      />
      <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
      <RichTextField
        label="Açıklama"
        value={description}
        onChange={setDescription}
        rows={8}
      />
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Aktif</span>
        <ToggleSwitch label="Slider aktif" checked={active} onChange={setActive} />
        <Badge tone={active ? 'brand' : 'muted'}>{active ? 'Açık' : 'Kapalı'}</Badge>
      </div>
      <TextField
        label="Link"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />
      <p className="text-xs text-ink-muted">
        Görsel yalnızca önizlenir; yükleme backend bağlantısı gelince açılacak.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={onClose}>
          Kapat
        </Button>
        <Button flow={false} type="submit" fullWidth={false} disabled aria-describedby={BACKEND_NOTICE_ID}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
