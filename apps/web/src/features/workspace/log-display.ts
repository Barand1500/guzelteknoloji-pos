import type { WorkspaceLog } from '@gt/shared';

// Audit records retain their original data; the detail view only shows business fields.
const hiddenField =
  /(?:^|\.)(?:[^.]*kimli(?:k|gi|ği)|[^.]*Id|id|sıra|sira|oluşturma zamanı|güncelleme zamanı|olusturmaZamani|guncellemeZamani|createdAt|updatedAt|[^.]*Hash|[^.]*Dosyasi|[^.]*Verisi)(?:$|\[)/i;

export function visibleLogChanges(changes: WorkspaceLog['changes']) {
  return changes
    .filter((change) => !hiddenField.test(change.field))
    .map((change) => ({
      ...change,
      field: change.field.replace(/\[(\d+)\]/g, ' $1').replace(/\./g, ' · '),
      before: displayValue(change.field, change.before),
      after: displayValue(change.field, change.after),
    }));
}

function displayValue(field: string, value: string | null): string | null {
  if (value === 'true') return 'Evet';
  if (value === 'false') return 'Hayır';
  if (/Envanter Takibi/i.test(field)) {
    if (value === 'normal') return 'Evet';
    if (value === 'yok') return 'Hayır';
  }
  if (/Alış\/Satış/i.test(field)) {
    if (value === 'alis') return 'Alış';
    if (value === 'satis') return 'Satış';
  }
  return value;
}
