import { Router, Request, Response } from 'express';
import {
  WebsiteScannerService,
  WebsiteScanRepository, ScannedPageRepository,
  computeNextScanAt,
} from '@conversation-engine/saas-core';

export interface WebsiteScannerRouteDeps {
  scanner: WebsiteScannerService;
  scanRepo: WebsiteScanRepository;
  pageRepo: ScannedPageRepository;
}

const VALID_SCHEDULES = new Set<string>(['manual', 'daily', 'weekly']);
const VALID_CRAWL_MODES = new Set<string>(['discover', 'update']);
const MAX_DEPTH = 5;
const MAX_PAGE_LIMIT = 500;

export function createWebsiteScannerRoutes(deps: WebsiteScannerRouteDeps): Router {
  const router = Router();

  // POST /api/knowledge/scan — start a website scan
  router.post('/scan', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'Tenant context required' });

      const { url, crawlMode, schedule, maxDepth, pageLimit } = req.body || {};
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return res.status(400).json({ error: 'url is required' });
      }
      if (crawlMode !== undefined && !VALID_CRAWL_MODES.has(crawlMode)) {
        return res.status(400).json({ error: 'crawlMode must be "discover" or "update"' });
      }
      if (schedule !== undefined && !VALID_SCHEDULES.has(schedule)) {
        return res.status(400).json({ error: 'schedule must be "manual", "daily" or "weekly"' });
      }
      if (maxDepth !== undefined && (typeof maxDepth !== 'number' || maxDepth < 1 || maxDepth > MAX_DEPTH)) {
        return res.status(400).json({ error: `maxDepth must be between 1 and ${MAX_DEPTH}` });
      }
      if (pageLimit !== undefined && (typeof pageLimit !== 'number' || pageLimit < 1 || pageLimit > MAX_PAGE_LIMIT)) {
        return res.status(400).json({ error: `pageLimit must be between 1 and ${MAX_PAGE_LIMIT}` });
      }

      const scan = deps.scanner.startScan(tenantId, url.trim(), {
        crawlMode,
        schedule,
        maxDepth,
        pageLimit,
      });
      res.status(202).json({ scan });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      if (/url|http|https|private network|hostname/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      res.status(500).json({ error: 'Failed to start website scan' });
    }
  });

  // GET /api/knowledge/scan/status?scanId=... — scan progress + crawled pages
  router.get('/scan/status', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'Tenant context required' });

      const scanId = typeof req.query.scanId === 'string' ? req.query.scanId : undefined;
      const scan = scanId
        ? deps.scanRepo.findById(scanId)
        : deps.scanRepo.findLatestByTenant(tenantId);
      if (scanId) {
        if (!scan || scan.tenantId !== tenantId) {
          return res.status(404).json({ error: 'Scan not found' });
        }
      } else if (!scan) {
        // Polling without an explicit scan id — a tenant that has never run a
        // scan is a valid state, not an error (avoids 404 noise on the
        // knowledge dashboard).
        return res.json({ scan: null, pages: [] });
      }
      const pages = deps.pageRepo.listByScan(scan.id);
      res.json({ scan, pages });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch scan status' });
    }
  });

  // PUT /api/knowledge/scan/schedule — schedule an existing scan for a site
  router.put('/scan/schedule', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'Tenant context required' });

      const { url, schedule } = req.body || {};
      if (!VALID_SCHEDULES.has(schedule)) {
        return res.status(400).json({ error: 'schedule must be "manual", "daily" or "weekly"' });
      }

      let scan: any = null;
      if (url && typeof url === 'string' && url.trim()) {
        scan = deps.scanRepo.findLatestByTenantAndUrl(tenantId, url.trim());
      }
      if (!scan) {
        scan = deps.scanRepo.findLatestByTenant(tenantId);
      }
      if (!scan) {
        return res.status(400).json({ error: 'No scan exists for this tenant. Start a scan first or provide a url.' });
      }

      const nextScanAt = computeNextScanAt(schedule);
      deps.scanRepo.updateSchedule(scan.id, schedule, nextScanAt);
      res.json({ scan: deps.scanRepo.findById(scan.id) });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update scan schedule' });
    }
  });

  // GET /api/knowledge/scan/history — recent scans for the tenant
  router.get('/scan/history', (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'Tenant context required' });
      const scans = deps.scanRepo.listByTenant(tenantId, 20);
      res.json({ scans });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch scan history' });
    }
  });

  return router;
}
