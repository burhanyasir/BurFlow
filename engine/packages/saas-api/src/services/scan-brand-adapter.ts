/**
 * scan-brand-adapter.ts
 *
 * After a website crawl completes, this adapter reads the extracted brand signals
 * and automatically updates the tenant's widget configuration so the chatbot
 * fully adapts to the scanned website — colors, logo, greeting, starter options,
 * and a system-prompt hint that powers context-aware responses.
 */

import type { WidgetConfigRepository } from '@conversation-engine/saas-core';
import type { ParsedDocument } from '@conversation-engine/knowledge-pipeline';
import { createLogger, createContextLogger } from '@conversation-engine/logger';

const logger = createLogger('saas-api:scan-brand-adapter');

export interface BrandSignals {
  primaryColor?: string;
  logoUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogSiteName?: string;
  themeColor?: string;
  favicon?: string;
  h1Text?: string;
  ctaTexts?: string[];
}

export interface AdaptedWidgetConfig {
  companyName?: string;
  greeting?: string;
  primaryColor?: string;
  logoUrl?: string;
  starterOptions?: string[];
  businessProfile?: Record<string, unknown>;
}

/** Business type detection from crawled content. */
function detectBusinessType(docs: ParsedDocument[]): string {
  const allText = docs.map(d => d.content || '').join(' ').toLowerCase();
  if (/dentist|dental|teeth|orthodont|cavity|implant/.test(allText)) return 'dental';
  if (/restaurant|menu|reservation|cuisine|dining|chef|bistro/.test(allText)) return 'restaurant';
  if (/gym|fitness|workout|membership|personal trainer|class schedule/.test(allText)) return 'fitness';
  if (/salon|spa|hair|nail|beauty|massage|facial/.test(allText)) return 'salon';
  if (/real estate|property|listing|mortgage|realtor|home for sale/.test(allText)) return 'real_estate';
  if (/law|attorney|legal|lawsuit|counsel|litigation/.test(allText)) return 'legal';
  if (/ecommerce|e-commerce|add to cart|buy now|free shipping|checkout|product/.test(allText)) return 'ecommerce';
  if (/api|dashboard|saas|subscription|free trial|enterprise|integration|software/.test(allText)) return 'saas';
  if (/school|university|course|enroll|tuition|degree|campus/.test(allText)) return 'education';
  if (/hospital|clinic|doctor|patient|appointment|healthcare|medical/.test(allText)) return 'healthcare';
  return 'general';
}

/** Generate smart starter options based on business type and crawled pages. */
function buildStarterOptions(businessType: string, docs: ParsedDocument[]): string[] {
  const urls = docs.map(d => (d.metadata?.sourceUrl as string || '').toLowerCase());
  const allText = docs.map(d => d.content || '').join(' ').toLowerCase();

  const hasPricing = urls.some(u => u.includes('pricing') || u.includes('plans'));
  const hasServices = urls.some(u => u.includes('service')) || allText.includes('our services');
  const hasContact = urls.some(u => u.includes('contact'));
  const hasFaq = urls.some(u => u.includes('faq')) || allText.includes('frequently asked');
  const hasProducts = urls.some(u => u.includes('product') || u.includes('shop') || u.includes('store'));

  const options: string[] = [];

  switch (businessType) {
    case 'dental':
      options.push('Book an appointment');
      if (hasServices) options.push('What dental services do you offer?');
      options.push('Do you accept my insurance?');
      if (hasContact) options.push('Where are you located?');
      break;
    case 'restaurant':
      options.push('View the menu');
      options.push('Make a reservation');
      if (hasContact) options.push('What are your hours?');
      options.push('Do you offer delivery?');
      break;
    case 'fitness':
      options.push('View membership plans');
      options.push('See class schedule');
      if (hasPricing) options.push('How much does it cost?');
      options.push('Book a free trial session');
      break;
    case 'salon':
      options.push('Book an appointment');
      options.push('What services do you offer?');
      if (hasPricing) options.push('How much do services cost?');
      break;
    case 'real_estate':
      options.push('View available listings');
      options.push('Schedule a viewing');
      options.push('How do I get pre-approved?');
      break;
    case 'legal':
      options.push('Schedule a consultation');
      options.push('What areas of law do you cover?');
      if (hasContact) options.push('How do I reach your team?');
      break;
    case 'ecommerce':
      options.push('Track my order');
      options.push("What's your return policy?");
      if (hasProducts) options.push('View our products');
      options.push('Do you offer free shipping?');
      break;
    case 'saas':
      if (hasPricing) options.push('Compare pricing plans');
      options.push('Schedule a demo');
      options.push('What integrations do you support?');
      break;
    case 'healthcare':
      options.push('Book an appointment');
      options.push('Do you accept my insurance?');
      if (hasContact) options.push('Find a location near me');
      break;
    default:
      if (hasPricing) options.push('Show me pricing');
      if (hasServices) options.push('What do you offer?');
      if (hasFaq) options.push('View frequently asked questions');
      if (hasContact) options.push('How can I contact you?');
  }

  // Ensure at least 3 options
  const defaults = [
    'What do you offer?',
    'How can I get started?',
    'Tell me more about your business',
  ];
  for (const d of defaults) {
    if (options.length >= 3) break;
    if (!options.includes(d)) options.push(d);
  }

  return options.slice(0, 4);
}

