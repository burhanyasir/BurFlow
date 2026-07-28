import { CacheConfig, GeneratorInput, GeneratorOutput } from './types';
import { createHash } from 'crypto';

interface CacheEntry {
  output: GeneratorOutput;
  expiresAt: number;
}

export class ResponseCache {
  private store = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  constructor(private config: CacheConfig) {}

  private hash(input: GeneratorInput): string {
    const data = JSON.stringify({
      m: input.message,
      p: input.persona,
      f: input.funnelStage,
      i: input.intent,
      bi: input.buyingIntent.detected,
      ls: input.leadScore,
      cs: input.conversationScore,
      sp: input.systemPrompt,
      h: input.conversationHistory.slice(-4).map(m => `${m.role}:${m.content.slice(0, 100)}`),
      k: input.knowledgeResults.map(k => k.title + k.content.slice(0, 200)),
      pt: input.sentiment.polarity.toFixed(2),
    });
    return createHash('sha256').update(data).digest('hex').slice(0, 32);
  }

  get(input: GeneratorInput): GeneratorOutput | null {
    if (!this.config.enabled) { this.misses++; return null; }
    const key = this.hash(input);
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.output;
  }

  set(input: GeneratorInput, output: GeneratorOutput): void {
    if (!this.config.enabled) return;
    if (this.store.size >= this.config.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    const key = this.hash(input);
    this.store.set(key, { output, expiresAt: Date.now() + this.config.ttlMs });
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
