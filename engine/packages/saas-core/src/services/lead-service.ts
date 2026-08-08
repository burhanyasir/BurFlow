import { LeadRepository } from '../db/repositories';
import { Lead, LeadSource, BuyingIntentLevel } from '../types';
import { ContactDetails, determineQualificationStatus, mapScoreToBuyingIntent } from './lead-extraction';

export interface UpsertLeadInput {
  tenantId: string;
  sessionId: string;
  conversationId?: string;
  email?: string;
  phone?: string;
  name?: string;
  company?: string;
  leadScore: number;
  buyingIntent?: BuyingIntentLevel;
  source?: LeadSource;
  metadata?: Record<string, unknown>;
}

export interface LeadUpsertResult {
  lead: Lead;
  isNew: boolean;
  qualificationChanged: boolean;
}

export interface LeadServiceHooks {
  onLeadCaptured?: (lead: Lead, context: { sessionId: string; tenantId: string }) => void;
  onLeadQualified?: (lead: Lead, context: { sessionId: string; tenantId: string }) => void;
}

export class LeadService {
  private hooks: LeadServiceHooks;

  constructor(
    private leadRepo: LeadRepository,
    hooks?: LeadServiceHooks,
  ) {
    this.hooks = hooks || {};
  }

  setHooks(hooks: LeadServiceHooks): void {
    this.hooks = hooks;
  }

  upsertLead(input: UpsertLeadInput): LeadUpsertResult | null {
    const hasContact = Boolean(input.email || input.phone || input.name || input.company);
    const highIntent = input.leadScore >= 60;
    if (!hasContact && !highIntent) return null;

    const status = determineQualificationStatus(input.leadScore, input.buyingIntent || mapScoreToBuyingIntent(input.leadScore));
    const intent = input.buyingIntent || mapScoreToBuyingIntent(input.leadScore);

    const result = this.leadRepo.upsertBySession({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      email: input.email,
      phone: input.phone,
      name: input.name,
      company: input.company,
      qualificationStatus: status,
      leadScore: Math.round(input.leadScore),
      buyingIntent: intent,
      source: input.source || 'chat',
      metadata: input.metadata || {},
    });

    const context = { sessionId: input.sessionId, tenantId: input.tenantId };
    if (result.isNew && this.hooks.onLeadCaptured) {
      this.hooks.onLeadCaptured(result.lead, context);
    }
    if (result.qualificationChanged && result.lead.qualificationStatus === 'sales_qualified' && this.hooks.onLeadQualified) {
      this.hooks.onLeadQualified(result.lead, context);
    }

    return result;
  }

  captureFromMessage(input: UpsertLeadInput & { extracted?: ContactDetails | null }): LeadUpsertResult | null {
    const extracted = input.extracted || {};
    return this.upsertLead({
      ...input,
      email: input.email ?? extracted.email,
      phone: input.phone ?? extracted.phone,
      name: input.name ?? extracted.name,
      company: input.company ?? extracted.company,
    });
  }
}
