import { useState } from 'react';
import { Image as ImageIcon, Plus } from 'lucide-react';
import type { SliderDto } from '@gt/shared';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { Sheet } from '../../../components/ui/Sheet';
import { SortableList } from '../../../components/ui/SortableList';
import { TextField } from '../../../components/ui/TextField';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { dataError, imageAddress } from '../../../lib/catalog-data';
import { SLIDES } from '../../../mocks/ecommerce-settings';
import { useSiteList } from '../hooks/useSiteList';
import { fileToDataUrl, siteService } from '../services/site.service';
import { RichTextField } from './RichTextField';
import { ImagePicker, pickImage, type PickedImage } from './ImagePicker';
import {
  BACKEND_NOTICE_ID,
  Badge,
  DeleteAction,
  DisabledAction,
  EditAction,
  EmptyState,
  LoadingRows,
  ScreenCard,
  SortableRow,
} from './Parts';

/** Demo oturumunun yerel slider listesi (sunucuya yazılmaz). */
const DEMO_SLIDERS: SliderDto[] = SLIDES.map((slide, index) => ({
  ...slide,
  order: index,
  imageId: null,
  imageUrl: null,
}));

/** Kaydet gövdesi: listedeki alanların aynısı; sıra ve görsel kimliği korunur. */
const draftOf = (slide: SliderDto) => ({
  title: slide.title,
  description: slide.description,
  link: slide.link,
  active: slide.active,
  order: slide.order,
  imageId: slide.imageId,
});

