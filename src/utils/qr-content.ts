export type WifiSecurity = 'WPA' | 'WEP' | 'nopass' | string;

export type WifiQrContent = {
  kind: 'wifi';
  raw: string;
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
};

export type PixKeyType = 'CPF' | 'CNPJ' | 'E-mail' | 'Celular' | 'Aleatória' | 'Desconhecida';

export type PixQrContent = {
  kind: 'pix';
  raw: string;
  key?: string;
  keyType: PixKeyType;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  description?: string;
  txid?: string;
  dynamicUrl?: string;
  isDynamic: boolean;
  isPayload: boolean;
  crcValid: boolean | null;
};

export type UrlQrContent = {
  kind: 'url';
  raw: string;
  url: string;
};

export type AppQrContent = {
  kind: 'app';
  raw: string;
  uri: string;
  appType: 'E-mail' | 'Telefone' | 'SMS' | 'Localização' | 'Aplicativo';
  displayValue: string;
};

export type TextQrContent = {
  kind: 'text';
  raw: string;
};

export type ParsedQrContent =
  | WifiQrContent
  | PixQrContent
  | UrlQrContent
  | AppQrContent
  | TextQrContent;

type TlvField = {
  id: string;
  value: string;
  start: number;
};

function utf8ByteLength(value: string): number {
  let length = 0;

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) length += 1;
    else if (codePoint <= 0x7ff) length += 2;
    else if (codePoint <= 0xffff) length += 3;
    else length += 4;
  }

  return length;
}

function takeUtf8Bytes(
  input: string,
  start: number,
  expectedBytes: number
): { value: string; end: number } | null {
  let cursor = start;
  let byteCount = 0;

  while (cursor < input.length && byteCount < expectedBytes) {
    const codePoint = input.codePointAt(cursor);
    if (codePoint === undefined) return null;

    const characterLength = codePoint > 0xffff ? 2 : 1;
    const character = input.slice(cursor, cursor + characterLength);
    const characterBytes = utf8ByteLength(character);

    if (byteCount + characterBytes > expectedBytes) return null;

    byteCount += characterBytes;
    cursor += characterLength;
  }

  if (byteCount !== expectedBytes) return null;
  return { value: input.slice(start, cursor), end: cursor };
}

function parseTlv(input: string): TlvField[] | null {
  const fields: TlvField[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    if (cursor + 4 > input.length) return null;

    const start = cursor;
    const id = input.slice(cursor, cursor + 2);
    const lengthText = input.slice(cursor + 2, cursor + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lengthText)) return null;

    const valueLength = Number(lengthText);
    const valueResult = takeUtf8Bytes(input, cursor + 4, valueLength);
    if (!valueResult) return null;

    fields.push({ id, value: valueResult.value, start });
    cursor = valueResult.end;
  }

  return fields;
}

function getField(fields: TlvField[], id: string): string | undefined {
  return fields.find((field) => field.id === id)?.value;
}

