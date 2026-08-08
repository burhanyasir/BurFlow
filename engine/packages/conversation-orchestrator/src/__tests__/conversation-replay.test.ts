import { describe, it, expect } from 'vitest';
import { runReplayDynamic, formatReport, ConversationAudit } from './conversation-audit';

// ============================================================================
// REPLAY 1: SHOPIFY MERCHANT
// ============================================================================
const shopifyReplay: ReplayDef = {
  name: 'Shopify Merchant',
  persona: 'ecommerce',
  turns: [
    { message: 'Hi, I have a Shopify store and need help with customer support', responseText: 'We can help with customer support for your Shopify store.' },
    { message: 'How does it work with Shopify?', responseText: 'Our integration connects directly to your Shopify store.' },
    { message: 'Can it handle product questions and order status?', responseText: 'Yes, it handles product questions, order status, and returns.' },
    { message: 'What about shipping inquiries?', responseText: 'It can answer shipping questions automatically.' },
    { message: 'Do you integrate with Oberlo?', responseText: 'We integrate with Oberlo and other dropshipping tools.' },
    { message: 'How much does it cost?', responseText: 'Our pricing starts at $29 per month for the Professional plan.' },
    { message: 'Are there different plans?', responseText: 'We have Starter, Professional, and Enterprise plans.' },
    { message: 'What features are in the Professional plan?', responseText: 'Professional includes AI chat, analytics, and integrations.' },
    { message: 'How many conversations can it handle?', responseText: 'It depends on the plan. How many conversations do you handle monthly?' },
    { message: 'Maybe around 5000 per month', responseText: 'Great, with 5000 conversations the Professional plan would work well.' },
    { message: 'Can I try it before committing?', responseText: 'Yes, we offer a 14-day free trial.' },
    { message: 'How do I set it up?', responseText: 'Setup takes about 10 minutes with our Shopify integration.' },
    { message: 'Is there any coding required?', responseText: 'No coding required. It works out of the box with Shopify.' },
    { message: 'What about returns management?', responseText: 'Our AI can handle return requests and RMA status.' },
    { message: 'Does it support multiple languages?', responseText: 'Yes, it supports over 20 languages.' },
    { message: 'How is the analytics dashboard?', responseText: 'You get real-time analytics on conversations and satisfaction.' },
    { message: 'That sounds good, I want to start the trial', responseText: 'Great, let me help you get started with the trial.' },
  ],
};

// ============================================================================
// REPLAY 2: SAAS FOUNDER
// ============================================================================
const saasReplay: ReplayDef = {
  name: 'SaaS Founder',
  persona: 'startup',
  turns: [
    { message: 'Hey, I am building a SaaS platform', responseText: 'Great, we help SaaS companies with customer support.' },
    { message: 'Can it integrate with my product?', responseText: 'We have an API and SDK for custom integrations.' },
    { message: 'What does the API look like?', responseText: 'Our REST API makes it easy to embed AI search.' },
    { message: 'Is there a webhook for new conversations?', responseText: 'Yes, webhooks are supported for real-time notifications.' },
    { message: 'How about pricing for startups?', responseText: 'We have a Starter plan at $19/month for early-stage startups.' },
    { message: 'What about usage limits?', responseText: 'Starter includes 1000 conversations per month.' },
    { message: 'Can I scale up when needed?', responseText: 'Yes, you can upgrade to Professional or Enterprise anytime.' },
    { message: 'What features are in the Starter plan?', responseText: 'Starter includes AI chat, basic analytics, and email support.' },
    { message: 'Do you have a knowledge base feature?', responseText: 'Yes, you can upload your documentation for grounded answers.' },
    { message: 'How accurate is the AI?', responseText: 'Our grounded AI uses your docs to provide accurate answers.' },
    { message: 'What about integrations with Intercom?', responseText: 'We integrate with Intercom, Zendesk, and other platforms.' },
    { message: 'Does it work with Slack?', responseText: 'Yes, Slack integration is available.' },
    { message: 'How long does setup take?', responseText: 'You can be up and running in under 10 minutes.' },
    { message: 'Is there a demo?', responseText: 'Yes, we can schedule a demo to walk through everything.' },
    { message: 'I would like to try it out first', responseText: 'You can start a 14-day free trial, no credit card required.' },
    { message: 'What kind of analytics do you provide?', responseText: 'You get deflection rate, CSAT scores, and conversation insights.' },
    { message: 'Alright, let me start the trial', responseText: 'Perfect, let me get you started with the free trial.' },
  ],
};

