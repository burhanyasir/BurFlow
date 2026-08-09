export interface WebsiteScan {
  id: string;
  tenantId: string;
  rootUrl: string;
  status: 'queued' | 'crawling' | 'completed' | 'failed' | 'cancelled';
  crawlMode: 'discover' | 'update';
  schedule: 'manual' | 'daily' | 'weekly';
  maxDepth: number;
  pageLimit: number;
  pagesDiscovered: number;
  pagesScanned: number;
  pagesIndexed: number;
  pagesUnchanged: number;
  pagesAdded: number;
  pagesUpdated: number;
  pagesDeleted: number;
  brandTone?: string;
  primaryCtas: string[];
  confidenceScore?: number;
  nextScanAt?: string;
  lastError?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
