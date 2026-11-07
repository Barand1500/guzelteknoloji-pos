import { matchesFilters, type ProductItem, type ProductPageQuery } from './types';

export function productQueryString(query: ProductPageQuery) {
  return new URLSearchParams({
    arama: query.search.trim(),
    sayfa: String(query.page),
    boyut: String(query.pageSize),
    kategoriler: query.filters.categoryIds.join(','),
    markalar: query.filters.brandIds.join(','),
    stok: query.filters.stock,
    satis: query.filters.sales,
    firsat: query.filters.deal,
    en_az: query.filters.minPrice.replace(',', '.'),
    en_cok: query.filters.maxPrice.replace(',', '.'),
  }).toString();
}

export function filterDemoProducts(items: ProductItem[], query: ProductPageQuery) {
  const search = query.search.trim().toLocaleLowerCase('tr');
  return items.filter(
    (p) =>
      matchesFilters(p, query.filters) &&
      (!search ||
        [p.code, p.name, p.brandName, ...(p.barcodes ?? [p.barcode ?? ''])].some((value) =>
          value.toLocaleLowerCase('tr').includes(search),
        )),
  );
}

export function productFilterOptions(items: ProductItem[]) {
  return {
    categories: [
      ...new Map(
        items.flatMap((p) =>
          (p.categoryIds ?? []).map((id, index) => [
            id,
            p.categoryNames?.[index] ?? p.categoryName ?? id,
          ]),
        ),
      ),
    ].map(([id, name]) => ({ id, name })),
    brands: [...new Map(items.filter((p) => p.brandId).map((p) => [p.brandId!, p.brandName]))].map(
      ([id, name]) => ({ id, name }),
    ),
  };
}