/** Slider listesi: RESİM / BAŞLIK / AKTİF sütunları, satır içi aktiflik ve sıralama. */
export function SlidersScreen() {
  const { demo, items, setItems, loading, loaded, error, setError, refresh, reload } = useSiteList(
    DEMO_SLIDERS,
    siteService.sliders,
  );
  const [form, setForm] = useState<SliderDto | 'new' | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SliderDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleActive = async (slide: SliderDto, active: boolean) => {
    if (busy) return;
    if (demo) {
      setItems((previous) =>
        previous.map((item) => (item.id === slide.id ? { ...item, active } : item)),
      );
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await siteService.saveSlider({ ...draftOf(slide), active }, slide.id);
      await refresh();
    } catch (e) {
      setError(dataError(e));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Sürükle-bırak: yeni sıra tek istekte yazılır (eskiden her satır ayrı kaydediliyordu).
   * İstek düşerse eski sıra geri gelir.
   */
  const reorder = async (next: SliderDto[]) => {
    const previous = items;
    const ordered = next.map((slide, index) => ({ ...slide, order: index }));
    setItems(ordered);
    if (demo) return;
    setBusy(true);
    setNotice(null);
    try {
      await siteService.reorderSliders(ordered.map((slide) => slide.id));
    } catch (e) {
      setItems(previous);
      setError(dataError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    setNotice(null);
    try {
      await siteService.deleteSlider(pendingDelete.id);
      setPendingDelete(null);
      setNotice('Slider silindi.');
      await refresh();
    } catch (e) {
      setError(dataError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSaved = async (message: string) => {
    setForm(null);
    setNotice(message);
    await refresh();
  };

  const nextOrder = loaded ? items.reduce((max, slide) => Math.max(max, slide.order + 1), 0) : 0;

  return (
    <ScreenCard
      title="Sliderlar"
      actions={
        <Button
          flow={false}
          type="button"
          fullWidth={false}
          leadingIcon={<Plus className="size-4" aria-hidden="true" />}
          onClick={() => {
            setNotice(null);
            setForm('new');
          }}
        >
          Ekle
        </Button>
      }
    >
      <div className="space-y-3">
        {error ? (
          <div className="space-y-3">
            <Alert tone="error">{error}</Alert>
            <Button
              flow={false}
              type="button"
              variant="outline"
              fullWidth={false}
              onClick={() => void reload()}
            >
              Yeniden Yükle
            </Button>
          </div>
        ) : null}
        {notice ? <Alert tone="info">{notice}</Alert> : null}
        <div className="hidden grid-cols-[1fr_auto_auto] gap-3 border-b border-line px-3 pb-2 text-xs font-bold tracking-wide text-ink-muted uppercase sm:grid">
          <span>Resim / Başlık</span>
          <span>Aktif</span>
          <span className="text-right">İşlem</span>
        </div>
        {loading ? (
          <LoadingRows />
        ) : !loaded ? null : items.length === 0 ? (
          <EmptyState>Henüz slider yok. “Ekle” ile başlayın.</EmptyState>
        ) : (
          <SortableList
            label="Sliderlar"
            items={items}
            getId={(slide) => slide.id}
            getLabel={(slide) => slide.title}
            disabled={busy}
            onReorder={(next) => void reorder(next)}
            renderItem={(slide, context) => (
              <SortableRow
                context={context}
                title={
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                      {slide.imageUrl ? (
                        <img
                          src={imageAddress(slide.imageUrl) ?? slide.imageUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-4 text-ink-muted" aria-hidden="true" />
                      )}
                    </span>
                    <span className="truncate">{slide.title}</span>
                  </span>
                }
                meta={slide.link}
                badges={
                  <ToggleSwitch
                    label={`${slide.title} aktif`}
                    checked={slide.active}
                    onChange={(value) => void toggleActive(slide, value)}
                  />
                }
                actions={
                  <div className="flex shrink-0 items-center">
                    <EditAction
                      label={`${slide.title} sliderını düzenle`}
                      onClick={() => {
                        setNotice(null);
                        setForm(slide);
                      }}
                    />
                    {demo ? (
                      <DisabledAction label={`${slide.title} sliderını sil`} />
                    ) : (
                      <DeleteAction
                        label={`${slide.title} sliderını sil`}
                        disabled={busy}
                        onClick={() => setPendingDelete(slide)}
                      />
                    )}
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
        description={
          demo
            ? 'Test modunda kayıt kapalıdır; alanlar yalnızca yerel önizleme içindir.'
            : 'Görsel, başlık, bağlantı ve yayın durumu.'
        }
        size="xl"
      >
        {form && (
          <SliderForm
            key={form === 'new' ? 'new' : form.id}
            slide={form === 'new' ? null : form}
            order={nextOrder}
            demo={demo}
            onClose={() => setForm(null)}
            onSaved={handleSaved}
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={!!pendingDelete}
        title="Sliderı Sil"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” sliderı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
            : ''
        }
        confirmLabel="Sil"
        danger
        onConfirm={() => void remove()}
        onClose={() => setPendingDelete(null)}
      />
    </ScreenCard>
  );
}

function SliderForm({
  slide,
  order,
  demo,
  onClose,
  onSaved,
}: {
  slide: SliderDto | null;
  order: number;
  demo: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(slide?.title ?? '');
  const [description, setDescription] = useState(slide?.description ?? '');
  const [link, setLink] = useState(slide?.link ?? '');
  const [active, setActive] = useState(slide?.active ?? true);
  const [image, setImage] = useState<PickedImage | null>(() =>
    slide?.imageUrl
      ? { name: 'Kayıtlı görsel', url: imageAddress(slide.imageUrl) ?? slide.imageUrl }
      : null,
  );
  const [imageId, setImageId] = useState<string | null>(slide?.imageId ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const titleError = touched && !title.trim() ? 'Başlık gerekli.' : undefined;

  /** Gerçek oturumda seçilen dosya Base64'e çevrilip yüklenir; dönen kimlik kayda yazılır. */
  const chooseImage = async (file: File | undefined) => {
    if (!file) return;
    if (demo) {
      pickImage(image, file, setImage);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploaded = await siteService.uploadImage('slider', await fileToDataUrl(file));
      setImageId(uploaded.id);
      setImage({ name: file.name, url: imageAddress(uploaded.url) ?? uploaded.url });
    } catch (e) {
      setError(dataError(e));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setTouched(true);
    if (demo || saving || uploading || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await siteService.saveSlider(
        {
          title: title.trim(),
          description,
          link: link.trim(),
          active,
          order: slide?.order ?? order,
          imageId,
        },
        slide?.id,
      );
      await onSaved(slide ? 'Slider güncellendi.' : 'Slider eklendi.');
    } catch (e) {
      setError(dataError(e));
      setSaving(false);
    }
  };

  return (
    <form
      aria-label={slide ? 'Slider düzenleme formu' : 'Yeni slider formu'}
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <ImagePicker
        label="Resim"
        hint="1920×700 piksel oranında yüklemelisiniz."
        value={image}
        busy={uploading}
        note={
          demo ? undefined : imageId ? 'Görsel sunucuya yüklendi.' : 'Yükleme için dosya seçin.'
        }
        onPick={(file) => void chooseImage(file)}
        onClear={() => {
          setImage(null);
          setImageId(null);
        }}
      />
      <TextField
        label="Başlık"
        required
        error={titleError}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      <RichTextField label="Açıklama" value={description} onChange={setDescription} rows={8} />
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Aktif</span>
        <ToggleSwitch label="Slider aktif" checked={active} onChange={setActive} />
        <Badge tone={active ? 'brand' : 'muted'}>{active ? 'Açık' : 'Kapalı'}</Badge>
      </div>
      <TextField label="Link" value={link} onChange={(e) => setLink(e.target.value)} />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button flow={false} type="button" variant="outline" fullWidth={false} onClick={onClose}>
          Kapat
        </Button>
        <Button
          flow={false}
          type="submit"
          fullWidth={false}
          disabled={demo || uploading || saving}
          loading={saving}
          loadingLabel="Kaydediliyor…"
          aria-describedby={demo ? BACKEND_NOTICE_ID : undefined}
        >
          Kaydet
        </Button>
      </div>
    </form>
  );
}
