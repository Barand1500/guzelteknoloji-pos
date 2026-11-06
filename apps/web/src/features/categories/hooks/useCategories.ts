import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryService } from '../services/category.service';
import type { Category, CategoryDraft } from '../types';

/**
 * Kategori ağacının durumu (düz liste). Aç/kapa ve sıralama "iyimser" çalışır: ekran anında
 * güncellenir, servis arkadan kaydeder. Gerçek API gelince yalnızca category.service.ts değişir.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void categoryService.list().then((list) => {
      if (!active) return;
      setCategories(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  /** Sayılar (ürün/alt kategori) değişen işlemlerden sonra listeyi sunucudan tazeler. */
  const refresh = useCallback(async () => setCategories(await categoryService.list()), []);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const toggleActive = (id: string, active: boolean) => {
    setCategories((list) => list.map((c) => (c.id === id ? { ...c, active } : c)));
    void categoryService.setActive(id, active);
  };

  /** Bir üst kategorinin kardeşlerini yeniden sıralar; diğer kategoriler yerinde kalır. */
  const reorder = (parentId: string | null, next: Category[]) => {
    let i = 0;
    setCategories((list) => list.map((c) => (c.parentId === parentId ? (next[i++] ?? c) : c)));
    void categoryService.reorder(
      parentId,
      next.map((c) => c.id),
    );
  };

  /** Kimlik verilirse günceller, verilmezse yeni kategori ekler (kardeşlerin sonuna). */
  const save = async (draft: CategoryDraft, id?: string): Promise<Category> => {
    const saved = id
      ? await categoryService.update(id, draft)
      : await categoryService.create(draft);
    await refresh();
    return saved;
  };

  /** Kategoriyi başka bir üst kategorinin altına taşır (null: ana kategori olur). */
  const move = async (id: string, parentId: string | null) => {
    await categoryService.move(id, parentId);
    await refresh();
  };

  const remove = async (id: string) => {
    await categoryService.remove(id);
    await refresh();
  };

  const assign = async (categoryId: string, productIds: string[]) => {
    await categoryService.assignProducts(categoryId, productIds);
    await refresh();
  };

  const unassign = async (categoryId: string, productIds: string[]) => {
    await categoryService.unassignProducts(categoryId, productIds);
    await refresh();
  };

  return { categories, byId, loading, toggleActive, reorder, save, move, remove, assign, unassign };
}
