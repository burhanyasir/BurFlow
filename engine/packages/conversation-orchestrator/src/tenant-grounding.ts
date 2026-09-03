export const OUT_OF_KNOWLEDGE_REPLY =
  "I don't have those exact details on hand, but I can connect you directly with our team — what is the best email or phone number to reach you?";

const PLATFORM_OPTION_RE = /burflow|demo ai agent/i;
const PLATFORM_PRICE_TOKENS = ['$29', '$49', '$99'];

export interface TenantIdentity {
  name: string;
  domain: string;
}

export interface TenantGroundingProfile {
  companyName?: string;
  company_name?: string;
  domain?: string;
  website?: string;
  websiteUrl?: string;
  website_url?: string;
  primary_goal?: string;
  top_offers?: string[];
  brandTone?: string;
  cta?: { type?: string; label: string; link: string };
  button_catalog?: Array<{ id?: string; label: string; payload?: string }>;
}

function pickString(profile: Record<string, unknown> | undefined, keys: string[]): string {
  if (!profile) return '';
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function hostFromUrl(value: string): string {
  if (!value) return '';
  try {
    const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withProto).hostname.replace(/^www\./i, '');
  } catch {
    return value.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || '';
  }
}

export function resolveTenantIdentity(
  profile?: TenantGroundingProfile | Record<string, unknown> | null,
): TenantIdentity {
  const rec = (profile || {}) as Record<string, unknown>;
  const companyName = pickString(rec, ['companyName', 'company_name']);
  const website = pickString(rec, ['domain', 'website', 'websiteUrl', 'website_url']);
  const domain = hostFromUrl(website);
  const name = companyName || domain || 'this business';
  return { name, domain: domain || (companyName ? '' : name) };
}

export function buildGroundedSystemPrompt(input: {
  businessProfile?: TenantGroundingProfile | Record<string, unknown> | null;
  businessContext: string;
  businessGoalHint?: string;
  topOffersHint?: string;
  locale?: string;
}): string {
  const identity = resolveTenantIdentity(input.businessProfile || undefined);
  const brand = identity.domain ? `${identity.name} (${identity.domain})` : identity.name;
  const goalHint = input.businessGoalHint || '';
  const offersHint = input.topOffersHint || '';
  const localeHint = input.locale
    ? `The visitor's language is "${input.locale}". Respond in that same language unless the visitor writes in a different language.`
    : '';
  
  let systemPromptHint = '';
  if (input.businessProfile && typeof (input.businessProfile as any)._systemPromptHint === 'string') {
    systemPromptHint = (input.businessProfile as any)._systemPromptHint;
  }

  const baseIdentity = systemPromptHint
    ? systemPromptHint
    : `You are an AI assistant for ${identity.name}. You speak only on behalf of this imported website brand (${brand}) — never as BurFlow or any other platform.`;

  return `${baseIdentity}
You MUST ONLY answer using the provided website knowledge base.
NEVER mention BurFlow, BurFlow platform features, or SaaS pricing ($29/$49/$99) unless the imported website knowledge below explicitly contains that information.
Be concise (under 100 words), conversational, and genuinely helpful.
Never invent pricing, features, policies, services, or any information not explicitly listed below.

CRITICAL RULES:
1. Answer the question directly first. No filler openers.
2. Do not repeat filler phrases. Vary your wording across turns.
3. Be concise, direct, and natural. Never repeat questions already asked.
4. Use ONLY the specific business information below — never give generic answers.
5. If the visitor asks about pricing, services, or products, reference only the actual business details provided.
6. Only suggest booking or contacting the team if the visitor asks or the business goal calls for it.
7. Be warm and helpful, not pushy.
${goalHint}
${offersHint}
${localeHint}

KNOWLEDGE CONSTRAINT:
If the visitor's question cannot be answered from the website knowledge base below, respond with exactly:
"${OUT_OF_KNOWLEDGE_REPLY}"
Never guess or fabricate information.

LEAD CAPTURE:
If the visitor shares contact details or company info in this message (email, phone, their name, or company), also include an "extractedLead" object with the fields email, phone, name, company (leave null when not provided). Never invent contact details.

BUSINESS KNOWLEDGE:
${input.businessContext}

Respond with ONLY a JSON object — no markdown, no explanation, using exactly this shape:
{
  "responseText": "your response to the visitor",
  "strategy": "one or two words describing your conversational strategy, e.g. educate, qualify, handle_objection, advance_funnel, recommend_plan, close_trial, schedule_demo, build_trust",
  "suggestedTopics": ["1-3 follow-up topics the visitor might care about next"],
  "suggestedOptions": ["2-3 short clickable follow-up options based on THIS website's offerings, primary CTAs, and services. Each is 2-6 words. Examples: 'Book Appointment', 'View Pricing', 'Contact Team'. Do NOT use generic platform chips like 'Start BurFlow Trial' or 'Demo AI Agent'."],
  "ctaType": "one of: none, book_demo, start_free_trial, contact_sales, pricing, support",
  "funnelStage": "one of: greeting, awareness, interest, consideration, evaluation, purchase_intent, decision, customer, support"
}`;
}

export function sanitizeSuggestedOptions(options: Array<string | null | undefined>): string[] {
  const cleaned: string[] = [];
  for (const opt of options) {
    if (typeof opt !== 'string') continue;
    const label = opt.trim();
    if (!label || label.length > 40) continue;
    if (PLATFORM_OPTION_RE.test(label)) continue;
    if (cleaned.some((existing) => existing.toLowerCase() === label.toLowerCase())) continue;
    cleaned.push(label);
    if (cleaned.length >= 3) break;
  }
  return cleaned;
}

export function fallbackSuggestedOptions(
  profile?: TenantGroundingProfile | Record<string, unknown> | null,
): string[] {
  const rec = (profile || {}) as TenantGroundingProfile;
  const candidates: string[] = [];
  if (rec.cta?.label) candidates.push(rec.cta.label);
  for (const button of rec.button_catalog || []) {
    if (button?.label) candidates.push(button.label);
  }
  for (const offer of rec.top_offers || []) {
    if (typeof offer === 'string' && offer.trim()) candidates.push(offer.trim());
  }
  candidates.push('View Pricing', 'Contact Team', 'Book Appointment');
  const sanitized = sanitizeSuggestedOptions(candidates);
  if (sanitized.length >= 2) return sanitized.slice(0, 3);
  const padded = sanitizeSuggestedOptions([...sanitized, 'View Pricing', 'Contact Team']);
  return padded.slice(0, Math.max(2, Math.min(3, padded.length)));
}

export function replaceUngroundedPlatformSpeech(reply: string, knowledge: string): string {
  if (!reply) return reply;
  const kb = knowledge || '';
  const mentionsBurFlow = /burflow/i.test(reply) && !/burflow/i.test(kb);
  const ungroundedPrice = PLATFORM_PRICE_TOKENS.some((token) => reply.includes(token) && !kb.includes(token));
  if (mentionsBurFlow || ungroundedPrice) return OUT_OF_KNOWLEDGE_REPLY;
  return reply;
}
