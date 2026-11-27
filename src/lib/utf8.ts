// Text to UTF-8 bytes and back. The encryption API works on bytes, and
// React Native's JavaScript engine has no TextDecoder to rely on.

export function utf8Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  const next = () => {
    const b = bytes[i++];
    if (b === undefined || (b & 0xc0) !== 0x80) throw new Error('Not valid UTF-8');
    return b & 63;
  };
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCodePoint(b);
    else if (b >= 0xf0)
      out += String.fromCodePoint(((b & 7) << 18) | (next() << 12) | (next() << 6) | next());
    else if (b >= 0xe0) out += String.fromCodePoint(((b & 15) << 12) | (next() << 6) | next());
    else if (b >= 0xc0) out += String.fromCodePoint(((b & 31) << 6) | next());
    else throw new Error('Not valid UTF-8');
  }
  return out;
}
