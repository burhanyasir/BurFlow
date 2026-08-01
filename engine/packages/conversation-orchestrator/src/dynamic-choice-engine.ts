import { ConversationMemoryData } from './conversation-memory';
import { SmartButton } from './types';

export interface ChoiceInput {
  memory: ConversationMemoryData;
  currentTopic?: string;
  persona?: string;
  planGoal?: string;
  funnelStage?: string;
  objections?: string[];
  buyingIntentScore?: number; // 0-1
}

export function generateChoices(input: ChoiceInput): SmartButton[] {
  const { memory, currentTopic, persona, planGoal, funnelStage, objections = [], buyingIntentScore = 0 } = input;

  const choices: SmartButton[] = [];
  const used = new Set<string>();

  function add(id: string, label: string, payload: string, variant: 'primary' | 'secondary' | 'outline' = 'secondary', action: 'send_text' | 'navigate' = 'send_text') {
    if (used.has(id)) return;
    // avoid repeating CTAs already rejected
    if (memory.rejectedCTAs && memory.rejectedCTAs.includes(id)) return;
    used.add(id);
    choices.push({ id, label, action: action as any, payload, variant });
  }

  // Topic-aware choices
  if (currentTopic === 'pricing' || /(price|pricing)/i.test(memory.lastResponseText || '')) {
    add('compare_plans', '💰 Compare plans', '/pricing', 'secondary', 'navigate');
    add('estimate_cost', '📊 Estimate my cost', '/pricing#calculator', 'secondary', 'navigate');
    if (buyingIntentScore > 0.5) add('start_trial', '🎁 Start free trial', '/signup', 'primary', 'navigate');
    add('book_demo', '📅 Book a demo', '/demo', 'secondary', 'navigate');
    add('ask_pricing_question', '❓ Ask another pricing question', 'Tell me more about pricing', 'outline', 'send_text');
  }

  // Security-related choices
  if (currentTopic === 'security' || objections.includes('security') || /(security|compliance|soc2|gdpr)/i.test(memory.lastResponseText || '')) {
    add('security_compliance', '🔒 Compliance & Certifications', '/docs/security', 'secondary', 'navigate');
    add('data_storage', '🌍 Data storage & residency', '/docs/data-storage', 'secondary', 'navigate');
    add('security_docs', '📄 Security documentation', '/docs/security#dossier', 'secondary', 'navigate');
    add('book_tech_demo', '🧩 Book a technical demo', '/demo/technical', 'primary', 'navigate');
  }

  // Features / product choices
  if (currentTopic === 'features' || /(feature|capabilit|what can you do)/i.test(memory.lastResponseText || '')) {
    add('ai_capabilities', '🤖 AI capabilities', '/docs/features#ai', 'secondary', 'navigate');
    add('integrations', '🔌 Integrations', '/docs/integrations', 'secondary', 'navigate');
    add('analytics', '📈 Analytics', '/docs/analytics', 'secondary', 'navigate');
    add('security_choice', '🔒 Security', '/docs/security', 'secondary', 'navigate');
    add('installation', '⚡ Installation', '/docs/quick-start', 'outline', 'navigate');
  }

  // Trial context
  if (planGoal === 'close_trial' || /(trial|free trial|start trial)/i.test(memory.lastResponseText || '')) {
    add('start_trial_cta', 'Start trial', '/signup', 'primary', 'navigate');
    add('book_demo_trial', 'Book live demo', '/demo', 'secondary', 'navigate');
    add('watch_demo', 'Watch demo', '/watch-demo', 'outline', 'navigate');
    add('compare_plans_trial', 'Compare plans', '/pricing', 'secondary', 'navigate');
  }

  // Objection-specific choices
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
  }

  // Generic top-level choices (fallback)
  add('ask_another_question', '❓ Ask another question', 'What else can I help with?', 'outline', 'send_text');
  add('contact_sales', 'Talk to sales', '/contact', 'secondary', 'navigate');

  // Limit to 6 choices and prefer diversity
  return choices.slice(0, 6);
}