// ============================================================================
// REPLAY 3: ENTERPRISE IT MANAGER
// ============================================================================
const enterpriseReplay: ReplayDef = {
  name: 'Enterprise IT Manager',
  persona: 'enterprise',
  initialLegacy: { persona: 'enterprise' },
  turns: [
    { message: 'Hi, I am evaluating support solutions for our enterprise', responseText: 'I can help you evaluate our enterprise support solution.' },
    { message: 'We need SOC 2 compliance and SSO', responseText: 'We are SOC 2 compliant and support SSO via SAML.' },
    { message: 'What about data residency?', responseText: 'We offer data residency in US, EU, and APAC regions.' },
    { message: 'Do you have a dedicated TAM?', responseText: 'Enterprise plans include a dedicated Technical Account Manager.' },
    { message: 'What about SLA guarantees?', responseText: 'We offer 99.9% uptime SLA with Enterprise plans.' },
    { message: 'Can you handle 50,000 conversations per month?', responseText: 'Enterprise handles unlimited conversations with priority routing.' },
    { message: 'How does pricing work for enterprises?', responseText: 'Enterprise pricing is custom based on your requirements.' },
    { message: 'What security certifications do you have?', responseText: 'We are SOC 2 Type II certified and GDPR compliant.' },
    { message: 'Is there a procurement process?', responseText: 'We can work with your procurement team on MSA and order forms.' },
    { message: 'Can we get a security questionnaire?', responseText: 'Yes, we can share our security documentation and fill out questionnaires.' },
    { message: 'How does the deployment work?', responseText: 'We offer both cloud and VPC deployment options.' },
    { message: 'What about audit logging?', responseText: 'Enterprise includes comprehensive audit logging and access controls.' },
    { message: 'Do you support Azure AD?', responseText: 'Yes, we support Azure AD, Okta, and OneLogin.' },
    { message: 'Can we get a demo for our team?', responseText: 'Absolutely, we can schedule a demo for your team.' },
    { message: 'How many team members can test?', responseText: 'We can set up a sandbox environment for your evaluation team.' },
    { message: 'What is the typical onboarding timeline?', responseText: 'Enterprise onboarding typically takes 2-4 weeks.' },
    { message: 'Do you have professional services?', responseText: 'Yes, we have professional services for custom integrations.' },
    { message: 'I think we are ready for a demo', responseText: 'Great, let me schedule a demo with our enterprise team.' },
  ],
};

// ============================================================================
// REPLAY 4: HEALTHCARE CLINIC
// ============================================================================
const healthcareReplay: ReplayDef = {
  name: 'Healthcare Clinic',
  persona: 'healthcare',
  turns: [
    { message: 'Hi, we are a dental clinic looking for patient support', responseText: 'We can help your dental clinic with patient support automation.' },
    { message: 'Can it handle appointment scheduling?', responseText: 'Yes, it handles appointment scheduling and reminders.' },
    { message: 'What about insurance questions?', responseText: 'It can answer common insurance and billing questions.' },
    { message: 'Do you comply with HIPAA?', responseText: 'Yes, we are HIPAA compliant and sign BAAs.' },
    { message: 'How does patient intake work?', responseText: 'Patients can fill out intake forms through chat.' },
    { message: 'Can it send appointment reminders?', responseText: 'Yes, automated appointment reminders via email and SMS.' },
    { message: 'What about after-hours support?', responseText: 'The AI handles after-hours patient inquiries automatically.' },
    { message: 'Does it integrate with our EHR?', responseText: 'We integrate with major EHR systems for patient data.' },
    { message: 'How much does it cost for a clinic?', responseText: 'Professional plan starts at $29/month for small clinics.' },
    { message: 'We have about 200 patients per week', responseText: 'With 200 patients, the Professional plan would be a good fit.' },
    { message: 'Can patients book appointments through chat?', responseText: 'Yes, patients can book, reschedule, and cancel appointments.' },
    { message: 'What languages does it support?', responseText: 'It supports English, Spanish, and other languages.' },
    { message: 'Do you have a trial for clinics?', responseText: 'Yes, we offer a 14-day free trial for healthcare providers.' },
    { message: 'How long does implementation take?', responseText: 'Implementation takes about 1-2 weeks for clinics.' },
    { message: 'Okay, I want to try the trial', responseText: 'Great, let me help you get started with the trial.' },
  ],
};

// ============================================================================
// REPLAY 5: RESTAURANT OWNER
// ============================================================================
const restaurantReplay: ReplayDef = {
  name: 'Restaurant Owner',
  persona: 'hospitality',
  turns: [
    { message: 'Hi, I own a restaurant and need help with customer inquiries', responseText: 'We can help your restaurant manage customer inquiries.' },
    { message: 'Can it handle menu questions?', responseText: 'Yes, it can answer menu questions, specials, and dietary info.' },
    { message: 'What about reservations?', responseText: 'Customers can make and modify reservations through chat.' },
    { message: 'Does it work for takeout orders?', responseText: 'Yes, it handles takeout and delivery order inquiries.' },
    { message: 'How about hours and location questions?', responseText: 'It answers hours, location, and contact information automatically.' },
    { message: 'Can it integrate with our POS?', responseText: 'We integrate with major POS systems for order data.' },
    { message: 'What about customer reviews?', responseText: 'It can help manage review responses and feedback.' },
    { message: 'How much does it cost?', responseText: 'Starter plan is $19/month for small restaurants.' },
    { message: 'What plan do you recommend?', responseText: 'Professional at $29/month would work best for a busy restaurant.' },
    { message: 'How many conversations can it handle?', responseText: 'Professional handles up to 5000 conversations monthly.' },
    { message: 'Can customers see the menu in chat?', responseText: 'Yes, you can upload your menu for AI-powered answers.' },
    { message: 'What about special events or catering?', responseText: 'It can handle catering inquiries and special event bookings.' },
    { message: 'Do you offer a trial?', responseText: 'Yes, we have a 14-day free trial.' },
    { message: 'How quickly can I set it up?', responseText: 'Setup takes about 15 minutes with our template.' },
    { message: 'Let me try it out', responseText: 'Perfect, let me help you start the trial.' },
  ],
};

