import type { ScanItem } from '../context/AppProvider';

function formatExportDate(dateValue: string): string {
  return new Date(dateValue).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function sanitizeExportFileName(value: string): string {
  const withoutExtension = value.trim().replace(/\.txt$/i, '');
  const sanitized = withoutExtension
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[.\s]+$/g, '')
    .slice(0, 80);

  return sanitized || 'historico_qrcodes';
}

export function getDefaultHistoryExportName(): string {
  const today = new Date();
  const date = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  return `historico_qrcodes_${date}`;
}

export function buildHistoryExportText(items: ScanItem[]): string {
  return items
    .map((item, index) =>
      [`${index + 1}. Horário: ${formatExportDate(item.date)}`, item.data.trim()].join('\r\n')
    )
    .join('\r\n\r\n');
}
