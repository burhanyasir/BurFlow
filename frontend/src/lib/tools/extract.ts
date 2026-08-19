export type ExtractableFormat = 'txt' | 'md' | 'csv' | 'json' | 'xml' | 'html' | 'rtf' | 'pdf' | 'docx';

const INFLATE_RAW = 'deflate-raw';
const INFLATE_ZLIB = 'deflate';

async function inflate(bytes: Uint8Array, mode: CompressionFormat): Promise<Uint8Array> {
  const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer]);
  const stream = blob.stream().pipeThrough(new DecompressionStream(mode));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

/* ── DOCX: minimal zip reader → word/document.xml ─────────── */

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: Array<{ name: string; method: number; offset: number; compSize: number }> = [];
  let i = 0;
  while (i + 30 <= bytes.length) {
    if (dv.getUint32(i, true) !== 0x04034b50) {
      i += 1;
      continue;
    }
    const method = dv.getUint16(i + 8, true);
    const compSize = dv.getUint32(i + 18, true);
    const nameLen = dv.getUint16(i + 26, true);
    const extraLen = dv.getUint16(i + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(i + 30, i + 30 + nameLen));
    const dataStart = i + 30 + nameLen + extraLen;
    entries.push({ name, method, offset: dataStart, compSize });
    i = dataStart + compSize;
  }
  const doc = entries.find((e) => e.name === 'word/document.xml');
  if (!doc) throw new Error('This DOCX has no word/document.xml entry.');
  let xml: string;
  if (doc.method === 0) {
    xml = new TextDecoder().decode(bytes.subarray(doc.offset, doc.offset + doc.compSize));
  } else if (doc.method === 8) {
    const inflated = await inflate(bytes.subarray(doc.offset, doc.offset + doc.compSize), INFLATE_RAW);
    xml = new TextDecoder().decode(inflated);
  } else {
    throw new Error('Unsupported DOCX compression method.');
  }
  const body = xml
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<w:p[^>]*>/g, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeXmlEntities(body).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ── PDF: FlateDecode streams → text operators ────────────── */

function pdfUnescape(text: string): string {
  return text
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\d{3}/g, (octal) => String.fromCharCode(parseInt(octal.slice(1), 8)));
}

function extractPdfTextFromStream(stream: string): string {
  const out: string[] = [];
  const tokens = stream.match(/\((?:\\.|[^()\\])*\)\s*Tj|\[[\s\S]*?\]\s*TJ/g);
  if (!tokens) return '';
  for (const token of tokens) {
    if (token.endsWith('Tj')) {
      const inner = token.slice(1, token.lastIndexOf(')'));
      out.push(pdfUnescape(inner));
    } else {
      const strings = token.match(/\((?:\\.|[^()\\])*\)/g) ?? [];
      out.push(strings.map((s) => pdfUnescape(s.slice(1, -1))).join(''));
    }
  }
  return out.join(' ');
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const latin = new TextDecoder('latin1');
  const raw = latin.decode(bytes);
  const out: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  let parsed = 0;
  while ((match = streamRe.exec(raw)) !== null && parsed < 120) {
    parsed += 1;
    const whole = match[0];
    const startIn = whole.indexOf('\n') + 1;
    const endMark = whole.indexOf('endstream');
    let endIn = endMark;
    if (whole[endIn - 1] === '\n') endIn -= 1;
    if (whole[endIn - 1] === '\r') endIn -= 1;
    const dataBytes = bytes.subarray(match.index + startIn, match.index + endIn);
    const dataStr = latin.decode(dataBytes);
    let decoded = '';
    let isText = /Tj|TJ/.test(dataStr);
    try {
      const zlib = await inflate(dataBytes, INFLATE_ZLIB);
      const text = latin.decode(zlib);
      if (/Tj|TJ/.test(text)) {
        decoded = text;
        isText = true;
      }
    } catch {
      if (isText) decoded = dataStr;
    }
    if (isText && decoded.length > 0) {
      const extracted = extractPdfTextFromStream(decoded);
      if (extracted) out.push(extracted);
    }
  }
  const text = out.join('\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length === 0) {
    throw new Error('No extractable text found. This PDF may be scanned or image-based — try a text PDF, or paste the content instead.');
  }
  return text;
}

/* ── Public API ───────────────────────────────────────────── */

export function formatFromFileName(name: string): ExtractableFormat | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, ExtractableFormat> = {
    txt: 'txt', md: 'md', markdown: 'md', csv: 'csv', json: 'json', xml: 'xml',
    html: 'html', htm: 'html', rtf: 'rtf', pdf: 'pdf', docx: 'docx', doc: 'docx',
  };
  return map[ext] ?? null;
}

export async function extractTextFromFile(file: File): Promise<{ text: string; format: ExtractableFormat | null }> {
  const format = formatFromFileName(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (format === 'docx') return { text: await extractDocxText(bytes), format };
  if (format === 'pdf') return { text: await extractPdfText(bytes), format };
  const text = new TextDecoder().decode(bytes);
  if (format === 'rtf') return { text: rtfToText(text), format };
  return { text: text.replace(/^\uFEFF/, ''), format };
}

export function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/\\~/g, ' ')
    .replace(/\\_/g, '-')
    .replace(/\\\*/g, '')
    .replace(/\{\\|\}/g, '')
    .replace(/\\\\/g, '\\')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractBodyText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 6000);
}

/** Tries to fetch a public URL's main text. Returns null when blocked by CORS. */
export async function fetchUrlText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const html = await res.text();
    const text = extractBodyText(html);
    return text.length >= 20 ? text : null;
  } catch {
    return null;
  }
}