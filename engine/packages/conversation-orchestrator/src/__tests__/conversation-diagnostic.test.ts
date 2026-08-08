import { describe, it, expect } from 'vitest';
import { runReplayDynamic, formatReport, ConversationAudit } from './conversation-audit';

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
    { message: 'Do you have templates for common questions?', responseText: 'Yes, we have pre-built templates for FAQs.' },
    { message: 'Can I customize the chat widget?', responseText: 'The widget is fully customizable to match your brand.' },
    { message: 'What if I need more than 1000 conversations?', responseText: 'You can upgrade to Professional for higher limits.' },
    { message: 'I think I want to start with a trial', responseText: 'Great, let me help you get started with a free trial.' },
  ],
};

const enterpriseReplay: ReplayDef = {
  name: 'Enterprise IT Manager',
  persona: 'enterprise',
  turns: [
    { message: 'Hi, I need an enterprise solution for IT support', responseText: 'We have enterprise-grade solutions for IT support.' },
    { message: 'What about security and compliance?', responseText: 'We are SOC 2 compliant with enterprise security features.' },
    { message: 'Do you support SSO?', responseText: 'We support SAML-based SSO for Enterprise plans.' },
    { message: 'Can it integrate with our existing IT tools?', responseText: 'We integrate with ServiceNow, Jira, and other IT tools.' },
    { message: 'What about on-premise deployment?', responseText: 'We offer on-premise deployment for Enterprise customers.' },
    { message: 'How does pricing work for large teams?', responseText: 'Enterprise pricing is custom based on your team size and needs.' },
    { message: 'What is the minimum commitment?', responseText: 'Enterprise plans are annual with dedicated support.' },
    { message: 'Do you have SLAs?', responseText: 'We offer 99.9% uptime SLA with Enterprise plans.' },
    { message: 'How is the onboarding process?', responseText: 'Dedicated onboarding includes training and migration support.' },
    { message: 'Can we customize the AI models?', responseText: 'Enterprise customers can fine-tune models on their data.' },
    { message: 'What about data residency?', responseText: 'We support data residency in US, EU, and APAC regions.' },
    { message: 'Do you have audit logging?', responseText: 'Full audit logging is included with Enterprise plans.' },
    { message: 'How does the API rate limiting work?', responseText: 'Enterprise plans have higher API rate limits.' },
    { message: 'What kind of support is included?', responseText: 'Enterprise includes 24/7 support with a dedicated account manager.' },
    { message: 'Can we get a custom demo?', responseText: 'We can schedule a custom demo for your team.' },
    { message: 'What is the typical deployment timeline?', responseText: 'Enterprise deployment typically takes 4-6 weeks.' },
    { message: 'Do you have case studies?', responseText: 'We have case studies from enterprise customers.' },
    { message: 'I think we are ready to move forward', responseText: 'Great, let me connect you with our enterprise sales team.' },
  ],
};

const healthcareReplay: ReplayDef = {
  name: 'Healthcare Clinic',
  persona: 'small_business',
  turns: [
    { message: 'Hi, we are a small healthcare clinic', responseText: 'We can help healthcare clinics with patient support.' },
    { message: 'Can it handle appointment scheduling?', responseText: 'Yes, it can handle appointment scheduling and reminders.' },
    { message: 'What about patient intake forms?', responseText: 'Digital intake forms can be completed before visits.' },
    { message: 'Does it integrate with EHR systems?', responseText: 'We integrate with major EHR systems like Epic and Cerner.' },
    { message: 'How much does it cost for a small clinic?', responseText: 'Our Starter plan at $19/month works well for small clinics.' },
    { message: 'Can patients ask questions after hours?', responseText: 'Yes, the AI handles after-hours questions automatically.' },
    { message: 'What about prescription refill requests?', responseText: 'Prescription refill requests can be handled through the system.' },
    { message: 'Is it HIPAA compliant?', responseText: 'Yes, we are HIPAA compliant with BAA agreements.' },
    { message: 'How does billing inquiry handling work?', responseText: 'The AI can handle common billing questions.' },
    { message: 'Can it send appointment reminders?', responseText: 'Automated reminders via SMS and email are supported.' },
    { message: 'Do you offer telehealth features?', responseText: 'We integrate with telehealth platforms for virtual visits.' },
    { message: 'How long does setup take?', responseText: 'Setup takes about 30 minutes for a basic configuration.' },
    { message: 'Can patients check lab results?', responseText: 'Patients can check lab results through the portal.' },
    { message: 'Is there a mobile app for patients?', responseText: 'We have a mobile app for iOS and Android.' },
    { message: 'I want to try it out', responseText: 'Great, let me help you start a free trial.' },
  ],
};

