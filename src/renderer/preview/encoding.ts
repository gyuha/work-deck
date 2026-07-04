export interface DecodeResult {
  text: string;
  encoding: string;
  hadReplacementChars: boolean;
}

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.length <= bytes.length && prefix.every((b, i) => bytes[i] === b);
}

/** docs/features/preview.md 3.1: UTF-8 default, BOM takes priority, EUC-KR heuristic fallback, else "unknown". */
export function decodeText(bytes: Uint8Array): DecodeResult {
  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
    return { text: new TextDecoder('utf-8').decode(bytes.subarray(3)), encoding: 'utf-8 (BOM)', hadReplacementChars: false };
  }
  if (startsWith(bytes, [0xff, 0xfe])) {
    return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), encoding: 'utf-16le (BOM)', hadReplacementChars: false };
  }
  if (startsWith(bytes, [0xfe, 0xff])) {
    return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), encoding: 'utf-16be (BOM)', hadReplacementChars: false };
  }

  const utf8Text = new TextDecoder('utf-8').decode(bytes);
  if (!utf8Text.includes('�')) {
    return { text: utf8Text, encoding: 'utf-8', hadReplacementChars: false };
  }

  try {
    const eucKrText = new TextDecoder('euc-kr', { fatal: true }).decode(bytes);
    return { text: eucKrText, encoding: 'euc-kr', hadReplacementChars: false };
  } catch {
    return { text: utf8Text, encoding: 'unknown', hadReplacementChars: true };
  }
}