/** Build a systemPromptHint from brand signals and business type. */
function buildSystemPromptHint(
  companyName: string,
  businessType: string,
  brandSignals: BrandSignals,
  topContent: string,
): string {
  const tone = businessType === 'legal' ? 'professional and formal'
    : businessType === 'dental' || businessType === 'healthcare' ? 'warm, reassuring, and professional'
    : businessType === 'ecommerce' ? 'helpful, friendly, and sales-oriented'
    : businessType === 'saas' ? 'concise, technical, and helpful'
    : businessType === 'restaurant' ? 'warm, inviting, and enthusiastic'
    : 'friendly and helpful';

  const description = brandSignals.ogDescription || '';
  const h1 = brandSignals.h1Text || '';

  let hint = `You are the AI assistant for ${companyName}. Respond in a ${tone} tone.`;
  if (description) hint += ` The business is described as: "${description.slice(0, 200)}".`;
  if (h1 && h1 !== companyName) hint += ` Their main headline is: "${h1.slice(0, 100)}".`;
  if (topContent) hint += `\n\nKey information about this business:\n${topContent.slice(0, 1500)}`;
  hint += `\n\nAlways use information from the business knowledge base when answering. If you don't know something, offer to connect the visitor with the team.`;

  return hint;
}

/**
 * Apply scanned brand signals + crawled docs to the widget config.
 * Runs after every crawl. All updates are best-effort: failures don't surface to the user.
 */
export async function applyBrandAdaptation(
  tenantId: string,
  docs: ParsedDocument[],
  widgetConfigRepo: WidgetConfigRepository,
): Promise<void> {
  const ctxLogger = createContextLogger(logger);
  try {
    if (docs.length === 0) return;

    // Extract brand signals from the first/home page doc metadata
    const homePage = docs.reduce((best, d) => {
      const url = (d.metadata?.sourceUrl as string || '');
      const pathLen = (() => { try { return new URL(url).pathname.length; } catch { return 999; } })();
      const bestUrl = (best?.metadata?.sourceUrl as string || '');
      const bestPathLen = (() => { try { return new URL(bestUrl).pathname.length; } catch { return 999; } })();
      return pathLen < bestPathLen ? d : best;
    }, docs[0]);

    const brandSignals: BrandSignals = (homePage?.metadata?.brandSignals as BrandSignals) || {};

    // Detect business type
    const businessType = detectBusinessType(docs);

    // Derive company name
    let companyName: string | undefined =
      brandSignals.ogSiteName ||
      (() => {
        const t = homePage?.title || '';
        const dashIdx = t.search(/\s*[—–\-|]\s*/);
        return dashIdx > 0 ? t.slice(0, dashIdx).trim() : t.split(' ').slice(0, 4).join(' ').trim();
      })() ||
      undefined;
    if (companyName && companyName.length > 60) companyName = companyName.slice(0, 60);
    if (!companyName || companyName.length < 2) companyName = undefined;

    // Derive greeting
    let greeting: string | undefined;
    if (companyName) {
      const h1 = brandSignals.h1Text || '';
      const tagline = h1 && h1.length < 80 && h1.toLowerCase() !== companyName.toLowerCase()
        ? ` ${h1}` : '';
      greeting = `Hi! Welcome to ${companyName}.${tagline ? ` ${tagline}.` : ''} How can we help you today?`;
      if (greeting.length > 200) greeting = `Hi! Welcome to ${companyName}. How can we help you today?`;
    }

    // Derive color
    let primaryColor: string | undefined =
      brandSignals.themeColor ||
      brandSignals.primaryColor ||
      undefined;
    // Only accept valid hex colors
    if (primaryColor && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(primaryColor)) {
      primaryColor = undefined;
    }

    // Derive logo
    let logoUrl: string | undefined = brandSignals.logoUrl || undefined;
    if (logoUrl && logoUrl.length > 2048) logoUrl = undefined;

    // Build starter options
    const starterOptions = buildStarterOptions(businessType, docs);

    // Build system prompt hint
    const topContent = docs
      .slice(0, 5)
      .map(d => d.content || '')
      .join('\n\n')
      .slice(0, 3000);
    const systemPromptHint = companyName
      ? buildSystemPromptHint(companyName, businessType, brandSignals, topContent)
      : undefined;

    // Assemble the widget config update
    const existingConfig = widgetConfigRepo.get(tenantId) || {};
    const existingProfile = (existingConfig as any).businessProfile || {};

    const businessProfile: Record<string, unknown> = {
      ...existingProfile,
      businessType,
      _adaptedAt: new Date().toISOString(),
      _sourceUrl: homePage?.metadata?.sourceUrl || '',
    };
    if (systemPromptHint) businessProfile.systemPromptHint = systemPromptHint;
    if (brandSignals.ctaTexts?.length) businessProfile.ctaTexts = brandSignals.ctaTexts.slice(0, 5);
    if (brandSignals.ogDescription) businessProfile.description = brandSignals.ogDescription.slice(0, 500);

    const updatePayload: Record<string, unknown> = {
      starterOptions,
      businessProfile,
    };
    if (companyName && !(existingConfig as any).companyName) updatePayload.companyName = companyName;
    if (greeting && !(existingConfig as any).greeting) updatePayload.greeting = greeting;
    if (primaryColor && !(existingConfig as any).primaryColor) updatePayload.primaryColor = primaryColor;
    if (logoUrl && !(existingConfig as any).logoUrl) updatePayload.logoUrl = logoUrl;

    widgetConfigRepo.upsert(tenantId, updatePayload);
    ctxLogger.info({ tenantId, businessType, companyName }, 'Brand adaptation applied after scan');
  } catch (err: unknown) {
    ctxLogger.warn({ err, tenantId }, 'Brand adaptation failed (non-fatal)');
  }
}
