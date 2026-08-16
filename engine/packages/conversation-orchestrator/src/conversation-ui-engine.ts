import {
  PersonaType,
  FunnelStage,
  BuyingIntentResult,
  SmartButton,
  ConversationUIState,
  ObjectionResult
} from './types';

export function generateConversationUI(
  persona: PersonaType,
  stage: FunnelStage,
  buyingIntent: BuyingIntentResult,
  objection: ObjectionResult,
  history: string[] = [],
  currentMessage: string = ''
): ConversationUIState {
  const buttons: SmartButton[] = [];
  const suggestedActions: SmartButton[] = [];
  let activeCard: ConversationUIState['activeCard'] = undefined;

  // 1. Initial Greeting / Welcome Stage
  if (stage === 'greeting') {
    if (persona === 'developer') {
      buttons.push(
        { id: 'btn_dev_docs', label: '📘 API Docs', action: 'navigate', payload: '/docs', variant: 'outline' },
        { id: 'btn_dev_embed', label: '⚡ Code Snippet', action: 'send_text', payload: 'How do I integrate the widget?', variant: 'outline' },
        { id: 'btn_dev_trial', label: '🚀 Start Trial', action: 'navigate', payload: '/signup', variant: 'primary' }
      );
    } else if (persona === 'enterprise') {
      buttons.push(
        { id: 'btn_ent_security', label: '🔒 Security & SOC 2', action: 'send_text', payload: 'Do you support SSO and SOC 2?', variant: 'outline' },
        { id: 'btn_ent_demo', label: '📅 Book Demo', action: 'navigate', payload: '/contact', variant: 'primary' },
        { id: 'btn_ent_pricing', label: '💰 Custom Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' }
      );
    } else {
      buttons.push(
        { id: 'btn_pricing', label: '💰 View Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' },
        { id: 'btn_demo', label: '🎥 See Live Demo', action: 'send_text', payload: 'How do I integrate the widget?', variant: 'outline' },
        { id: 'btn_trial', label: '🚀 Start Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' }
      );
    }
  }

  // 2. Evaluation / Pricing Stage — only show pricing card when the current message is about pricing
  else if (stage === 'evaluation' || buyingIntent.intentPhrase === 'pricing_inquiry') {
    const msg = currentMessage.toLowerCase();
    const isPricingTurn = /pric|plan|cost|tier|subscription|how much|fee|pay|billing|compare plan/i.test(msg);
    if (isPricingTurn) {
      activeCard = {
        type: 'pricing',
        data: {
          tiers: [
            { name: 'Free', price: '$0/mo', msgs: '100 msgs' },
            { name: 'Starter', price: '$49/mo', msgs: '1,000 msgs' },
            { name: 'Professional', price: '$99/mo', msgs: '10,000 msgs', popular: true },
            { name: 'Enterprise', price: 'Custom', msgs: 'Unlimited' }
          ]
        }
      };
    }

    buttons.push(
      { id: 'btn_trial_starter', label: '🚀 Try Starter ($49)', action: 'navigate', payload: '/signup', variant: 'outline' },
      { id: 'btn_trial_pro', label: '🔥 Try Pro ($99)', action: 'navigate', payload: '/signup', variant: 'primary' },
      { id: 'btn_ent_sales', label: '💼 Contact Sales', action: 'navigate', payload: '/contact', variant: 'secondary' }
    );
  }

  // 3. Purchase Intent Stage — only show lead card when the current message signals buying intent
  else if (stage === 'purchase_intent' || buyingIntent.hasBuyingIntent) {
    const msg = currentMessage.toLowerCase();
    const isBuyingTurn = /buy|purchase|sign up|start|trial|get started|demo|book|schedule|commit|ready/i.test(msg);
    if (isBuyingTurn) {
      activeCard = {
        type: 'lead_form',
        data: { title: 'Launch Your 14-Day Free Trial', microcopy: 'No credit card required • 10-minute setup' }
      };
    }

    buttons.push(
      { id: 'btn_confirm_trial', label: '✨ Launch 14-Day Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' },
      { id: 'btn_book_onboarding', label: '📅 Book 15-Min Setup Call', action: 'navigate', payload: '/contact', variant: 'secondary' }
    );
  }

  // 4. Developer Questions
  else if (persona === 'developer' || /api|sdk|embed|code/i.test(history.join(' '))) {
    activeCard = {
      type: 'code_snippet',
      data: {
        language: 'html',
        code: '<script src="https://cdn.conversationengine.com/widget.js" data-id="YOUR_KEY"></script>'
      }
    };

    buttons.push(
      { id: 'btn_full_docs', label: '📘 Full API Reference', action: 'navigate', payload: '/docs', variant: 'primary' },
      { id: 'btn_dev_signup', label: '🔑 Get API Key', action: 'navigate', payload: '/signup', variant: 'secondary' }
    );
  }

  // Default suggested actions (max 4 options, mobile-first)
  if (suggestedActions.length === 0) {
    if (!history.some(h => h.includes('pricing'))) {
      suggestedActions.push({ id: 'sug_pricing', label: '💰 Pricing Plans', action: 'send_text', payload: 'What are your pricing tiers?' });
    }
    if (!history.some(h => h.includes('integrate'))) {
      suggestedActions.push({ id: 'sug_integrate', label: '⚡ How to Embed', action: 'send_text', payload: 'How do I integrate the widget?' });
    }
    if (!history.some(h => h.includes('sso') || h.includes('security'))) {
      suggestedActions.push({ id: 'sug_sso', label: '🔒 Security & SSO', action: 'send_text', payload: 'Do you support SSO?' });
    }
    suggestedActions.push({ id: 'sug_trial', label: '🚀 Start Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' });
  }

  // Cap buttons to maximum 4-5 options for mobile-first cleanliness
  const trimmedButtons = buttons.slice(0, 4);
  const trimmedSuggestions = suggestedActions.slice(0, 4);

  return {
    buttons: trimmedButtons,
    suggestedActions: trimmedSuggestions,
    activeCard
  };
}
