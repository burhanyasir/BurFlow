import { describe, it, expect } from 'vitest';
import {
  normalizeMessageContent,
  normalizeToNormalizedContent,
  PayloadValidationError,
  UpstreamLLMError,
  ALLOWED_IMAGE_MIME_TYPES,
} from '../message-content';

const PNG_1x1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
const JPEG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'; // deliberately not a real jpeg body; only data URI shape matters for some cases
const GIF_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEBAHKZAP9k';

function dataUri(mime: string, b64: string): string {
  return `data:${mime};base64,${b64}`;
}

describe('normalizeMessageContent — text-only', () => {
  it('returns a plain string unchanged', () => {
    expect(normalizeMessageContent('hello world')).toBe('hello world');
  });

  it('trims nothing but preserves internal whitespace', () => {
    expect(normalizeMessageContent('  hi   there  ')).toBe('  hi   there  ');
  });

  it('concatenates multiple text blocks in an array', () => {
    const content = [{ type: 'text', text: 'hello' }, { type: 'text', text: 'world' }];
    expect(normalizeMessageContent(content)).toBe('hello world');
  });
});

describe('normalizeMessageContent — multimodal with images', () => {
  it('accepts text + image/png data URI and returns the text', () => {
    const content = [
      { type: 'text', text: 'describe this' },
      { type: 'image_url', image_url: { url: dataUri('image/png', PNG_1x1_B64) } },
    ];
    expect(normalizeMessageContent(content)).toBe('describe this');
  });

  it('accepts a bare image_url string data URI', () => {
    const content = [
      { type: 'text', text: 'look' },
      { type: 'image_url', image_url: dataUri('image/jpeg', JPEG_B64) },
    ];
    expect(normalizeMessageContent(content)).toBe('look');
  });

  it('accepts image/gif data URI', () => {
    const content = [
      { type: 'text', text: 'gif' },
      { type: 'image', url: dataUri('image/gif', GIF_B64) },
    ];
    expect(normalizeMessageContent(content)).toBe('gif');
  });

  it('reports image counts via normalizeToNormalizedContent', () => {
    const content = [
      { type: 'text', text: 'a' },
      { type: 'image_url', image_url: { url: dataUri('image/png', PNG_1x1_B64) } },
      { type: 'text', text: 'b' },
      { type: 'image_url', image_url: dataUri('image/jpeg', JPEG_B64) },
    ];
    const result = normalizeToNormalizedContent(content);
    expect(result.text).toBe('a b');
    expect(result.imageCount).toBe(2);
    expect(result.rejectedImages).toBe(0);
  });
});

describe('normalizeMessageContent — rejection of bad payloads', () => {
  it('rejects null', () => {
    expect(() => normalizeMessageContent(null)).toThrow(PayloadValidationError);
    expect(() => normalizeMessageContent(null)).toThrow(/string, multimodal array/);
  });

  it('rejects undefined', () => {
    expect(() => normalizeMessageContent(undefined)).toThrow(PayloadValidationError);
  });

  it('rejects boolean', () => {
    expect(() => normalizeMessageContent(true)).toThrow(PayloadValidationError);
  });

  it('rejects a number', () => {
    expect(() => normalizeMessageContent(123)).toThrow(PayloadValidationError);
  });

  it('rejects unsupported image MIME (image/svg)', () => {
    const svg = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
    const content = [{ type: 'image_url', image_url: { url: dataUri('image/svg+xml', svg) } }];
    expect(() => normalizeMessageContent(content)).toThrow(PayloadValidationError);
    expect(() => normalizeMessageContent(content)).toThrow(/Unsupported image MIME type/);
  });

  it('rejects unsupported image MIME (image/webp)', () => {
    const content = [{ type: 'image_url', image_url: { url: dataUri('image/webp', 'UklGRjoAAABXRUQVlA4ICwAAEAcQERGIiP4fAA==') } }];
    expect(() => normalizeMessageContent(content)).toThrow(/Unsupported image MIME type/);
  });

  it('rejects a malformed data URI (missing base64 marker)', () => {
    const content = [{ type: 'image_url', image_url: { url: 'data:image/png;base64,' } }];
    expect(() => normalizeMessageContent(content)).toThrow(/valid data URI/);
  });

  it('rejects an http(s) url (only data URIs allowed)', () => {
    const content = [{ type: 'image_url', image_url: { url: 'https://example.com/img.png' } }];
    expect(() => normalizeMessageContent(content)).toThrow(PayloadValidationError);
    expect(() => normalizeMessageContent(content)).toThrow(/Unsupported image MIME type|valid data URI/);
  });

  it('rejects a non-string text block', () => {
    const content = [{ type: 'text', text: 42 }];
    expect(() => normalizeMessageContent(content)).toThrow(/non-string "text" field/);
  });

  it('rejects an array with an unsupported block type', () => {
    const content = [{ type: 'video', url: 'rtmp://x' }];
    expect(() => normalizeMessageContent(content)).toThrow(/Unsupported content block type/);
  });

  it('rejects messages exceeding the length limit', () => {
    const big = 'a'.repeat(50001);
    expect(() => normalizeMessageContent(big, 50000)).toThrow(/exceeds the .* character limit/);
  });

  it('rejects a plain object missing text/image fields', () => {
    expect(() => normalizeMessageContent({ foo: 'bar' })).toThrow(/Unsupported content block type/);
  });

  it('sets statusCode 400 on PayloadValidationError', () => {
    const err = new PayloadValidationError('bad', 'CODE_X');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('CODE_X');
    expect(err.name).toBe('PayloadValidationError');
  });

  it('sets statusCode 502 on UpstreamLLMError', () => {
    const err = new UpstreamLLMError('down', { provider: 'Groq-1', status: 503 });
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('UPSTREAM_LLM_FAILURE');
    expect(err.provider).toBe('Groq-1');
    expect(err.status).toBe(503);
    expect(err.name).toBe('UpstreamLLMError');
  });
});

describe('ALLOWED_IMAGE_MIME_TYPES', () => {
  it('includes png, jpeg, gif', () => {
    expect(ALLOWED_IMAGE_MIME_TYPES.has('image/png')).toBe(true);
    expect(ALLOWED_IMAGE_MIME_TYPES.has('image/jpeg')).toBe(true);
    expect(ALLOWED_IMAGE_MIME_TYPES.has('image/gif')).toBe(true);
  });
});
