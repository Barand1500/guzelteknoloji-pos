import { ChevronRight, FolderInput, Home } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { branchOf, pathTo } from '../tree';
import type { Category } from '../types';
import { CategoryImage } from './CategoryImage';

interface CategoryMovePanelProps {
  category: Category;
  categories: Category[];
  /** Hedef: üst kategorinin kimliği; null ise ana kategori olur. */
  onMove: (parentId: string | null) => Promise<void>;
}

/**
 * "Nereye taşınsın?" paneli. Klasör gezer gibi çalışır: istediğin kategoriye dokunup içine gir,
 * oradayken alttaki "Buraya Taşı" düğmesine bas. En üst seviye için "Ana Kategoriler" seçilir.
 * Kategori kendi içine (alt dallarına) taşınamaz; o dallar listede görünmez.
 */
export function CategoryMovePanel({ category, categories, onMove }: CategoryMovePanelProps) {
  const [browseId, setBrowseId] = useState<string | null>(category.parentId);
  const [busy, setBusy] = useState(false);

  const blocked = branchOf(categories, category.id);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path = pathTo(byId, browseId);
  const here = browseId ? byId.get(browseId) : undefined;
  const folders = categories.filter((c) => c.parentId === browseId && !blocked.has(c.id));
  const alreadyHere = browseId === category.parentId;
  const currentPlace = category.parentId
    ? (byId.get(category.parentId)?.name ?? 'Ana Kategoriler')
    : 'Ana Kategoriler';

  const move = async () => {
    setBusy(true);
    try {
      await onMove(browseId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4">
      <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">
        <b className="text-ink">{category.name}</b> şu an <b className="text-ink">{currentPlace}</b>{' '}
        içinde. Gitmesini istediğin yere dokunarak gir, sonra alttaki düğmeye bas.
      </p>

      <nav aria-label="Taşıma konumu">
        <ol className="flex items-center gap-1.5 overflow-x-auto py-1 text-sm font-bold [scrollbar-width:none]">
          <li className="shrink-0">
            <PathChip active={browseId === null} onClick={() => setBrowseId(null)}>
              <Home className="mr-1.5 size-4" aria-hidden="true" />
              Ana Kategoriler
            </PathChip>
          </li>
          {path.map((p, i) => (
            <li key={p.id} className="flex shrink-0 items-center gap-1.5">
              <span aria-hidden="true" className="text-ink-muted">
                ›
              </span>
              <PathChip active={i === path.length - 1} onClick={() => setBrowseId(p.id)}>
                {p.name}
              </PathChip>
            </li>
          ))}
        </ol>
      </nav>

      {folders.length === 0 ? (
        <div className="rounded-3xl bg-surface-muted px-4 py-8 text-center text-ink-muted">
          {here ? `${here.name} içinde başka kategori yok.` : 'Henüz kategori yok.'}
          <br />
          Aşağıdaki düğmeyle buraya taşıyabilirsin.
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Gidilebilecek kategoriler">
          {folders.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setBrowseId(c.id)}
                aria-label={`${c.name} içine gir`}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-brand-500/70"
              >
                <CategoryImage category={c} className="size-11 rounded-xl text-xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {c.childCount > 0 ? `${c.childCount} alt kategori` : 'Alt kategori yok'}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex-1" />

      {/* Alt çubuk: hedef her zaman açıkça yazılır, yanlış yere taşınmasın. */}
      <div className="sticky -bottom-6 z-10 -mx-6 -mb-6 flex flex-col gap-2 border-t border-line bg-surface-raised px-6 pt-3 pb-6">
        <p className="text-sm text-ink-muted" aria-live="polite">
          Hedef: <b className="text-ink">{here ? here.name : 'Ana Kategoriler'}</b>
        </p>
        <Button
          flow={false}
          disabled={alreadyHere}
          loading={busy}
          loadingLabel="Taşınıyor…"
          onClick={() => void move()}
          leadingIcon={<FolderInput className="size-5" aria-hidden="true" />}
        >
          {alreadyHere ? 'Zaten Burada' : 'Buraya Taşı'}
        </Button>
      </div>
    </div>
  );
}

function PathChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
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
