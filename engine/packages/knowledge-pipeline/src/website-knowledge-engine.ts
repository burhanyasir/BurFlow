import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'crypto';
import {
  KnowledgeDocumentEntry,
  KnowledgeChunkRecord,
  KnowledgeRelationRecord,
  KnowledgeVersionRecord,
  KnowledgeStats,
} from './types';

export interface WebsiteScanLike {
  scanId?: string;
  report?: {
    businessProfile?: Record<string, unknown>;
    pages?: Array<{
      url?: string;
      title?: string;
      pageType?: string;
      intelligence?: {
        services?: string[];
        pricing?: string[];
        contact?: string[];
        about?: string[];
        faq?: string[];
        products?: string[];
        features?: string[];
        benefits?: string[];
      };
      meta?: Record<string, unknown>;
      unchanged?: boolean;
      score?: number;
    }>;
  };
}

export class WebsiteKnowledgeEngine {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureTables();
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_versions (
        tenant_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        source_id TEXT NOT NULL,
        scan_version TEXT,
        document_count INTEGER NOT NULL DEFAULT 0,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        duplicates_removed INTEGER NOT NULL DEFAULT 0,
        average_chunk_size REAL NOT NULL DEFAULT 0,
        knowledge_freshness TEXT NOT NULL DEFAULT 'unknown',
        created_at TEXT NOT NULL,
        stats_json TEXT NOT NULL,
        PRIMARY KEY (tenant_id, version)
      );

      CREATE TABLE IF NOT EXISTS knowledge_documents (
        document_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        title TEXT NOT NULL,
        section TEXT NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0,
        classification TEXT NOT NULL DEFAULT 'Company'
      );

      CREATE INDEX IF NOT EXISTS idx_kd_tenant ON knowledge_documents(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_kd_source ON knowledge_documents(source_id);
      CREATE INDEX IF NOT EXISTS idx_kd_hash ON knowledge_documents(tenant_id, content_hash);

      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        chunk_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        document_id TEXT NOT NULL,
        page_url TEXT NOT NULL,
        title TEXT NOT NULL,
        section TEXT NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        chunk_order INTEGER NOT NULL,
        classification TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(document_id) REFERENCES knowledge_documents(document_id)
      );

      CREATE INDEX IF NOT EXISTS idx_kc_tenant_version ON knowledge_chunks(tenant_id, version);
      CREATE INDEX IF NOT EXISTS idx_kc_hash ON knowledge_chunks(tenant_id, content_hash);

