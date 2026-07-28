import { ParsedDocument, NormalizedDocument, NormalizedSection } from '../types';
import { Normalizer } from '../interfaces';

const BOILERPLATE_PATTERNS = [
  /^copyright\s+©\s+\d{4}.*$/i,
  /^all rights reserved\.?$/i,
  /^terms\s+of\s+service\.?$/i,
  /^privacy\s+policy\.?$/i,
  /^cookie\s+policy\.?$/i,
  /^contact\s+(us|support)\.?$/i,
  /^follow\s+us\s+on\s+\w+/i,
  /^subscribe\s+to\s+our\s+newsletter\.?$/i,
  /^share\s+this\s+/i,
  /^\s*\[?(?:pdf|download|print|email)\s*\]?\s*$/i,
  /^\s*page\s+\d+\s+of\s+\d+\s*$/i,
];

export class ContentNormalizer implements Normalizer {
  async normalize(doc: ParsedDocument): Promise<NormalizedDocument> {
    const cleaned = this.removeBoilerplate(doc.content);
    const normalized = this.normalizeWhitespace(cleaned);
    const sections = this.buildSections(doc, normalized);

    return {
      documentId: doc.documentId,
      tenantId: doc.tenantId,
      sourceType: doc.sourceType,
      originalName: doc.originalName,
      title: doc.title,
      sections,
      metadata: { ...doc.metadata },
      contentHash: doc.contentHash,
    };
  }

  removeBoilerplate(content: string): string {
    const lines = content.split('\n');
    const filtered = lines.filter(line => {
      for (const pattern of BOILERPLATE_PATTERNS) {
        if (pattern.test(line)) return false;
      }
      return true;
    });
    return filtered.join('\n');
  }

  normalizeWhitespace(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \t]+$/gm, '')
      .replace(/^[ \t]+/gm, '')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }

  buildSections(doc: ParsedDocument, content: string): NormalizedSection[] {
    const sections: NormalizedSection[] = [];
    const lines = content.split('\n');
    let currentHeading = 'Introduction';
    let currentLevel = 1;
    let currentContent: string[] = [];
    let sectionCounters: number[] = [0];
    let position = 0;

    const headingMap = new Map(doc.headings.map(h => [h.position, h]));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const heading = headingMap.get(i);

      if (heading) {
        if (currentContent.length > 0) {
          sectionCounters[sectionCounters.length - 1]++;
          sections.push({
            sectionPath: this.buildSectionPath(sectionCounters),
            heading: currentHeading,
            level: currentLevel,
            content: currentContent.join('\n').trim(),
            position: position++,
          });
        }

        currentHeading = heading.text;
        currentLevel = heading.level;
        currentContent = [];

        while (sectionCounters.length < heading.level) {
          sectionCounters.push(0);
        }
        sectionCounters = sectionCounters.slice(0, heading.level);
      } else if (line.trim()) {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      sectionCounters[sectionCounters.length - 1]++;
      sections.push({
        sectionPath: this.buildSectionPath(sectionCounters),
        heading: currentHeading,
        level: currentLevel,
        content: currentContent.join('\n').trim(),
        position: position++,
      });
    }

    if (sections.length === 0) {
      sections.push({
        sectionPath: '1',
        heading: doc.title,
        level: 1,
        content: content,
        position: 0,
      });
    }

    return sections;
  }

  private buildSectionPath(counters: number[]): string {
    return counters.join('.');
  }
}
