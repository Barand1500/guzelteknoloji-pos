import { ChevronLeft, Layers } from 'lucide-react';
import { usePublishAddAction } from '../../app-shell/save-action';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { SearchField } from '../../../components/ui/SearchField';
import { SortableGrid } from '../../../components/ui/SortableGrid';
import { SortableList } from '../../../components/ui/SortableList';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { dataError } from '../../../lib/catalog-data';
import { useCategories } from '../../categories/hooks/useCategories';
import { useAttributes } from '../hooks/useAttributes';
import {
  kindLabel,
  slugify,
  type AttrGroup,
  type AttrTemplate,
  type AttrValue,
  type GroupDraft,
  type TemplateDraft,
  type ValueDraft,
} from '../types';
import { AttributeRow } from './AttributeRow';
import { GroupFormSheet } from './GroupFormSheet';
import { colorByName } from '../color-names';
import { QuickAddBar } from './QuickAddBar';
import { SearchResults, type SearchHits } from './SearchResults';
import { TemplateFormSheet } from './TemplateFormSheet';
import { ValueFormSheet } from './ValueFormSheet';
import { ValueTile, type ValuePatch } from './ValueTile';

const fold = (s: string) => s.toLocaleLowerCase('tr');

/** Küçük etiket (kategori adı, anahtar, sayı). */
function Tag({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: 'brand' | 'gray' | 'green';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-ink',
    gray: 'bg-surface-muted text-ink-muted',
    green: 'bg-success-soft text-success',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

type FormState =
  | { type: 'template'; id: string | null }
  | { type: 'group'; id: string | null }
  | { type: 'value'; id: string | null }
  | null;

type Deleting =
  | { type: 'template'; item: AttrTemplate }
  | { type: 'group'; item: AttrGroup }
  | { type: 'value'; item: AttrValue }
  | null;

/**
 * Özellikler ekranı: Şablon → Grup → Özellik. Kategoriler gibi KLASÖR gezer gibi çalışır: şablona
 * girilir, gruba girilir, özellikler görünür. İçinde bulunulan yer adreste (?s=şablon&g=grup)
 * tutulur (telefonun geri hareketi bir üst seviyeye çıkar). Her seviyede tek, o seviyeye göre
 * adlanan bir "+" düğmesi vardır. Özelliklerin içinde hızlı giriş kutusu vardır: adı yaz, Enter.
 */
export function AttributesView() {
  const attrs = useAttributes();
  const cats = useCategories();
  const phone = !useMediaQuery('(min-width: 48rem)');
  const [searchParams, setSearchParams] = useSearchParams();

  const sParam = searchParams.get('s');
  const template = sParam ? (attrs.templateById.get(sParam) ?? null) : null;
  const gParam = searchParams.get('g');
  const groupCandidate = gParam ? (attrs.groupById.get(gParam) ?? null) : null;
  // Grup yalnızca içinde bulunulan şablonun grubuysa geçerlidir.
  const group = template && groupCandidate?.templateId === template.id ? groupCandidate : null;
  const level: 'templates' | 'groups' | 'values' = group
    ? 'values'
    : template
      ? 'groups'
      : 'templates';

  const goTo = (s: string | null, g: string | null = null) => {
    setQuery('');
    setSwipeOpenId(null);
    setSearchParams(s ? (g ? { s, g } : { s }) : {});
  };

  const [query, setQuery] = useState('');
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  };

  useEffect(() => {
    if (!swipeOpenId) return;
    const onPointerDown = (e: PointerEvent) => {
      const row = (e.target as HTMLElement).closest('[data-swipe-row]');
      if (row?.getAttribute('data-swipe-row') !== swipeOpenId) setSwipeOpenId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [swipeOpenId]);

  const searching = query.trim() !== '';
  const matches = (text: string) => fold(text).includes(fold(query.trim()));
  const groupsOf = (templateId: string) => attrs.groups.filter((g) => g.templateId === templateId);
  const valuesOf = (groupId: string) => attrs.values.filter((v) => v.groupId === groupId);

  // Aktif seviyenin tüm kardeşleri (sıra) ve arama sonucu (görünen).
  const templates = attrs.templates;
  const groups = template ? groupsOf(template.id) : [];
  const values = group ? valuesOf(group.id) : [];
  const visibleTemplates = templates;
  const visibleGroups = groups;
  const visibleValues = values;

  // Arama her seviyede TÜM ağaçta çalışır: şablon, grup ve özellikler birlikte bulunur.
  const hits: SearchHits = { templates: [], groups: [], values: [] };
  if (searching) {
    hits.templates = templates.filter((t) => matches(t.name));
    for (const g of attrs.groups) {
      const t = attrs.templateById.get(g.templateId);
      if (t && matches(g.name)) hits.groups.push({ group: g, template: t });
    }
    for (const v of attrs.values) {
      const g = attrs.groupById.get(v.groupId);
      const t = g ? attrs.templateById.get(g.templateId) : undefined;
      if (g && t && (matches(v.name) || matches(v.code)))
        hits.values.push({ value: v, group: g, template: t });
    }
  }
  const hitCount = hits.templates.length + hits.groups.length + hits.values.length;

  const visibleCount = searching
    ? hitCount
    : level === 'templates'
      ? visibleTemplates.length
      : level === 'groups'
        ? visibleGroups.length
        : visibleValues.length;

  // Varyant önizlemesi: "Renk × Beden: 5 × 4 = 20 varyant".
  const variantGroups = groups.filter((g) => g.variant && g.valueCount > 0);
  const variantPreview =
    variantGroups.length === 0
      ? null
      : `${variantGroups.map((g) => g.name).join(' × ')}: ${variantGroups
          .map((g) => g.valueCount)
          .join(
            ' × ',
          )}${variantGroups.length > 1 ? ` = ${variantGroups.reduce((n, g) => n * g.valueCount, 1)}` : ''} varyant`;

  const categoryName = (id: string) => cats.byId.get(id)?.name ?? '';

  // ---- Kaydetme / silme ---------------------------------------------------------------------
  const run = async (action: () => Promise<void>, fallback: string) => {
    try {
      await action();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : fallback);
    }
  };

  const saveTemplate = (draft: TemplateDraft) =>
    run(async () => {
      const editing = form?.type === 'template' ? form.id : null;
      await attrs.saveTemplate(draft, editing ?? undefined);
      setForm(null);
      showNotice(editing ? `${draft.name} güncellendi.` : `${draft.name} eklendi.`);
    }, 'Kaydedilemedi.');

  const saveGroup = (draft: GroupDraft) =>
    run(async () => {
      const editing = form?.type === 'group' ? form.id : null;
      const id = await attrs.saveGroup(draft, editing ?? undefined);
      setForm(null);
      showNotice(editing ? `${draft.name} güncellendi.` : `${draft.name} eklendi.`);
      // Grup başka şablona taşındıysa kullanıcı o şablona gider (kaybolmasın).
      if (editing && template && draft.templateId !== template.id) goTo(draft.templateId, id);
    }, 'Kaydedilemedi.');

  const saveValue = (draft: ValueDraft) =>
    run(async () => {
      if (!group) return;
      const editing = form?.type === 'value' ? form.id : null;
      await attrs.saveValue(group.id, draft, editing ?? undefined);
      setForm(null);
      showNotice(editing ? `${draft.name} güncellendi.` : `${draft.name} eklendi.`);
    }, 'Kaydedilemedi.');

  /** Çip üzerinde doğrudan değişiklik (ad/renk/resim): pencere açılmadan kaydedilir. */
  const updateValue = async (v: AttrValue, patch: ValuePatch): Promise<string | null> => {
    if (!group) return null;
    if (
      patch.name !== undefined &&
      values.some((o) => o.id !== v.id && fold(o.name).trim() === fold(patch.name!).trim())
    )
      return 'Bu grupta aynı adda bir özellik zaten var.';
    try {
      await attrs.saveValue(
        group.id,
        {
          code: v.code,
          name: patch.name ?? v.name,
          color: patch.color !== undefined ? patch.color : v.color,
          imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : v.imageUrl,
        },
        v.id,
      );
      return null;
    } catch (error) {
      return dataError(error);
    }
  };

  /** Hızlı giriş: adı yaz, Enter. Hata varsa mesaj döndürülür (kutu açık kalır). */
  const quickAdd = async (names: string[], color: string | null): Promise<string | null> => {
    if (!group) return null;
    const taken = new Set(values.map((v) => fold(v.name).trim()));
    const fresh = names.filter((n) => !taken.has(fold(n).trim()));
    const skipped = names.length - fresh.length;
    if (fresh.length === 0)
      return names.length > 1
        ? 'Bu özelliklerin hepsi grupta zaten var.'
        : 'Bu grupta aynı adda bir özellik zaten var.';
    let added = 0;
    try {
      for (const name of fresh) {
        // Birden çok renk yazıldıysa adı tanınan renkler kendi rengini alır.
        const own = color !== null && names.length > 1 ? (colorByName(name) ?? color) : color;
        await attrs.saveValue(group.id, { code: slugify(name), name, color: own, imageUrl: null });
        added++;
      }
    } catch (error) {
      if (added > 0) showNotice(`${added} özellik eklendi.`);
      return dataError(error);
    }
    const summary =
      fresh.length === 1
        ? `${fresh[0]} eklendi.`
        : fresh.length <= 4
          ? `${fresh.join(', ')} eklendi.`
          : `${fresh.length} özellik eklendi.`;
    showNotice(skipped > 0 ? `${summary} ${skipped} tanesi zaten vardı.` : summary);
    return null;
  };

  /** Şablonu gruplarıyla ve özellikleriyle kopyalar: "Ad (Kopya)", doluysa "(Kopya 2)". */
  const copyTemplate = (t: AttrTemplate) => {
    setSwipeOpenId(null);
    const taken = new Set(templates.map((x) => fold(x.name)));
    let name = `${t.name} (Kopya)`;
    for (let n = 2; taken.has(fold(name)); n++) name = `${t.name} (Kopya ${n})`;
    void run(async () => {
      await attrs.copyTemplate(name, t);
      showNotice(`${name} oluşturuldu.`);
    }, 'Kopyalanamadı.');
  };

  // Silinecek özelliği kullanan ürünler ("Şu ürünlerden kalkacak").
  const [usage, setUsage] = useState<{
    total: number;
    products: { id: string; name: string }[];
  } | null>(null);
  const askDeleteValue = (v: AttrValue) => {
    setUsage(null);
    setDeleting({ type: 'value', item: v });
    attrs
      .valueProducts(v.id)
      .then(setUsage)
      .catch(() => undefined);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setUsage(null);
    setSwipeOpenId(null);
    setForm(null);
    await run(async () => {
      if (target.type === 'template') {
        await attrs.removeTemplate(target.item.id);
        if (template?.id === target.item.id) goTo(null);
      } else if (target.type === 'group') {
        await attrs.removeGroup(target.item.id);
        if (group?.id === target.item.id) goTo(target.item.templateId);
      } else {
        await attrs.removeValue(target.item.id);
      }
      showNotice(`${target.item.name} silindi.`);
    }, 'Silinemedi.');
  };

  const deleteText = (d: NonNullable<Deleting>): string => {
    if (d.type === 'template')
      return d.item.groupCount > 0
        ? `${d.item.name} şablonu, içindeki ${d.item.groupCount} grup ve tüm özellikleriyle birlikte silinecek.`
        : `${d.item.name} şablonu kalıcı olarak silinecek.`;
    if (d.type === 'group')
      return d.item.valueCount > 0
        ? `${d.item.name} grubu ve içindeki ${d.item.valueCount} özellik silinecek.`
        : `${d.item.name} grubu kalıcı olarak silinecek.`;
    return `${d.item.name} özelliği kalıcı olarak silinecek.`;
  };

  // ---- Seviyeye göre "+" ----------------------------------------------------------------------
  const addLabel =
    level === 'templates' ? 'Şablon Ekle' : level === 'groups' ? 'Grup Ekle' : 'Özellik Ekle';
  const openAdd = () =>
    setForm({
      type: level === 'templates' ? 'template' : level === 'groups' ? 'group' : 'value',
      id: null,
    });
  usePublishAddAction(addLabel, openAdd);

  const editingTemplate =
    form?.type === 'template' && form.id ? (attrs.templateById.get(form.id) ?? null) : null;
  const editingGroup =
    form?.type === 'group' && form.id ? (attrs.groupById.get(form.id) ?? null) : null;

  const rowCommon = (id: string) => ({
    phone,
    sortingDisabled: searching,
    swipeOpen: swipeOpenId === id,
    onSwipeOpenChange: (open: boolean) => setSwipeOpenId(open ? id : null),
  });

  // ---- Seviye içeriği ---------------------------------------------------------------------------
  let content: ReactNode;
  if (attrs.loading) {
    content = (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[4.5rem] animate-pulse rounded-3xl bg-surface-muted" />
        ))}
      </div>
    );
  } else if (visibleCount === 0) {
    content = searching ? (
      <EmptyState
        title="Eşleşen sonuç yok"
        text={`"${query.trim()}" ile eşleşen bir şey bulunamadı.`}
      />
    ) : level === 'templates' ? (
      <EmptyState
        title="Henüz şablon yok"
        text="Şablon, ürünlerin hangi özelliklere sahip olacağını belirler. İlkini ekleyerek başla."
        action={
          <Button fullWidth={false} flow={false} onClick={openAdd}>
            İlk Şablonu Ekle
          </Button>
        }
      />
    ) : level === 'groups' ? (
      <EmptyState
        title={`${template?.name ?? 'Şablon'} içinde grup yok`}
        text="Grup, özellikleri toplar (ör. İşletim Sistemi, Renk). İlk grubu ekle."
        action={
          <Button fullWidth={false} flow={false} onClick={openAdd}>
            İlk Grubu Ekle
          </Button>
        }
      />
    ) : (
      <EmptyState
        title={`${group?.name ?? 'Grup'} içinde özellik yok`}
        text="Yukarıdaki kutuya adı yazıp Enter'a basarak ilk özelliği ekle."
      />
    );
  } else if (searching) {
    content = (
      <SearchResults
        hits={hits}
        onOpenTemplate={(id) => goTo(id)}
        onOpenGroup={(templateId, groupId) => goTo(templateId, groupId)}
      />
    );
  } else if (level === 'templates') {
    content = (
      <SortableList
        label="Şablonlar"
        items={visibleTemplates}
        getId={(t) => t.id}
        getLabel={(t) => t.name}
        disabled={searching}
        onDragStart={() => setSwipeOpenId(null)}
        onReorder={(next) => attrs.reorderTemplates(next)}
        renderItem={(t, ctx) => (
          <AttributeRow
            {...rowCommon(t.id)}
            id={t.id}
            name={t.name}
            sortable={ctx}
            labels={{
              open: `${t.name} şablonunu aç`,
              edit: `${t.name} şablonunu düzenle`,
              remove: `${t.name} şablonunu sil`,
              copy: `${t.name} şablonunu kopyala`,
            }}
            tags={
              <>
                {t.allProducts ? (
                  <Tag tone="green">Tüm ürünler</Tag>
                ) : (
                  <>
                    {t.categoryIds.slice(0, 2).map((id) => (
                      <Tag key={id} tone="green">
                        {categoryName(id)}
                      </Tag>
                    ))}
                    {t.categoryIds.length > 2 ? (
                      <Tag tone="green">+{t.categoryIds.length - 2}</Tag>
                    ) : null}
                  </>
                )}
                <Tag tone="gray">{t.groupCount} grup</Tag>
              </>
            }
            onOpen={() => goTo(t.id)}
            onCopy={() => copyTemplate(t)}
            onEdit={() => {
              setSwipeOpenId(null);
              setForm({ type: 'template', id: t.id });
            }}
            onDelete={() => setDeleting({ type: 'template', item: t })}
          />
        )}
      />
    );
  } else if (level === 'groups') {
    content = (
      <SortableList
        label="Gruplar"
        items={visibleGroups}
        getId={(g) => g.id}
        getLabel={(g) => g.name}
        disabled={searching}
        onDragStart={() => setSwipeOpenId(null)}
        onReorder={(next) => template && attrs.reorderGroups(template.id, next)}
        renderItem={(g, ctx) => (
          <AttributeRow
            {...rowCommon(g.id)}
            id={g.id}
            name={g.name}
            sortable={ctx}
            labels={{
              open: `${g.name} grubunu aç`,
              edit: `${g.name} grubunu düzenle`,
              remove: `${g.name} grubunu sil`,
            }}
            tags={
              <>
                {g.kind !== 'text' ? <Tag>{kindLabel(g.kind)}</Tag> : null}
                {g.filter ? <Tag>Filtre</Tag> : null}
                {g.multiple ? <Tag>Çoklu</Tag> : null}
                {g.variant ? <Tag>Varyant</Tag> : null}
                <Tag tone="gray">{g.valueCount} özellik</Tag>
              </>
            }
            onOpen={() => goTo(g.templateId, g.id)}
            onEdit={() => {
              setSwipeOpenId(null);
              setForm({ type: 'group', id: g.id });
            }}
            onDelete={() => setDeleting({ type: 'group', item: g })}
          />
        )}
      />
    );
  } else if (group) {
    content = (
      <SortableGrid
        label="Özellikler"
        items={visibleValues}
        getId={(v) => v.id}
        getLabel={(v) => v.name}
        disabled={searching}
        className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        onReorder={(next) => attrs.reorderValues(group.id, next)}
        renderItem={(v, ctx) => (
          <ValueTile
            value={v}
            kind={group.kind}
            sortable={ctx}
            onUpdate={(patch) => updateValue(v, patch)}
            onDelete={() => askDeleteValue(v)}
          />
        )}
      />
    );
  }

  const hint = searching
    ? 'Tüm şablon, grup ve özellikler aranıyor.'
    : level === 'values'
      ? phone
        ? 'Çift dokununca adı değişir · çöp kutusu siler · basılı tutup sürükleyerek sırala.'
        : 'Çift tıklayınca ad (renk/resim) yerinde değişir · çöp kutusu siler · sıralamak için çipi tutup sürükleyin.'
      : phone
        ? 'Dokununca içine girilir · basılı tutup sürükleyerek sırala · sola kaydırınca işlemler.'
        : 'Tıklayınca içine girilir · sıralamak için ⠿ tutamağından sürükleyin.';

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {attrs.error || cats.error ? (
        <Alert tone="error">
          {attrs.error || cats.error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => {
              void attrs.refresh();
              void cats.refresh();
            }}
          >
            Tekrar Dene
          </button>
        </Alert>
      ) : null}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <SearchField
            value={query}
            onChange={setQuery}
            label="Özellik ara"
            placeholder="Şablon, grup veya özellik ara…"
          />
        </div>
      </div>

      {/* Yol: telefonda yatay kayar; her halka dokununca o seviyeye döner. */}
      <nav aria-label="Özellik yolu" className="flex min-w-0 items-center gap-1.5">
        {template ? (
          <button
            type="button"
            onClick={() => (group ? goTo(template.id) : goTo(null))}
            aria-label="Bir üst seviyeye çık"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-brand-50 hover:text-brand-ink"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        ) : null}
        <ol className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 text-sm font-bold [scrollbar-width:none]">
          <li className="shrink-0">
            <Crumb active={!template} onClick={() => goTo(null)}>
              Şablonlar
            </Crumb>
          </li>
          {template ? (
            <li className="flex shrink-0 items-center gap-1.5">
              <span aria-hidden="true" className="text-ink-muted">
                ›
              </span>
              <Crumb active={!group} onClick={() => goTo(template.id)}>
                {template.name}
              </Crumb>
            </li>
          ) : null}
          {group ? (
            <li className="flex shrink-0 items-center gap-1.5">
              <span aria-hidden="true" className="text-ink-muted">
                ›
              </span>
              <Crumb active onClick={() => undefined}>
                {group.name}
              </Crumb>
            </li>
          ) : null}
        </ol>
      </nav>

      {template && !group && !searching ? (
        <ContextCard
          title={template.name}
          onEdit={() => setForm({ type: 'template', id: template.id })}
          editLabel="Şablonu Düzenle"
        >
          {variantPreview ? <Tag>{variantPreview}</Tag> : null}
          {template.allProducts ? (
            <Tag tone="green">Tüm ürünlerde kullanılır</Tag>
          ) : (
            template.categoryIds.map((id) => (
              <Tag key={id} tone="green">
                {categoryName(id)}
              </Tag>
            ))
          )}
        </ContextCard>
      ) : null}
      {group && !searching ? (
        <ContextCard
          title={group.name}
          onEdit={() => setForm({ type: 'group', id: group.id })}
          editLabel="Grubu Düzenle"
        >
          <Tag>{kindLabel(group.kind)}</Tag>
          {group.filter ? <Tag>Filtre</Tag> : null}
          {group.multiple ? <Tag>Çoklu</Tag> : null}
          {group.variant ? <Tag>Varyant</Tag> : null}
          {group.kind === 'image' && group.showOnImage ? <Tag>Ürün resminde göster</Tag> : null}
        </ContextCard>
      ) : null}

      {group && !searching ? (
        <QuickAddBar kind={group.kind} onAdd={quickAdd} onOpenForm={openAdd} />
      ) : null}

      <p className="px-2 text-sm text-ink-muted">{hint}</p>

      <div
        key={`${template?.id ?? 'kok'}-${group?.id ?? ''}-${searching}`}
        className="animate-fade-in"
      >
        {content}
      </div>

      {notice ? (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-28"
        >
          <p className="pointer-events-auto animate-rise-in rounded-full bg-ink px-5 py-3 text-sm font-semibold text-surface shadow-card">
            {notice}
          </p>
        </div>
      ) : null}

      {form?.type === 'template' ? (
        <TemplateFormSheet
          key={form.id ?? 'yeni-sablon'}
          template={editingTemplate}
          categories={cats.categories}
          onSave={saveTemplate}
          saveError={attrs.error}
          onClose={() => setForm(null)}
        />
      ) : null}
      {form?.type === 'group' ? (
        <GroupFormSheet
          key={form.id ?? 'yeni-grup'}
          group={editingGroup}
          defaultTemplateId={template?.id ?? null}
          templates={templates}
          onSave={saveGroup}
          saveError={attrs.error}
          onClose={() => setForm(null)}
        />
      ) : null}
      {form?.type === 'value' && group ? (
        <ValueFormSheet
          key="yeni-ozellik"
          group={group}
          takenNames={values.map((v) => v.name)}
          onSave={saveValue}
          saveError={attrs.error}
          onClose={() => setForm(null)}
        />
      ) : null}
      <ConfirmSheet
        open={deleting !== null}
        danger
        title={deleting ? `${deleting.item.name} Silinsin Mi?` : ''}
        description={deleting ? deleteText(deleting) : ''}
        confirmLabel="Sil"
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          setDeleting(null);
          setUsage(null);
        }}
      >
        {deleting?.type === 'value' && usage && usage.total > 0 ? (
          <div className="mb-4 flex flex-col gap-2 rounded-2xl bg-danger-soft p-3 text-sm">
            <p className="font-bold text-danger">Şu ürünlerden kalkacak ({usage.total})</p>
            <ul className="flex flex-col gap-1">
              {usage.products.slice(0, 8).map((p) => (
                <li key={p.id} className="truncate">
                  {p.name}
                </li>
              ))}
            </ul>
            {usage.total > Math.min(usage.products.length, 8) ? (
              <p className="text-ink-muted">
                +{usage.total - Math.min(usage.products.length, 8)} ürün daha
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmSheet>
    </div>
  );
}

/** İçinde bulunulan şablon/grubun özet kartı + düzenle düğmesi. */
function ContextCard({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <b className="block truncate text-base text-brand-ink">{title}</b>
        <div className="mt-1.5 flex flex-wrap gap-1.5 [&>span]:bg-surface-raised">{children}</div>
      </div>
      <Button fullWidth={false} flow={false} variant="outline" onClick={onEdit}>
        {editLabel}
      </Button>
    </div>
  );
}

function Crumb({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // Uzun yolda aktif halka telefonda görünür alana kayar.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
  }, [active]);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={[
        'inline-flex min-h-10 items-center rounded-full px-3.5 whitespace-nowrap transition-colors',
        active ? 'bg-brand-700 text-white' : 'bg-surface-muted text-ink-muted hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-line-strong/60 bg-surface-raised px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-ink">
        <Layers className="size-7" aria-hidden="true" />
      </span>
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-md text-ink-muted">{text}</p>
      {action}
    </div>
  );
}