      CREATE TABLE IF NOT EXISTS knowledge_relations (
        relation_id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        from_chunk_id TEXT NOT NULL,
        to_chunk_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_kr_tenant_version ON knowledge_relations(tenant_id, version);
    `);
  }

  public async buildVersion(tenantId: string, sourceId: string, scanResult: WebsiteScanLike): Promise<KnowledgeVersionRecord> {
    const version = this.getNextVersion(tenantId);
    const now = new Date().toISOString();
    const pages = scanResult.report?.pages || [];
    const documents: KnowledgeDocumentEntry[] = [];
    const chunks: KnowledgeChunkRecord[] = [];

    const profile = scanResult.report?.businessProfile || {};
    const previousVersion = this.getLatestVersion(tenantId);
    const previousChunks = previousVersion > 0 ? this.getTenantChunks(tenantId, previousVersion) : [];
    const previousHashLookup = new Map(previousChunks.map(chunk => [chunk.contentHash, chunk]));
    const scanVersion = scanResult.scanId || sourceId;

    for (const page of pages) {
      const pageSegments = this.composePageSegments(page, profile);
      const normalizedSegments = pageSegments
        .map(segment => ({
          ...segment,
          content: this.normalizeText(this.removeBoilerplate(segment.content)),
        }))
        .filter(segment => segment.content && segment.content.length >= 12);

      const normalizedText = normalizedSegments.map(segment => segment.content).join(' ');
      const section = page.pageType || 'content';
      const documentId = randomUUID();
      const confidence = this.inferConfidence(page, profile);
      const documentEntry: KnowledgeDocumentEntry = {
        documentId,
        tenantId,
        sourceId,
        pageUrl: page.url || '',
        title: page.title || 'Untitled page',
        section,
        content: normalizedText,
        contentHash: this.sha256(normalizedText),
        createdAt: now,
        updatedAt: now,
        confidence,
        classification: this.classifySection(section, normalizedText),
      };

      if (!normalizedText || normalizedText.length < 30) continue;
      documents.push(documentEntry);

      const contentChunks = this.chunkContent(normalizedSegments, documentEntry, version);
      for (const chunk of contentChunks) {
        chunks.push(chunk);
      }
    }

    const dedupedChunks = this.deduplicateChunks(chunks);
    const filteredChunks = this.filterChunks(dedupedChunks);
    const orderedChunks = filteredChunks.sort((a, b) => a.chunkOrder - b.chunkOrder);
    const unchangedChunkCount = orderedChunks.filter(chunk => previousHashLookup.has(chunk.contentHash)).length;
    const changedChunkCount = orderedChunks.length - unchangedChunkCount;
    const relations = this.buildRelations(orderedChunks, version);
    const stats = this.buildStats(documents, orderedChunks, chunks.length - orderedChunks.length, version, scanVersion, now, changedChunkCount, unchangedChunkCount);

    this.db.transaction(() => {
      for (const document of documents) {
        this.db.prepare(`
          INSERT INTO knowledge_documents (
            document_id, tenant_id, source_id, page_url, title, section, content, content_hash, created_at, updated_at, confidence, classification
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          document.documentId,
          document.tenantId,
          document.sourceId,
          document.pageUrl,
          document.title,
          document.section,
          document.content,
          document.contentHash,
          document.createdAt,
          document.updatedAt,
          document.confidence,
          document.classification,
        );
      }

