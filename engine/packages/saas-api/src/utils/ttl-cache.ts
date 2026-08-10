/**
 * Minimal in-memory TTL cache used to absorb repeated dashboard reads
 * (analytics overview, session lists) without stale data — entries expire
 * after `ttlMs` and are lazily evicted on read plus swept on a timer.
 */
export interface TtlCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}

export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  const store = new Map<string, { value: T; expiresAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }, Math.max(ttlMs, 60_000));
  if (sweep.unref) sweep.unref();

  return {
    get(key: string): T | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T): void {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    clear(): void {
      store.clear();
    },
  };
}
