import { QualificationStatus, BuyingIntentLevel, LeadSource, Lead } from '../types';

export interface ContactDetails {
  email?: string;
  phone?: string;
  name?: string;
  company?: string;
}

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

const PHONE_REGEX = /(?<![\d+])(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?(?:\d{3}[\s.-]?\d{3}[\s.-]?\d{4}|\d{3}[\s.-]?\d{4})(?!\d)/;

const NAME_PATTERNS: RegExp[] = [
  /\bmy name is\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i,
  /\bI'?m\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s*(?:,|\.|!|\?|$|\s+(?:from|at|working|the|and|but)))/i,
  /\bI am\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})(?=\s*(?:,|\.|!|\?|$|\s+(?:from|at|working|the|and|but)))/i,
  /\bcall me\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i,
  /\bthis is\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i,
];

const COMPANY_PATTERNS: RegExp[] = [
  /\bI work at\s+([A-Za-z0-9&'.-]+(?:\s+[A-Za-z0-9&'.-]+)*)/i,
  /\bI'?m from\s+([A-Za-z0-9&'.-]+(?:\s+[A-Za-z0-9&'.-]+)*)/i,
  /\bat\s+([A-Za-z0-9&'.-]{2,}(?:\s+[A-Za-z0-9&'.-]+)*)(?=\s*(?:,|\.|!|\?|$|\s+(?:we|and|with)))/i,
  /\bwe are\s+([A-Za-z0-9&'.-]+(?:\s+[A-Za-z0-9&'.-]+)*)/i,
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'and', 'but', 'for', 'with', 'from', 'at',
  'my', 'your', 'our', 'their', 'not', 'can', 'will', 'would', 'please', 'about',
  'before', 'after', 'however', 'because', 'just', 'want', 'need', 'thanks',
  'thank', 'hello', 'hi', 'hey', 'ok', 'okay', 'sure', 'yes', 'no', 'i', 'we',
]);

function isProperNameWord(word: string): boolean {
  return /^[A-Z]/.test(word) && !/^[A-Z]{3,}$/.test(word);
}

function filterProperWords(value: string): string | undefined {
  if (!value) return undefined;
  const words = value.trim().split(/\s+/).filter(w => w.length > 0);
  const kept = words.filter(w => isProperNameWord(w) && !STOP_WORDS.has(w.toLowerCase()));
  if (kept.length === 0) return undefined;
  return kept.join(' ');
}

function cleanValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().replace(/[.,!?;]+$/g, '').trim();
  if (!cleaned) return undefined;
  return cleaned;
}

export function extractContactDetails(message: string): ContactDetails {
  if (!message || typeof message !== 'string') return {};

  const details: ContactDetails = {};

  const emailMatch = message.match(EMAIL_REGEX);
  if (emailMatch) details.email = emailMatch[0].toLowerCase();

  const phoneMatch = message.match(PHONE_REGEX);
  if (phoneMatch) {
    const phone = phoneMatch[0].trim();
    if (phone.replace(/[^\d]/g, '').length >= 7) details.phone = phone;
  }

  for (const pattern of NAME_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const name = filterProperWords(cleanValue(match[1]) || '');
      if (name) {
        details.name = name;
        break;
      }
    }
  }

  for (const pattern of COMPANY_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const company = filterProperWords(cleanValue(match[1]) || '');
      if (company) {
        details.company = company;
        break;
      }
    }
  }

  return details;
}

export function determineQualificationStatus(
  leadScore: number,
  buyingIntent: BuyingIntentLevel | boolean | string,
): QualificationStatus {
  const intentLevel = typeof buyingIntent === 'boolean'
    ? (buyingIntent ? 'high' : 'low')
    : String(buyingIntent || 'low').toLowerCase();

  if (leadScore >= 70 || intentLevel === 'high') return 'sales_qualified';
  if (leadScore >= 30 || intentLevel === 'medium') return 'marketing_qualified';
  return 'unqualified';
}

export function mapScoreToBuyingIntent(score: number): BuyingIntentLevel {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export interface BuildLeadDataInput {
  tenantId: string;
  sessionId: string;
  conversationId?: string;
  extracted?: ContactDetails | null;
  leadScore: number;
  buyingIntent: BuyingIntentLevel | boolean;
  source?: LeadSource;
  metadata?: Record<string, unknown>;
}

export interface BuiltLeadData {
  lead: Lead;
  isNew: boolean;
  qualificationChanged: boolean;
}

export function buildLeadData(input: BuildLeadDataInput): BuiltLeadData {
  const extracted = input.extracted || {};
  const score = Math.max(0, Math.min(100, Math.round(input.leadScore)));
  const status = determineQualificationStatus(score, input.buyingIntent);
  const intent = typeof input.buyingIntent === 'boolean'
    ? (input.buyingIntent ? 'high' : 'low')
    : (input.buyingIntent || 'low') as BuyingIntentLevel;

  return {
    lead: {
      id: '',
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      email: extracted.email,
      phone: extracted.phone,
      name: extracted.name,
      company: extracted.company,
      qualificationStatus: status,
      leadScore: score,
      buyingIntent: intent,
      source: input.source || 'chat',
      metadata: input.metadata || {},
      createdAt: '',
      updatedAt: '',
    },
    isNew: true,
    qualificationChanged: true,
  };
}

export function hasContactInfo(details: ContactDetails | null | undefined): boolean {
  if (!details) return false;
  return Boolean(details.email || details.phone || details.name || details.company);
}