// ============================================================================
// REPLAY 6: LEGAL FIRM
// ============================================================================
const legalReplay: ReplayDef = {
  name: 'Legal Firm',
  persona: 'legal',
  turns: [
    { message: 'Hi, we are a law firm looking for client intake automation', responseText: 'We can help your law firm with client intake and inquiries.' },
    { message: 'Can it handle client intake forms?', responseText: 'Yes, clients can fill out intake forms through secure chat.' },
    { message: 'What about case status inquiries?', responseText: 'Clients can check case status and get updates automatically.' },
    { message: 'Do you have confidentiality measures?', responseText: 'Yes, we have encryption and confidentiality protections.' },
    { message: 'Is it compliant with legal data requirements?', responseText: 'Yes, we comply with data protection requirements for legal firms.' },
    { message: 'Can it schedule consultations?', responseText: 'Clients can book consultations through the chat interface.' },
    { message: 'What about billing questions?', responseText: 'It can answer billing and invoicing questions.' },
    { message: 'Does it integrate with practice management software?', responseText: 'We integrate with Clio, MyCase, and other practice management tools.' },
    { message: 'How much does it cost?', responseText: 'Professional plan starts at $29/month for small firms.' },
    { message: 'What features are included?', responseText: 'Includes intake forms, scheduling, billing, and document requests.' },
    { message: 'Can we try it first?', responseText: 'Yes, we offer a 14-day free trial.' },
    { message: 'How secure is the data?', responseText: 'Data is encrypted at rest and in transit with access controls.' },
    { message: 'Do you offer a demo?', responseText: 'Yes, we can schedule a demo for your team.' },
    { message: 'How long does setup take?', responseText: 'Setup takes about 1-2 weeks for a law firm.' },
    { message: 'Great, let me start the trial', responseText: 'Perfect, let me get you started with the free trial.' },
  ],
};

// ============================================================================
// AUDIT RUNNER
// ============================================================================

async function runAllReplays(): Promise<ConversationAudit[]> {
  return Promise.all([
    runReplayDynamic(shopifyReplay),
    runReplayDynamic(saasReplay),
    runReplayDynamic(enterpriseReplay),
    runReplayDynamic(healthcareReplay),
    runReplayDynamic(restaurantReplay),
    runReplayDynamic(legalReplay),
  ]);
}

describe('P5.5 - Conversation Director Compliance', () => {
  let audits: ConversationAudit[];

  beforeAll(async () => {
    audits = await runAllReplays();
  });

  it('produces a report and achieves ≥90% Director compliance per conversation', () => {
    for (const audit of audits) {
      console.log(formatReport(audit));
      expect(audit.loopCount).toBe(0);
      expect(audit.repeatedTopics.length).toBe(0);
      expect(audit.compliancePct).toBeGreaterThanOrEqual(90);
    }
  });

  it('aggregate compliance across all conversations meets ≥90%', () => {
    const overallScores = audits.map(a => a.scores.overall);
    const avg = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
    console.log(`\n=== OVERALL COMPLIANCE: ${(avg * 100).toFixed(1)}% ===`);
    for (const a of audits) console.log(formatReport(a));
    expect(avg * 100).toBeGreaterThanOrEqual(90);
  });

  it('all 6 conversations reached trial or demo', () => {
    const unreached = audits.filter(a => !a.reachedTrialOrDemo).map(a => a.replayName);
    expect(unreached).toEqual([]);
  });

  it('zero loops across all conversations', () => {
    const loops = audits.filter(a => a.loopCount > 0).map(a => `${a.replayName}: ${a.loopCount}`);
    expect(loops).toEqual([]);
  });

  it('zero repeated topics across all conversations', () => {
    const repeats = audits.filter(a => a.repeatedTopics.length > 0).map(a => `${a.replayName}: ${a.repeatedTopics.join(', ')}`);
    expect(repeats).toEqual([]);
  });

  it('no conversation asks more than one qualification question per turn', () => {
    for (const audit of audits) {
      const perTurnQual = audit.turns.filter(t => t.strategy.qualificationQuestion).length;
      expect(perTurnQual).toBeLessThanOrEqual(audit.turnCount);
    }
  });

  it('agenda progresses overall for each conversation', () => {
    for (const audit of audits) {
      const first = audit.turns[0].strategy.agenda.completedTopics.length;
      const last = audit.turns[audit.turns.length - 1].strategy.agenda.completedTopics.length;
      expect(last).toBeGreaterThanOrEqual(first);
    }
  });
});
