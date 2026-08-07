import type { ScanItem } from '../context/AppProvider';
import { getQrContentSummary, parseQrContent } from './qr-content';

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
  const separator = '='.repeat(72);
  const itemSeparator = '-'.repeat(72);
  const lines = [
    'SCANNER QR — EXPORTAÇÃO DO HISTÓRICO',
    separator,
    `Gerado em: ${formatExportDate(new Date().toISOString())}`,
    `Total de itens: ${items.length}`,
    separator,
    '',
  ];

  items.forEach((item, index) => {
    const parsedContent = parseQrContent(item.data);
    const summary = getQrContentSummary(parsedContent);

    lines.push(
      `[${index + 1}] ${summary.title.toUpperCase()}`,
      `Data da leitura: ${formatExportDate(item.date)}`,
      `Tipo identificado: ${summary.title}`,
      `Resumo: ${summary.subtitle}`,
      '',
      'CONTEÚDO ORIGINAL',
      item.data.trim(),
      '',
      index < items.length - 1 ? itemSeparator : separator,
      ''
    );
  });

  lines.push('Fim da exportação.');
  return lines.join('\r\n');
}
