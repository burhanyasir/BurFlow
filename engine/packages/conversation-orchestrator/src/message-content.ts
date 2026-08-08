// Defensive content normalization for chat messages that may arrive as plain
// strings or as multimodal arrays (text + image_url blocks). All LLM provider
// mappers assume plain strings; this module guarantees that contract and returns
// structured errors that the HTTP layer can map to 400/502 responses. Images that
// cannot be rendered by a text-only pipeline are validated then stripped of their
// pixel data so downstream providers never receive unsupported content.

export class PayloadValidationError extends Error {
  public readonly statusCode = 400;
  public readonly code: string;
  constructor(message: string, code = 'INVALID_PAYLOAD') {
    super(message);
    this.name = 'PayloadValidationError';
    this.code = code;
  }
}

export class UpstreamLLMError extends Error {
  public readonly statusCode = 502;
  public readonly code: string;
  public readonly provider?: string;
  public readonly status?: number;
  constructor(message: string, opts: { code?: string; provider?: string; status?: number } = {}) {
    super(message);
    this.name = 'UpstreamLLMError';
    this.code = opts.code || 'UPSTREAM_LLM_FAILURE';
    this.provider = opts.provider;
    this.status = opts.status;
  }
}

export const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif']);

const DATA_URI_RE = /^data:(image\/(?:png|jpeg|gif));base64,(?:[A-Za-z0-9+/]+={0,2})$/;

export interface NormalizedContent {
  text: string;
  imageCount: number;
  rejectedImages: number;
}

const DEFAULT_MAX_LENGTH = 50000;

export function normalizeMessageContent(
  content: unknown,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  const result = normalizeToNormalizedContent(content, maxLength);
  return result.text;
}

export function normalizeToNormalizedContent(
  content: unknown,
  maxLength: number = DEFAULT_MAX_LENGTH,
): NormalizedContent {
  if (content === null || content === undefined || typeof content === 'boolean') {
    throw new PayloadValidationError(
      'Message content must be a string, multimodal array, or content block object.',
      'MISSING_CONTENT',
    );
  }

  if (typeof content === 'string') {
    return checkLength({ text: content, imageCount: 0, rejectedImages: 0 }, maxLength);
  }

  if (Array.isArray(content)) {
    return checkLength(
      content.reduce<NormalizedContent>(
        (acc, block, index) => mergeBlock(acc, block, index),
        { text: '', imageCount: 0, rejectedImages: 0 },
      ),
      maxLength,
    );
  }

  if (typeof content === 'object') {
    return checkLength(
      mergeBlock({ text: '', imageCount: 0, rejectedImages: 0 }, content, 0),
      maxLength,
    );
  }

  throw new PayloadValidationError(
    'Message content must be a string, multimodal array, or content block object.',
    'UNSUPPORTED_CONTENT',
  );
}

function mergeBlock(
  acc: NormalizedContent,
  block: unknown,
  index: number,
): NormalizedContent {
  if (typeof block !== 'object' || block === null) {
    throw new PayloadValidationError(
      `Content block at index ${index} must be an object.`,
      'MALFORMED_BLOCK',
    );
  }

  const b = block as Record<string, unknown>;
  const type = b.type;

  if (type === 'text' || (type === undefined && 'text' in b)) {
    const text = coerceString(b.text, index);
    if (text) {
      acc.text = acc.text ? `${acc.text} ${text}` : text;
    }
    return acc;
  }

  if (type === 'image' || type === 'image_url' || (type === undefined && 'image_url' in b)) {
    const url = extractImageUrl(b, index);
    const mime = dataUriMimeType(url);
    if (!mime || !ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      throw new PayloadValidationError(
        `Unsupported image MIME type "${mime || 'unknown'}". Allowed: ${sortJoin(ALLOWED_IMAGE_MIME_TYPES)}.`,
        'UNSUPPORTED_MIME_TYPE',
      );
    }
    if (!DATA_URI_RE.test(url)) {
      throw new PayloadValidationError(
        'Image must be provided as a valid data URI: data:image/(png|jpeg|gif);base64,<base64>.',
        'MALFORMED_DATA_URI',
      );
    }
    acc.imageCount += 1;
    return acc;
  }

  if (type === 'image_url' && b.image_url && typeof b.image_url === 'object') {
    const inner = (b.image_url as Record<string, unknown>).url;
    if (typeof inner !== 'string') {
      throw new PayloadValidationError(`image_url.url must be a string.`, 'MALFORMED_DATA_URI');
    }
    const mime = dataUriMimeType(inner);
    if (!mime || !ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
      throw new PayloadValidationError(
        `Unsupported image MIME type "${mime || 'unknown'}". Allowed: ${sortJoin(ALLOWED_IMAGE_MIME_TYPES)}.`,
        'UNSUPPORTED_MIME_TYPE',
      );
    }
    if (!DATA_URI_RE.test(inner)) {
      throw new PayloadValidationError(
        'Image must be provided as a valid data URI: data:image/(png|jpeg|gif);base64,<base64>.',
        'MALFORMED_DATA_URI',
      );
    }
    acc.imageCount += 1;
    return acc;
  }

  throw new PayloadValidationError(
    `Unsupported content block type "${String(type)}" at index ${index}.`,
    'UNSUPPORTED_BLOCK_TYPE',
  );
}

function extractImageUrl(block: Record<string, unknown>, index: number): string {
  if (typeof block.image_url === 'string') return block.image_url;
  if (block.image_url && typeof block.image_url === 'object') {
    const url = (block.image_url as Record<string, unknown>).url;
    if (typeof url === 'string') return url;
  }
  if (typeof block.url === 'string') return block.url;
  if (typeof block.source === 'string') return block.source;
  throw new PayloadValidationError(
    `Image block at index ${index} is missing a url/source field.`,
    'MALFORMED_DATA_URI',
  );
}

function dataUriMimeType(uri: string): string | null {
  const match = /^data:([^;,]+)/.exec(uri);
  return match ? match[1] : null;
}

function coerceString(value: unknown, index: number): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') {
    throw new PayloadValidationError(
      `Text content block at index ${index} has a non-string "text" field.`,
      'NON_STRING_TEXT',
    );
  }
  return value;
}

function checkLength(content: NormalizedContent, maxLength: number): NormalizedContent {
  if (content.text.length > maxLength) {
    throw new PayloadValidationError(
      `Message content exceeds the ${maxLength} character limit.`,
      'MESSAGE_TOO_LONG',
    );
  }
  return content;
}

function sortJoin(set: Set<string>): string {
  return Array.from(set).sort().join(', ');
}