      for (const chunk of orderedChunks) {
        this.db.prepare(`
          INSERT INTO knowledge_chunks (
            chunk_id, tenant_id, version, document_id, page_url, title, section, content, content_hash, chunk_order, classification, confidence, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          chunk.chunkId,
          chunk.tenantId,
          chunk.version,
          chunk.documentId,
          chunk.pageUrl,
          chunk.title,
          chunk.section,
          chunk.content,
          chunk.contentHash,
          chunk.chunkOrder,
          chunk.classification,
          chunk.confidence,
          chunk.createdAt,
        );
      }

      for (const relation of relations) {
        this.db.prepare(`
          INSERT INTO knowledge_relations (
            relation_id, tenant_id, version, from_chunk_id, to_chunk_id, relation_type, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          relation.relationId,
          relation.tenantId,
          relation.version,
          relation.fromChunkId,
          relation.toChunkId,
          relation.relationType,
          relation.createdAt,
        );
      }

      this.db.prepare(`
        INSERT INTO knowledge_versions (
          tenant_id, version, source_id, scan_version, document_count, chunk_count, duplicates_removed, average_chunk_size, knowledge_freshness, created_at, stats_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tenantId,
        version,
        sourceId,
        scanVersion,
        stats.documentCount,
        stats.chunkCount,
        stats.duplicatesRemoved,
        stats.averageChunkSize,
        stats.knowledgeFreshness,
        now,
        JSON.stringify(stats),
      );
    })();

    return {
      tenantId,
      version,
      sourceId,
      scanVersion,
      documentCount: stats.documentCount,
      chunkCount: stats.chunkCount,
      duplicatesRemoved: stats.duplicatesRemoved,
      averageChunkSize: stats.averageChunkSize,
      confidenceAverage: stats.confidenceAverage,
      changedChunkCount: stats.changedChunkCount,
      unchangedChunkCount: stats.unchangedChunkCount,
      knowledgeFreshness: stats.knowledgeFreshness,
      createdAt: now,
      statsJson: JSON.stringify(stats),
    };
  }

  public listVersions(tenantId: string): KnowledgeVersionRecord[] {
    const rows = this.db.prepare(
      'SELECT * FROM knowledge_versions WHERE tenant_id = ? ORDER BY version ASC'
    ).all(tenantId) as any[];
    return rows.map(row => ({
      tenantId: row.tenant_id,
      version: row.version,
      sourceId: row.source_id,
      scanVersion: row.scan_version,
      documentCount: row.document_count,
      chunkCount: row.chunk_count,
      duplicatesRemoved: row.duplicates_removed,
      averageChunkSize: row.average_chunk_size,
      confidenceAverage: JSON.parse(row.stats_json).confidenceAverage || 0,
      changedChunkCount: JSON.parse(row.stats_json).changedChunkCount || 0,
      unchangedChunkCount: JSON.parse(row.stats_json).unchangedChunkCount || 0,
      knowledgeFreshness: row.knowledge_freshness,
      createdAt: row.created_at,
      statsJson: row.stats_json,
    }));
  }

  public getVersion(tenantId: string, version: number): KnowledgeVersionRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM knowledge_versions WHERE tenant_id = ? AND version = ?'
    ).get(tenantId, version) as any;
    if (!row) return null;
    const parsedStats = JSON.parse(row.stats_json || '{}');
    return {
      tenantId: row.tenant_id,
      version: row.version,
      sourceId: row.source_id,
      scanVersion: row.scan_version,
      documentCount: row.document_count,
      chunkCount: row.chunk_count,
      duplicatesRemoved: row.duplicates_removed,
      averageChunkSize: row.average_chunk_size,
      confidenceAverage: parsedStats.confidenceAverage || 0,
      changedChunkCount: parsedStats.changedChunkCount || 0,
      unchangedChunkCount: parsedStats.unchangedChunkCount || 0,
      knowledgeFreshness: row.knowledge_freshness,
      createdAt: row.created_at,
      statsJson: row.stats_json,
    };
  }

  public getLatestVersion(tenantId: string): number {
    const row = this.db.prepare(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM knowledge_versions WHERE tenant_id = ?'
    ).get(tenantId) as any;
    return Number(row?.max_version || 0);
  }

  public getTenantDocuments(tenantId: string): KnowledgeDocumentEntry[] {
    const rows = this.db.prepare(
      'SELECT * FROM knowledge_documents WHERE tenant_id = ? ORDER BY created_at DESC'
    ).all(tenantId) as any[];
    return rows.map(row => ({
      documentId: row.document_id,
      tenantId: row.tenant_id,
      sourceId: row.source_id,
      pageUrl: row.page_url,
      title: row.title,
      section: row.section,
      content: row.content,
      contentHash: row.content_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      confidence: row.confidence,
      classification: row.classification,
    }));
  }

  public getTenantChunks(tenantId: string, version?: number): KnowledgeChunkRecord[] {
    const sql = version != null
      ? 'SELECT * FROM knowledge_chunks WHERE tenant_id = ? AND version = ? ORDER BY chunk_order ASC'
      : 'SELECT * FROM knowledge_chunks WHERE tenant_id = ? ORDER BY chunk_order ASC';
    const params = version != null ? [tenantId, version] : [tenantId];
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => ({
      chunkId: row.chunk_id,
      tenantId: row.tenant_id,
      version: row.version,
      documentId: row.document_id,
      pageUrl: row.page_url,
      title: row.title,
      section: row.section,
      content: row.content,
      contentHash: row.content_hash,
      chunkOrder: row.chunk_order,
      classification: row.classification,
      confidence: row.confidence,
      createdAt: row.created_at,
    }));
  }

  public getTenantRelations(tenantId: string, version?: number): KnowledgeRelationRecord[] {
    const sql = version != null
      ? 'SELECT * FROM knowledge_relations WHERE tenant_id = ? AND version = ? ORDER BY created_at ASC'
      : 'SELECT * FROM knowledge_relations WHERE tenant_id = ? ORDER BY created_at ASC';
    const params = version != null ? [tenantId, version] : [tenantId];
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => ({
      relationId: row.relation_id,
      tenantId: row.tenant_id,
      version: row.version,
      fromChunkId: row.from_chunk_id,
      toChunkId: row.to_chunk_id,
      relationType: row.relation_type,
      createdAt: row.created_at,
    }));
  }

  private getNextVersion(tenantId: string): number {
    const row = this.db.prepare(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM knowledge_versions WHERE tenant_id = ?'
    ).get(tenantId) as any;
    return Number(row?.max_version || 0) + 1;
  }

  private composePageContent(page: NonNullable<NonNullable<WebsiteScanLike['report']>['pages']>[number], profile: Record<string, unknown>): string {
    return this.composePageSegments(page, profile)
      .map(segment => segment.content)
      .join(' ');
  }

  private composePageSegments(page: NonNullable<NonNullable<WebsiteScanLike['report']>['pages']>[number], profile: Record<string, unknown>): Array<{ type: string; content: string }> {
    const segments: Array<{ type: string; content: string }> = [];
    if (page.title) segments.push({ type: 'Company', content: page.title });
    if (page.meta?.description) segments.push({ type: 'Company', content: String(page.meta.description) });
    if (page.meta?.textPreview) segments.push({ type: 'Company', content: String(page.meta.textPreview) });
    const intelligence = page.intelligence || {};
    if (Array.isArray(intelligence.services) && intelligence.services.length > 0) {
      segments.push({ type: 'Services', content: intelligence.services.join(' ') });
    }
    if (Array.isArray(intelligence.products) && intelligence.products.length > 0) {
      segments.push({ type: 'Products', content: intelligence.products.join(' ') });
    }
    if (Array.isArray(intelligence.pricing) && intelligence.pricing.length > 0) {
      segments.push({ type: 'Pricing', content: intelligence.pricing.join(' ') });
    }
    if (Array.isArray(intelligence.contact) && intelligence.contact.length > 0) {
      segments.push({ type: 'Contact', content: intelligence.contact.join(' ') });
    }
    if (Array.isArray(intelligence.about) && intelligence.about.length > 0) {
      segments.push({ type: 'Company', content: intelligence.about.join(' ') });
    }
    if (Array.isArray(intelligence.faq) && intelligence.faq.length > 0) {
      segments.push({ type: 'FAQ', content: intelligence.faq.join(' ') });
    }
    if (Array.isArray(intelligence.features) && intelligence.features.length > 0) {
      segments.push({ type: 'Features', content: intelligence.features.join(' ') });
    }
    if (Array.isArray(intelligence.benefits) && intelligence.benefits.length > 0) {
      segments.push({ type: 'Benefits', content: intelligence.benefits.join(' ') });
    }
    if ((profile as any)?.companyName) segments.push({ type: 'Company', content: String((profile as any).companyName) });
    return segments;
  }

  private normalizeText(input: string): string {
    return input.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();
  }

  private removeBoilerplate(text: string): string {
    return text
      .replace(/cookie(s)? banner/gi, ' ')
      .replace(/copyright[^\n]*/gi, ' ')
      .replace(/all rights reserved/gi, ' ')
      .replace(/privacy policy/gi, ' ')
      .replace(/terms of use/gi, ' ')
      .replace(/footer[\s\S]*/gi, ' ')
      .replace(/menu[\s\S]*/gi, ' ')
      .replace(/navigation[\s\S]*/gi, ' ')
      .replace(/\b(about|contact|faq|pricing|services|support|blog|home)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private classifySection(section: string, text: string): string {
    const lower = `${section} ${text}`.toLowerCase();
    if (/pricing|plans|packages|quote/i.test(lower)) return 'Pricing';
    if (/faq|support|help|questions/i.test(lower)) return 'FAQ';
    if (/testimonial|review|trusted by/i.test(lower)) return 'Testimonials';
    if (/contact|reach out|get in touch|book a demo/i.test(lower)) return 'Contact';
    if (/case study|customer story|success story/i.test(lower)) return 'Case Studies';
    if (/blog|news|insights|article/i.test(lower)) return 'Blog';
    if (/policy|privacy|terms|cookie|security/i.test(lower)) return 'Policies';
    if (/product|platform|software|tool|suite/i.test(lower)) return 'Products';
    if (/service|service|consulting|onboarding|implementation|workflow|automation/i.test(lower)) return 'Services';
    if (/benefit|improve|faster|save|simplify/i.test(lower)) return 'Benefits';
    if (/feature|includes|supports|integrates|provides/i.test(lower)) return 'Features';
    if (/trust|certified|soc 2|iso|gdpr|secure/i.test(lower)) return 'Trust Signals';
    return 'Company';
  }

  private chunkContent(segments: Array<{ type: string; content: string }>, document: KnowledgeDocumentEntry, version: number): KnowledgeChunkRecord[] {
    const chunks: KnowledgeChunkRecord[] = [];
    let chunkIndex = 0;

    for (const segment of segments) {
      const sentences = this.splitIntoSentences(segment.content);
      for (const sentence of sentences) {
        const normalizedSentence = sentence.trim();
        if (!normalizedSentence) continue;
        chunks.push(this.makeChunk(document, version, chunkIndex, normalizedSentence, segment.type));
        chunkIndex += 1;
      }
    }

    if (chunks.length === 0) {
      const fallbackText = this.normalizeText(document.content);
      if (fallbackText) {
        chunks.push(this.makeChunk(document, version, 0, fallbackText, document.classification));
      }
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(sentence => sentence.trim())
      .filter(Boolean);
  }

  private makeChunk(document: KnowledgeDocumentEntry, version: number, chunkOrder: number, content: string, classifierHint?: string): KnowledgeChunkRecord {
    const chunkId = randomUUID();
    const classification = this.classifySection(classifierHint || document.section, content);
    return {
      chunkId,
      tenantId: document.tenantId,
      version,
      documentId: document.documentId,
      pageUrl: document.pageUrl,
      title: document.title,
      section: document.section,
      content,
      contentHash: this.sha256(content),
      chunkOrder,
      classification,
      confidence: document.confidence,
      createdAt: new Date().toISOString(),
    };
  }

  private deduplicateChunks(chunks: KnowledgeChunkRecord[]): KnowledgeChunkRecord[] {
    const seen = new Map<string, KnowledgeChunkRecord>();
    for (const chunk of chunks) {
      if (seen.has(chunk.contentHash)) continue;
      seen.set(chunk.contentHash, chunk);
    }
    return Array.from(seen.values());
  }

  private filterChunks(chunks: KnowledgeChunkRecord[]): KnowledgeChunkRecord[] {
    return chunks.filter(chunk => {
      const text = chunk.content.trim();
      if (text.length < 24) return false;
      if (/^cookie|^menu|^navigation|^footer|^privacy policy|^terms/i.test(text)) return false;
      return true;
    });
  }

  private buildRelations(chunks: KnowledgeChunkRecord[], version: number): KnowledgeRelationRecord[] {
    const relations: KnowledgeRelationRecord[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < chunks.length - 1; i += 1) {
      const current = chunks[i];
      const next = chunks[i + 1];
      const relationType = this.relationType(current.classification, next.classification, current.content, next.content);
      const key = `${current.chunkId}->${next.chunkId}:${relationType}`;
      if (!seen.has(key)) {
        seen.add(key);
        relations.push({
          relationId: randomUUID(),
          tenantId: current.tenantId,
          version,
          fromChunkId: current.chunkId,
          toChunkId: next.chunkId,
          relationType,
          createdAt: new Date().toISOString(),
        });
      }
    }

    for (let i = 0; i < chunks.length; i += 1) {
      for (let j = i + 1; j < chunks.length; j += 1) {
        const from = chunks[i];
        const to = chunks[j];
        const relationType = this.relationType(from.classification, to.classification, from.content, to.content);
        const key = `${from.chunkId}->${to.chunkId}:${relationType}`;
        if (relationType === 'context-link' || seen.has(key)) continue;
        seen.add(key);
        relations.push({
          relationId: randomUUID(),
          tenantId: from.tenantId,
          version,
          fromChunkId: from.chunkId,
          toChunkId: to.chunkId,
          relationType,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return relations;
  }

  private relationType(from: string, to: string, fromText: string, toText: string): string {
    const pair = [from, to].sort().join('::');
    if (pair === ['Products', 'Pricing'].sort().join('::')) return 'products-pricing';
    if (pair === ['Services', 'Testimonials'].sort().join('::')) return 'services-testimonials';
    if (pair === ['Features', 'Benefits'].sort().join('::')) return 'features-benefits';
    if ((from === 'FAQ' && to === 'Services') || (from === 'Services' && to === 'FAQ')) return 'faq-service';
    if ((from === 'Benefits' && /book a demo|contact us|quote|schedule/i.test(`${fromText} ${toText}`)) || (to === 'Benefits' && /book a demo|contact us|quote|schedule/i.test(`${fromText} ${toText}`))) return 'benefits-cta';
    if ((from === 'Pricing' && /book a demo|contact us|quote|schedule/i.test(`${fromText} ${toText}`)) || (to === 'Pricing' && /book a demo|contact us|quote|schedule/i.test(`${fromText} ${toText}`))) return 'pricing-cta';
    if (from === 'Contact' && to === 'FAQ') return 'support-path';
    if (from === 'FAQ' && to === 'Testimonials') return 'trust-path';
    return 'context-link';
  }

  private buildStats(documents: KnowledgeDocumentEntry[], chunks: KnowledgeChunkRecord[], duplicatesRemoved: number, version: number, scanVersion: string, createdAt: string, changedChunkCount: number, unchangedChunkCount: number): KnowledgeStats {
    const documentCount = documents.length;
    const chunkCount = chunks.length;
    const averageChunkSize = chunkCount > 0
      ? Number((chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunkCount).toFixed(2))
      : 0;
    const confidenceAverage = chunkCount > 0
      ? Number((chunks.reduce((sum, chunk) => sum + chunk.confidence, 0) / chunkCount).toFixed(2))
      : 0;
    return {
      documentCount,
      chunkCount,
      duplicatesRemoved,
      averageChunkSize,
      confidenceAverage,
      changedChunkCount,
      unchangedChunkCount,
      knowledgeFreshness: createdAt,
      scanVersion,
      version,
      tenantId: documents[0]?.tenantId || 'unknown',
      sourceId: documents[0]?.sourceId || scanVersion,
    };
  }

  private inferConfidence(page: NonNullable<NonNullable<WebsiteScanLike['report']>['pages']>[number], profile: Record<string, unknown>): number {
    const score = Number(page.score || 0);
    const profileHint = profile && Object.keys(profile).length > 0 ? 0.1 : 0;
    const descriptionHint = page.meta?.description ? 0.05 : 0;
    const serviceHint = Array.isArray(page.intelligence?.services) && page.intelligence.services.length > 0 ? 0.04 : 0;
    const pricingHint = Array.isArray(page.intelligence?.pricing) && page.intelligence.pricing.length > 0 ? 0.03 : 0;
    const contactHint = Array.isArray(page.intelligence?.contact) && page.intelligence.contact.length > 0 ? 0.02 : 0;
    const faqHint = Array.isArray(page.intelligence?.faq) && page.intelligence.faq.length > 0 ? 0.02 : 0;
    const productHint = Array.isArray(page.intelligence?.products) && page.intelligence.products.length > 0 ? 0.02 : 0;
    const featureHint = Array.isArray(page.intelligence?.features) && page.intelligence.features.length > 0 ? 0.02 : 0;
    const benefitHint = Array.isArray(page.intelligence?.benefits) && page.intelligence.benefits.length > 0 ? 0.02 : 0;
    return Math.min(0.99, Number((0.35 + score * 0.4 + profileHint + descriptionHint + serviceHint + pricingHint + contactHint + faqHint + productHint + featureHint + benefitHint).toFixed(2)));
  }

  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
