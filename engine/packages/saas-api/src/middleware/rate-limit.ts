import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimit(options: { windowMs: number; max: number; keyFn?: (req: Request) => string; message?: string; skip?: (req: Request) => boolean }) {
  const { windowMs, max, keyFn, message = 'Too many requests. Please try again later.', skip } = options;
  const store = new Map<string, RateLimitEntry>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 60000);
  if (cleanup.unref) cleanup.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip untouched paths (e.g. /api/admin) so public widget traffic never
    // shares a budget with dashboard polling; those routes get their own limiter.
    if (skip && skip(req)) return next();
    const key = keyFn ? keyFn(req) : (req.ip || 'unknown');
    const now = Date.now();
    const entry = store.get(key);

    if (entry && entry.resetAt > now) {
      if (entry.count >= max) {
        const retryAfterMs = entry.resetAt - now;
        res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
        return res.status(429).json({ error: message });
      }
      entry.count++;
    } else {
      store.set(key, { count: 1, resetAt: now + windowMs });
    }

    next();
  };
}
