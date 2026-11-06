import type { Category } from './types';

/** Ağacı derinlik sırasıyla (üst kategori, hemen altında alt kategorileri) düz listeye çevirir. */
export function flattenTree(categories: Category[]): { category: Category; depth: number }[] {
  const out: { category: Category; depth: number }[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const category of categories) {
      if (category.parentId !== parentId) continue;
      out.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

/** Kategorinin kendisi ve tüm alt dalları (bir kategori kendi dalına taşınamaz). */
export function branchOf(categories: Category[], id: string): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Ana kategoriden başlayıp verilen kategoriye kadar olan yol (kendisi dahil). */
export function pathTo(byId: Map<string, Category>, id: string | null): Category[] {
  const path: Category[] = [];
  let current = id ? byId.get(id) : undefined;
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