const restaurantReplay: ReplayDef = {
  name: 'Restaurant Owner',
  persona: 'small_business',
  turns: [
    { message: 'Hey, I own a restaurant and need help with reservations', responseText: 'We can help restaurants manage reservations.' },
    { message: 'Can it handle online reservations?', responseText: 'Yes, it handles online reservations through your website.' },
    { message: 'What about waitlist management?', responseText: 'Digital waitlist management is included.' },
    { message: 'Does it integrate with our POS system?', responseText: 'We integrate with Toast, Square, and other POS systems.' },
    { message: 'How much does it cost?', responseText: 'Our Starter plan at $19/month works well for restaurants.' },
    { message: 'Can customers order online?', responseText: 'Online ordering and delivery integration are available.' },
    { message: 'What about custom menus?', responseText: 'You can upload and manage custom menus.' },
    { message: 'Can it handle special dietary requests?', responseText: 'Yes, dietary preferences and allergies can be tracked.' },
    { message: 'How does the loyalty program work?', responseText: 'Built-in loyalty program with points and rewards.' },
    { message: 'Can it manage multiple locations?', responseText: 'Multi-location management is supported.' },
    { message: 'Does it offer analytics?', responseText: 'Analytics dashboard with reservation and sales data.' },
    { message: 'How is customer feedback handled?', responseText: 'Automated feedback collection after dining.' },
    { message: 'Can employees check schedules?', responseText: 'Employee scheduling and shift management included.' },
    { message: 'What kind of support is available?', responseText: '24/7 support is available for all plans.' },
    { message: 'I would like to start a trial', responseText: 'Great, let me help you start your free trial.' },
  ],
};

const legalReplay: ReplayDef = {
  name: 'Legal Firm',
  persona: 'small_business',
  turns: [
    { message: 'Hi, we are a legal firm looking for support automation', responseText: 'We help legal firms automate client support.' },
    { message: 'Can it handle case intake?', responseText: 'Yes, case intake and client onboarding can be automated.' },
    { message: 'What about document collection?', responseText: 'Secure document collection and sharing is supported.' },
    { message: 'Does it integrate with practice management software?', responseText: 'We integrate with Clio, MyCase, and PracticePanther.' },
    { message: 'How much does it cost?', responseText: 'Our Professional plan at $29/month is popular for legal firms.' },
    { message: 'Is it secure for client communications?', responseText: 'End-to-end encryption with client confidentiality.' },
    { message: 'Can clients check case status?', responseText: 'Clients can check case status through the portal.' },
    { message: 'What about billing and invoicing?', responseText: 'Automated billing and invoice management is included.' },
    { message: 'Can it send appointment reminders?', responseText: 'Automated reminders for consultations and meetings.' },
    { message: 'Does it support document e-signature?', responseText: 'E-signature integration for legal documents.' },
    { message: 'How does conflict checking work?', responseText: 'Automated conflict checking before new client intake.' },
    { message: 'Can clients pay online?', responseText: 'Online payment processing for legal fees.' },
    { message: 'What kind of reporting is available?', responseText: 'Detailed reporting on case status and firm metrics.' },
    { message: 'Is there mobile access?', responseText: 'Mobile app for iOS and Android for on-the-go access.' },
    { message: 'I would like to try the Professional plan', responseText: 'Great, let me help you get started with a trial.' },
  ],
};

import { ReplayDef } from './conversation-audit';

async function runDetailedDiagnostic(replay: ReplayDef): Promise<void> {
  const audit = await runReplayDynamic(replay);
  console.log(`\n===== ${replay.name} =====`);
  console.log(`Compliance: ${audit.compliancePct.toFixed(1)}%`);
  
  const categories: Record<string, number> = {};
  for (const turn of audit.turns) {
    for (const issue of turn.issues) {
      let cat = 'Other';
      if (issue.includes('Repeated completed topics')) cat = 'Topic repetition';
      else if (issue.includes('Response does not match goal')) cat = 'Wrong strategy';
      else if (issue.includes('qualification question')) cat = 'Wrong qualification timing';
      else if (issue.includes('Expected no CTA')) cat = 'Wrong CTA timing';
      else if (issue.includes('Expected soft CTA') || issue.includes('Expected strong CTA')) cat = 'Wrong CTA timing';
      else if (issue.includes('Agenda did not advance')) cat = 'Conversation stalled';
      else if (issue.includes('Did not answer topic')) cat = 'Topic repetition';
      categories[cat] = (categories[cat] || 0) + 1;
    }
  }
  
  console.log('\nDeductions by category:');
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
  
  console.log('\nTurn-by-turn report:');
  console.log('Turn | Message | Goal | QualQ | CTA | Issues');
  console.log('-----|---------|------|-------|-----|-------');
  for (const turn of audit.turns) {
    const msg = turn.message.substring(0, 40).padEnd(40);
    const goal = turn.details.primaryGoal?.toString().substring(0, 18).padEnd(18) || '';
    const qualQ = turn.strategy.qualificationQuestion?.substring(0, 20).padEnd(20) || '-'.padEnd(20);
    const cta = turn.details.expectedCTATiming?.toString().padEnd(8) || '';
    const issues = turn.issues.join('; ');
    if (turn.issues.length > 0) {
      console.log(`${String(turn.turnNumber).padEnd(4)} | ${msg} | ${goal} | ${qualQ} | ${cta} | ${issues}`);
    } else {
      console.log(`${String(turn.turnNumber).padEnd(4)} | ${msg} | ${goal} | ${qualQ} | ${cta} | OK`);
    }
  }
}

async function runAllDiagnostics(): Promise<void> {
  const replays = [shopifyReplay, enterpriseReplay, healthcareReplay, restaurantReplay, legalReplay];
  for (const replay of replays) {
    await runDetailedDiagnostic(replay);
  }
}

describe('P5.6 Diagnostic', () => {
  it('produces detailed diagnostic output', async () => {
    await runAllDiagnostics();
    expect(true).toBe(true);
  });
});
