import { ConversationMemoryData } from './conversation-memory';
import { SmartButton } from './types';

export interface ChoiceInput {
  memory: ConversationMemoryData;
  currentTopic?: string;
  persona?: string;
  planGoal?: string;
  funnelStage?: string;
  objections?: string[];
  buyingIntentScore?: number;
  userMessage?: string;
}

export function generateChoices(input: ChoiceInput): SmartButton[] {
  const { memory, currentTopic, persona, planGoal, funnelStage, objections = [], buyingIntentScore = 0, userMessage = '' } = input;

  const choices: SmartButton[] = [];
  const used = new Set<string>();

  function add(id: string, label: string, payload: string, variant: 'primary' | 'secondary' | 'outline' = 'secondary', action: SmartButton['action'] = 'send_text') {
    if (used.has(id)) return;
    if (memory.rejectedCTAs && memory.rejectedCTAs.includes(id)) return;
    used.add(id);
    choices.push({ id, label, action, payload, variant });
  }

  const msgLower = userMessage.toLowerCase();
  const lastResponseLower = (memory.lastResponseText || '').toLowerCase();
  const topicSignal = currentTopic || msgLower;

  if (topicSignal === 'pricing' || /(price|pricing|cost|plan|tier|how much)/i.test(msgLower) || /(price|pricing)/i.test(lastResponseLower)) {
    add('compare_plans', '💰 Compare plans', '/pricing', 'secondary', 'navigate');
    add('estimate_cost', '📊 Estimate my cost', '/pricing#calculator', 'secondary', 'navigate');
    if (buyingIntentScore > 0.5) add('start_trial', '🎁 Start free trial', '/signup', 'primary', 'navigate');
    add('book_demo', '📅 Book a demo', '/demo', 'secondary', 'navigate');
    add('ask_pricing_question', '❓ Ask another pricing question', 'Tell me more about pricing', 'outline', 'send_text');
  }

  if (topicSignal === 'security' || objections.includes('security') || /(security|compliance|soc2|gdpr|privacy|hipaa)/i.test(msgLower) || /(security|compliance)/i.test(lastResponseLower)) {
    add('security_compliance', '🔒 Compliance & Certifications', '/docs/security', 'secondary', 'navigate');
    add('data_storage', '🌍 Data storage & residency', '/docs/data-storage', 'secondary', 'navigate');
    add('security_docs', '📄 Security documentation', '/docs/security#dossier', 'secondary', 'navigate');
    add('book_tech_demo', '🧩 Book a technical demo', '/demo/technical', 'primary', 'navigate');
  }

  if (topicSignal === 'features' || /(feature|capabilit|what can you do|what do you do|product|platform)/i.test(msgLower) || /(feature|capabilit|what can you do)/i.test(lastResponseLower)) {
    add('ai_capabilities', '🤖 AI capabilities', '/docs/features#ai', 'secondary', 'navigate');
    add('integrations', '🔌 Integrations', '/docs/integrations', 'secondary', 'navigate');
    add('analytics', '📈 Analytics', '/docs/analytics', 'secondary', 'navigate');
    add('security_choice', '🔒 Security', '/docs/security', 'secondary', 'navigate');
    add('installation', '⚡ Installation', '/docs/quick-start', 'outline', 'navigate');
  }

  if (topicSignal === 'integrations' || /(integrat|connect|plugin|embed|api|webhook|wordpress|shopify|slack|zendesk)/i.test(msgLower)) {
    add('integration_guide', '📖 Integration Guide', '/docs/integrations', 'secondary', 'navigate');
    add('api_docs', '🔧 API Documentation', '/docs/api', 'secondary', 'navigate');
    add('widget_setup', '⚡ Widget Setup', '/docs/quick-start', 'primary', 'navigate');
    add('book_int_demo', '📅 Book integration walkthrough', '/demo/integration', 'secondary', 'navigate');
  }

  if (planGoal === 'close_trial' || /(trial|free trial|start trial)/i.test(msgLower) || /(trial|free trial)/i.test(lastResponseLower)) {
    add('start_trial_cta', 'Start trial', '/signup', 'primary', 'navigate');
    add('book_demo_trial', 'Book live demo', '/demo', 'secondary', 'navigate');
    add('watch_demo', 'Watch demo', '/watch-demo', 'outline', 'navigate');
    add('compare_plans_trial', 'Compare plans', '/pricing', 'secondary', 'navigate');
  }

  if (objections && objections.length > 0) {
    if (objections.includes('price')) {
      add('show_roi', '📈 Show ROI', '/roi', 'secondary', 'navigate');
      add('plan_comparison', 'Compare plans', '/pricing', 'secondary', 'navigate');
      add('soft_trial', 'Try the product (no CC)', '/signup', 'primary', 'navigate');
    }
    if (objections.includes('setup')) {
      add('show_onboarding', '🚀 Onboarding & migration', '/docs/onboarding', 'secondary', 'navigate');
      add('book_impl_demo', '📅 Book implementation demo', '/demo/implementation', 'secondary', 'navigate');
    }
    if (objections.includes('security')) {
      add('security_page', '🔒 Security Overview', '/security', 'primary', 'navigate');
      add('compliance_docs', '📋 Compliance Docs', '/docs/compliance', 'secondary', 'navigate');
    }
  }

  if (buyingIntentScore > 0.7) {
    add('cta_start_trial', '🚀 Start Free Trial', '/signup', 'primary', 'navigate');
    add('cta_book_demo', '📅 Book a Demo', '/demo', 'secondary', 'navigate');
  }

  if (funnelStage === 'purchase_intent' || funnelStage === 'decision') {
    add('cta_start_trial', '🚀 Start 14-Day Trial', '/signup', 'primary', 'navigate');
    add('cta_contact', '💬 Talk to Sales', '/contact', 'secondary', 'navigate');
  }

  if (funnelStage === 'greeting' || funnelStage === 'discovery') {
    if (!used.has('qr_features')) add('qr_features', '⚙️ Features', 'What features do you offer?', 'secondary', 'send_text');
    if (!used.has('qr_pricing')) add('qr_pricing', '💰 Pricing', 'What are your pricing tiers?', 'secondary', 'send_text');
    add('qr_demo', '🎥 Watch Demo', '/demo', 'primary', 'navigate');
  }

  add('ask_another_question', '❓ Ask another question', 'What else can I help with?', 'outline', 'send_text');
  add('contact_sales', 'Talk to sales', '/contact', 'secondary', 'navigate');

  return choices.slice(0, 6);
}
