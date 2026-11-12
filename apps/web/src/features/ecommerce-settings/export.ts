/**
 * E-Ticaret ekranlarındaki "Dışa Aktar" düğmeleri için küçük CSV üretici.
 * Noktalı virgül ayırıcı ve BOM kullanılır: Excel Türkçe karakterleri ve ondalık virgülü doğru okur.
 */
export function downloadCsv(
  fileName: string,
  rows: readonly (readonly (string | number | boolean | null)[])[],
) {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? '' : String(cell);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(';'),
    )
    .join('\r\n');
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
