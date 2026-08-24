const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const content = '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