function crc16Ccitt(value: string): string {
  const bytes: number[] = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }

  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function validateCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(value[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(value[9]) && calculateDigit(10) === Number(value[10]);
}

function validateCnpj(value: string): boolean {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;

  const calculateDigit = (length: 12 | 13) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(value[12]) && calculateDigit(13) === Number(value[13]);
}

export function identifyPixKeyType(value: string): PixKeyType {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'E-mail';
  if (/^\+55\d{10,11}$/.test(trimmed)) return 'Celular';
  if (validateCpf(digits) && (/^\d{11}$/.test(trimmed) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(trimmed))) {
    return 'CPF';
  }
  if (
    validateCnpj(digits) &&
    (/^\d{14}$/.test(trimmed) || /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(trimmed))
  ) {
    return 'CNPJ';
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return 'Aleatória';
  }

  return 'Desconhecida';
}

function parsePixPayload(raw: string): PixQrContent | null {
  const fields = parseTlv(raw);
  if (!fields || getField(fields, '00') !== '01') return null;

  const merchantAccount = fields
    .filter((field) => Number(field.id) >= 26 && Number(field.id) <= 51)
    .map((field) => parseTlv(field.value))
    .find(
      (nestedFields) =>
        nestedFields && getField(nestedFields, '00')?.toLowerCase() === 'br.gov.bcb.pix'
    );

  if (
    !merchantAccount ||
    getField(fields, '53') !== '986' ||
    getField(fields, '58')?.toUpperCase() !== 'BR'
  ) {
    return null;
  }

  const key = getField(merchantAccount, '01');
  const dynamicUrl = getField(merchantAccount, '25');
  const amountText = getField(fields, '54');
  const amount = amountText && /^\d+(?:\.\d{1,2})?$/.test(amountText) ? Number(amountText) : undefined;
  const additionalData = getField(fields, '62');
  const additionalFields = additionalData ? parseTlv(additionalData) : null;
  const crcField = fields.find((field) => field.id === '63');
  const crcValid = crcField
    ? crc16Ccitt(raw.slice(0, crcField.start + 4)) === crcField.value.toUpperCase()
    : null;

  return {
    kind: 'pix',
    raw,
    key,
    keyType: key ? identifyPixKeyType(key) : 'Desconhecida',
    merchantName: getField(fields, '59'),
    merchantCity: getField(fields, '60'),
    amount: Number.isFinite(amount) ? amount : undefined,
    description: getField(merchantAccount, '02'),
    txid: additionalFields ? getField(additionalFields, '05') : undefined,
    dynamicUrl,
    isDynamic: Boolean(dynamicUrl),
    isPayload: true,
    crcValid,
  };
}

function splitWifiFields(input: string): string[] {
  const fields: string[] = [];
  let current = '';
  let escaped = false;

  for (const character of input) {
    if (escaped) {
      current += `\\${character}`;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ';') {
      fields.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  if (escaped) current += '\\';
  if (current) fields.push(current);
  return fields;
}

function findUnescapedColon(input: string): number {
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ':') {
      return index;
    }
  }

  return -1;
}

function unescapeWifiValue(value: string): string {
  const unescaped = value.replace(/\\([\\;,:"])/g, '$1').trim();
  return unescaped.startsWith('"') && unescaped.endsWith('"')
    ? unescaped.slice(1, -1)
    : unescaped;
}

function parseWifiPayload(raw: string): WifiQrContent | null {
  const isDpp = /^DPP:/i.test(raw);
  if (!/^WIFI:/i.test(raw) && !isDpp) return null;

  if (/^WIFI:\/\//i.test(raw)) {
    try {
      const parsedUrl = new URL(raw);
      const ssid =
        parsedUrl.searchParams.get('ssid') ||
        parsedUrl.searchParams.get('s') ||
        decodeURIComponent(parsedUrl.hostname);
      if (!ssid) return null;

      return {
        kind: 'wifi',
        raw,
        ssid,
        password:
          parsedUrl.searchParams.get('password') || parsedUrl.searchParams.get('p') || '',
        security:
          parsedUrl.searchParams.get('type') || parsedUrl.searchParams.get('t') || 'WPA',
        hidden:
          (parsedUrl.searchParams.get('hidden') || parsedUrl.searchParams.get('h'))?.toLowerCase() ===
          'true',
      };
    } catch {
      return null;
    }
  }

  const values: Record<string, string> = {};
  for (const field of splitWifiFields(raw.slice(isDpp ? 4 : 5))) {
    const separator = findUnescapedColon(field);
    if (separator < 0) continue;

    const key = field.slice(0, separator).toUpperCase();
    values[key] = unescapeWifiValue(field.slice(separator + 1));
  }

  const ssid = values.S || (isDpp ? 'SSID não informado' : '');
  if (!ssid) return null;

  return {
    kind: 'wifi',
    raw,
    ssid,
    password: values.P ?? '',
    security: isDpp ? 'DPP' : values.T || 'nopass',
    hidden: values.H?.toLowerCase() === 'true',
  };
}

function parseWifiJson(raw: string): WifiQrContent | null {
  if (!raw.startsWith('{')) return null;

  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const ssid = value.ssid ?? value.SSID ?? value.network;
    if (typeof ssid !== 'string' || !ssid.trim()) return null;

    const password = value.password ?? value.pass ?? value.P;
    const security = value.security ?? value.type ?? value.T;
    const hidden = value.hidden ?? value.H;

    return {
      kind: 'wifi',
      raw,
      ssid: ssid.trim(),
      password: typeof password === 'string' ? password : '',
      security: typeof security === 'string' ? security : password ? 'WPA' : 'nopass',
      hidden: hidden === true || (typeof hidden === 'string' && hidden.toLowerCase() === 'true'),
    };
  } catch {
    return null;
  }
}

function parseDirectPixKey(raw: string): PixQrContent | null {
  const explicitPix = /^PIX:(?:\/\/)?/i.test(raw);
  const key = explicitPix ? raw.replace(/^PIX:(?:\/\/)?/i, '').trim() : raw;
  const keyType = identifyPixKeyType(key);

  if (keyType === 'Desconhecida' && !explicitPix) return null;
  if (!key) return null;

  return {
    kind: 'pix',
    raw,
    key,
    keyType,
    isDynamic: false,
    isPayload: false,
    crcValid: null,
  };
}

function parseAppUri(raw: string): AppQrContent | null {
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (!scheme || ['http', 'https', 'wifi', 'dpp', 'pix', 'javascript', 'data', 'file'].includes(scheme)) {
    return null;
  }

  const appType =
    scheme === 'mailto'
      ? 'E-mail'
      : scheme === 'tel'
        ? 'Telefone'
        : scheme === 'sms' || scheme === 'smsto'
          ? 'SMS'
          : scheme === 'geo' || scheme === 'maps' || scheme === 'comgooglemaps'
            ? 'Localização'
            : 'Aplicativo';

  return {
    kind: 'app',
    raw,
    uri: raw,
    appType,
    displayValue: raw.slice(raw.indexOf(':') + 1).replace(/^\/\//, ''),
  };
}

function parseLegacyAppContent(raw: string): UrlQrContent | AppQrContent | null {
  const prefixedUrl = raw.match(/^URL:(https?:\/\/.+)$/i)?.[1];
  if (prefixedUrl) {
    return { kind: 'url', raw, url: prefixedUrl };
  }

  if (/^MEBKM:/i.test(raw)) {
    const values: Record<string, string> = {};
    for (const field of splitWifiFields(raw.slice(6))) {
      const separator = findUnescapedColon(field);
      if (separator < 0) continue;
      values[field.slice(0, separator).toUpperCase()] = unescapeWifiValue(
        field.slice(separator + 1)
      );
    }

    if (/^https?:\/\//i.test(values.URL ?? '')) {
      return { kind: 'url', raw, url: values.URL };
    }
  }

  if (/^MATMSG:/i.test(raw)) {
    const values: Record<string, string> = {};
    for (const field of splitWifiFields(raw.slice(7))) {
      const separator = findUnescapedColon(field);
      if (separator < 0) continue;
      values[field.slice(0, separator).toUpperCase()] = unescapeWifiValue(
        field.slice(separator + 1)
      );
    }

    if (values.TO) {
      const parameters = [
        ...(values.SUB ? [`subject=${encodeURIComponent(values.SUB)}`] : []),
        ...(values.BODY ? [`body=${encodeURIComponent(values.BODY)}`] : []),
      ];
      const uri = `mailto:${values.TO}${parameters.length ? `?${parameters.join('&')}` : ''}`;
      return {
        kind: 'app',
        raw,
        uri,
        appType: 'E-mail',
        displayValue: values.TO,
      };
    }
  }

  return null;
}

export function parseQrContent(input: string): ParsedQrContent {
  const raw = input.trim();
  const prefixedPixPayload = /^PIX:/i.test(raw) ? raw.slice(4).trim() : null;
  const url = /^www\./i.test(raw) ? `https://${raw}` : raw;

  return (
    parseWifiPayload(raw) ??
    parseWifiJson(raw) ??
    parsePixPayload(raw) ??
    (prefixedPixPayload ? parsePixPayload(prefixedPixPayload) : null) ??
    parseLegacyAppContent(raw) ??
    (/^https?:\/\//i.test(url)
      ? { kind: 'url', raw, url }
      : parseAppUri(raw) ?? parseDirectPixKey(raw) ?? { kind: 'text', raw })
  );
}

export function getQrContentSummary(content: ParsedQrContent): {
  title: string;
  subtitle: string;
  icon: 'wifi' | 'card' | 'link' | 'open' | 'document-text';
} {
  switch (content.kind) {
    case 'wifi':
      return { title: 'Rede Wi-Fi', subtitle: content.ssid, icon: 'wifi' };
    case 'pix':
      return {
        title: content.isPayload ? 'Pagamento Pix' : 'Chave Pix',
        subtitle: content.merchantName || content.key || 'Pix Copia e Cola',
        icon: 'card',
      };
    case 'url':
      return { title: 'Link', subtitle: content.url, icon: 'link' };
    case 'app':
      return { title: content.appType, subtitle: content.displayValue, icon: 'open' };
    default:
      return { title: 'Texto', subtitle: content.raw, icon: 'document-text' };
  }
}
