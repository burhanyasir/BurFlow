import { createLogger } from '@conversation-engine/logger';
import {
  WebsiteScanRepository, ScannedPageRepository, KnowledgeBaseRepository,
  KbDocumentRepository, KbChunkRepository, WebsiteScannerService, BrandExtractor,
} from '@conversation-engine/saas-core';

const logger = createLogger('orchestrator:website-scan-scheduler');

export interface WebsiteScanSchedulerOptions {
  intervalMs?: number;
  now?: () => string;
}

export function createWebsiteScanScheduler(
  deps: {
    scanRepo: WebsiteScanRepository;
    pageRepo: ScannedPageRepository;
    kbRepo: KnowledgeBaseRepository;
    docRepo: KbDocumentRepository;
    chunkRepo: KbChunkRepository;
  },
  options: WebsiteScanSchedulerOptions = {},
) {
  const scanner = new WebsiteScannerService(
    { ...deps, brandExtractor: new BrandExtractor() },
    {},
  );
  const intervalMs = options.intervalMs ?? 60_000;
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  async function tick(): Promise<void> {
    if (running) return;
    running = true;
    try {
      const results = await scanner.processDueScans(
        options.now ? options.now() : new Date().toISOString(),
      );
      if (results.length > 0) {
        logger.info({ count: results.length }, 'Website scanner processed due scans');
      }
    } catch (err: any) {
      logger.error({ err }, 'Website scan scheduler tick failed');
    } finally {
      running = false;
    }
  }

  return {
    start(): void {
      if (timer) return;
      void tick();
      timer = setInterval(() => { void tick(); }, intervalMs);
      timer.unref?.();
      logger.info({ intervalMs }, 'Website scan scheduler started');
    },
    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    async runNow(): Promise<void> {
      await tick();
    },
  };
}
