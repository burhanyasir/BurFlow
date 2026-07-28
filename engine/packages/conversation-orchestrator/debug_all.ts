import { processConversationBrain } from './src/conversation-brain';
import { ConversationIntelligenceMemory } from './src/conversation-intelligence-types';

function makeLegacy(): ConversationIntelligenceMemory {
  return {
    turns: [],
    persona: 'unknown',
    funnelStage: 'greeting',
    buyingIntentDetected: false,
    objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0,
    topics: [],
  };
}

const replays: Array<{ name: string; turns: Array<{ m: string; r: string }> }> = [
  { name: 'Shopify', turns: [
    { m: 'Hi, I have a Shopify store', r: 'We can help.' },
    { m: 'How does it work?', r: 'Integration connects.' },
    { m: 'Can it handle orders?', r: 'Yes it handles orders.' },
    { m: 'What about shipping?', r: 'It answers shipping.' },
    { m: 'Integrate with Oberlo?', r: 'Yes we integrate.' },
    { m: 'How much?', r: 'Pricing starts at 29.' },
    { m: 'Different plans?', r: 'We have plans.' },
  ]},
  { name: 'SaaS', turns: [
    { m: 'Hey building a SaaS platform', r: 'Great we help SaaS.' },
    { m: 'API integration?', r: 'We have API and SDK.' },
    { m: 'What about webhooks?', r: 'Webhooks supported.' },
    { m: 'Startup pricing?', r: 'Starter at 19 per month.' },
    { m: 'Usage limits?', r: '1000 conversations.' },
    { m: 'Scale up later?', r: 'Upgrade anytime.' },
    { m: 'Features in starter?', r: 'Chat and analytics.' },
  ]},
  { name: 'Enterprise', turns: [
    { m: 'Evaluating for enterprise', r: 'Enterprise solution.' },
    { m: 'Need SOC 2 and SSO', r: 'SOC 2 compliant.' },
    { m: 'Data residency?', r: 'US EU APAC regions.' },
    { m: 'Dedicated TAM?', r: 'Dedicated TAM.' },
    { m: '50k conversations?', r: 'Enterprise handles.' },
    { m: 'Pricing for enterprise?', r: 'Custom pricing.' },
    { m: 'Security certs?', r: 'SOC 2 and GDPR.' },
  ]},
  { name: 'Healthcare', turns: [
    { m: 'Dental clinic need support', r: 'Help dental clinic.' },
    { m: 'Appointment scheduling?', r: 'Handles scheduling.' },
    { m: 'Insurance questions?', r: 'Answers insurance.' },
    { m: 'HIPAA compliant?', r: 'HIPAA compliant.' },
    { m: 'Patient intake?', r: 'Intake forms.' },
    { m: 'After hours support?', r: 'After hours.' },
    { m: 'EHR integration?', r: 'Integrates with EHR.' },
  ]},
  { name: 'Restaurant', turns: [
    { m: 'Own a restaurant', r: 'Help restaurant.' },
    { m: 'Menu questions?', r: 'Answer menu questions.' },
    { m: 'Reservations?', r: 'Handles reservations.' },
    { m: 'Takeout orders?', r: 'Takeout inquiries.' },
    { m: 'POS integration?', r: 'Integrates with POS.' },
    { m: 'Customer reviews?', r: 'Manage reviews.' },
    { m: 'Cost?', r: 'Starts at 19.' },
  ]},
  { name: 'Legal', turns: [
    { m: 'Law firm need intake', r: 'Help law firm.' },
    { m: 'Client intake forms?', r: 'Intake forms.' },
    { m: 'Case status?', r: 'Case status updates.' },
    { m: 'Confidentiality?', r: 'Encryption.' },
    { m: 'Schedule consultations?', r: 'Book consultations.' },
    { m: 'Billing questions?', r: 'Answers billing.' },
    { m: 'Practice management integration?', r: 'Integrates Clio.' },
  ]},
];

for (const r of replays) {
  let legacy = makeLegacy();
  if (r.name === 'Enterprise') legacy.persona = 'enterprise' as any;
  let hadError = false;
  for (let i = 0; i < r.turns.length; i++) {
    const t = r.turns[i];
    try {
      const result = processConversationBrain({ message: t.m, responseText: t.r, legacyMemory: legacy });
      if (!result.strategy) {
        console.log(`${r.name} turn ${i + 1}: NO STRATEGY (goal: ${result.plan.goal}, intent: ${result.plan.customerIntent})`);
        hadError = true;
      }
      legacy = result.legacyMemory;
    } catch (e: any) {
      console.log(`${r.name} turn ${i + 1}: ERROR ${e.message}`);
      hadError = true;
      break;
    }
  }
  if (!hadError) console.log(`${r.name}: OK (${r.turns.length} turns)`);
}
