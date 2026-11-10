import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AttrGroup, AttrTemplate, AttrValue } from '../types';
import { CatalogImage } from '../../../components/ui/CatalogImage';

export interface SearchHits {
  templates: AttrTemplate[];
  groups: { group: AttrGroup; template: AttrTemplate }[];
  values: { value: AttrValue; group: AttrGroup; template: AttrTemplate }[];
}

interface SearchResultsProps {
  hits: SearchHits;
  onOpenTemplate: (templateId: string) => void;
  onOpenGroup: (templateId: string, groupId: string) => void;
}

const MAX_VALUES = 60;

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-bold text-ink-muted">
        {title} <span className="font-semibold">· {count}</span>
      </h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function Hit({
  onClick,
  lead,
  title,
  path,
}: {
  onClick: () => void;
  lead?: ReactNode;
  title: string;
  path?: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface-raised px-3 py-2 text-left transition-colors hover:border-brand-500/60"
      >
        {lead}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{title}</span>
          {path ? <span className="block truncate text-sm text-ink-muted">{path}</span> : null}
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
      </button>
    </li>
  );
}

/**
 * Tek aramada şablon, grup ve özelliklerin hepsi bulunur; her sonucun altında bulunduğu yer
 * ("Şablon › Grup") yazar, dokununca o yere gidilir.
 */
export function SearchResults({ hits, onOpenTemplate, onOpenGroup }: SearchResultsProps) {
  return (
    <div className="flex flex-col gap-5">
      {hits.templates.length > 0 ? (
        <Section title="Şablonlar" count={hits.templates.length}>
          {hits.templates.map((t) => (
            <Hit key={t.id} title={t.name} onClick={() => onOpenTemplate(t.id)} />
          ))}
        </Section>
      ) : null}
      {hits.groups.length > 0 ? (
        <Section title="Gruplar" count={hits.groups.length}>
          {hits.groups.map(({ group, template }) => (
            <Hit
              key={group.id}
              title={group.name}
              path={template.name}
              onClick={() => onOpenGroup(template.id, group.id)}
            />
          ))}
        </Section>
      ) : null}
      {hits.values.length > 0 ? (
        <Section title="Özellikler" count={hits.values.length}>
          {hits.values.slice(0, MAX_VALUES).map(({ value, group, template }) => (
            <Hit
              key={value.id}
              title={value.name}
              path={`${template.name} › ${group.name}`}
              onClick={() => onOpenGroup(template.id, group.id)}
              lead={
                group.kind === 'color' ? (
                  <span
                    aria-hidden="true"
                    className="size-7 shrink-0 rounded-lg ring-1 ring-black/15"
                    style={{ backgroundColor: value.color ?? '#9ca3af' }}
                  />
                ) : group.kind === 'image' && value.imageUrl ? (
                  <CatalogImage
                    page="attributes"
                    src={value.imageUrl}
                    alt=""
                    className="size-7 shrink-0 rounded-lg object-cover"
                  />
                ) : null
              }
            />
          ))}
        </Section>
      ) : null}
    </div>
  );
}
