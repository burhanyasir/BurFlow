import {
  OrchestratedTurnResult,
  PersonaType,
  FunnelStage,
  QualificationState
} from './types';
import { detectPersona } from './persona-detector';
import { detectFunnelStage } from './funnel-stage-detector';
import { detectBuyingIntent } from './buying-intent-detector';
import { handleGreeting } from './greeting-engine';
import { routeQuery } from './retrieval-router';
import { handleObjection } from './objection-engine';
import { processQualification } from './qualification-engine';
import { selectCTA } from './cta-engine';
import { generateConversationUI } from './conversation-ui-engine';

// Documented Knowledge Base (Strict Grounding Repository)
const DOCUMENTED_KNOWLEDGE: Record<string, { answer: string; sources: string[] }> = {
  'return policy': {
    answer: 'Items must be returned within 30 days of delivery in original condition. Refunds are processed within 5–7 business days after we receive the return.',
    sources: ['Refund Policy — p.2']
  },
  'integrate widget': {
    answer: 'Copy the embed snippet from your dashboard and paste it into your site\'s <head> tag. The widget goes live in under 10 minutes with zero complex engineering.',
    sources: ['Integration Guide — Quick Start']
  },
  'pricing tiers': {
    answer: 'Free tier is 100 messages per month, Starter is $29/mo, Professional is $99/mo, and Enterprise is custom. All paid plans include a 14-day free trial, no credit card needed.',
    sources: ['Pricing Overview']
  },
  'support sso': {
    answer: 'Enterprise plans include full SAML 2.0 SSO support (Okta, Azure AD, PingIdentity). Configure it in your Team Settings under the Admin panel.',
    sources: ['Enterprise Features — SSO']
  },
  'grounding engine': {
    answer: 'Conversation Engine uses a 4-stage grounding pipeline: Document Ingestion → Semantic Search Retrieval → Verified Answer Generation → Exact Source Citations. Every answer is grounded strictly against your docs with zero hallucination.',
    sources: ['Grounding Architecture', 'How It Works']
  },
  'analytics': {
    answer: 'Professional ($99/mo) and Enterprise tiers include real-time analytics tracking total volume answered, resolution confidence scores, and un-answered knowledge gap reports.',
    sources: ['Dashboard Analytics Spec', 'Pricing Overview']
  },
  'white label': {
    answer: 'Professional and Enterprise tiers allow complete custom branding, including custom brand colors, custom widget avatars, and removing the "Powered by Conversation Engine" label.',
    sources: ['Admin Settings — Customization']
  }
};

const FALLBACK_TEXT = "I couldn't find this in the documentation, so I won't guess. If you'd like, I can connect you with our team.";

function simpleStem(word: string): string {
  const w = word.toLowerCase();
  if (w.length < 4) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ves')) return w.slice(0, -3) + 'f';
  if (/[^aeiou](ss|sh|ch|x|z)es$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.endsWith('ing')) {
    const base = w.slice(0, -3);
    if (base.length >= 3) return base;
    return base + 'e';
  }
  if (w.endsWith('ied') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ed') && !w.endsWith('eed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('tion')) return w.slice(0, -4) + 'te';
  if (w.endsWith('ment')) return w.slice(0, -4);
  if (w.endsWith('ness')) return w.slice(0, -4);
  if (w.endsWith('ly')) return w.slice(0, -2);
  if (w.endsWith('er') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('or') && w.length > 4) return w.slice(0, -2);
  return w;
}

export interface OrchestratorInput {
  message: string;
  history?: string[];
  sessionMemory?: {
    persona?: PersonaType;
    funnelStage?: FunnelStage;
    qualification?: QualificationState;
  };
}

export function orchestrateTurn(input: OrchestratorInput): OrchestratedTurnResult {
  const { message, history = [], sessionMemory } = input;
  const lowerMsg = message.toLowerCase().trim();

  // 1. Domain Routing
  const routing = routeQuery(message);

  // 2. Persona Detection
  const persona = detectPersona(message, history, sessionMemory?.persona);

  // 3. Buying Intent Detection
  const buyingIntent = detectBuyingIntent(message);

  // 4. Objection Handling
  const objection = handleObjection(message);

  // 5. Funnel Stage Detection
  const funnelStage = detectFunnelStage(
    message,
    sessionMemory?.funnelStage || 'greeting',
    buyingIntent.hasBuyingIntent,
    objection.isObjection
  );

  // 6. Qualification Processing
  const currentQual: QualificationState = sessionMemory?.qualification || {
    questionsAskedCount: 0,
    completed: false
  };
  const qualResult = processQualification(message, currentQual);

  // 7. Greeting Check
  const greetingResponse = handleGreeting(message, persona.persona);

  // Determine Response Text & Sources
  let responseText = '';
  let sources: string[] = [];
  let isFallback = false;

  if (greetingResponse) {
    responseText = greetingResponse;
  } else if (qualResult.promptQuestion) {
    responseText = qualResult.promptQuestion;
  } else if (objection.isObjection) {
    responseText = objection.groundedAnswer;
    sources = objection.sources;
  } else {
    // 8. Grounded Knowledge Retrieval
    const messageTokens = lowerMsg.split(/\s+/).filter(t => t.length > 0);
    const stemmedMsgTokens = new Set(messageTokens.map(simpleStem));

    let matchedKey = '';
    for (const [key, value] of Object.entries(DOCUMENTED_KNOWLEDGE)) {
      if (
        lowerMsg.includes(key) ||
        key.split(' ').every(word => lowerMsg.includes(word)) ||
        routing.searchKeywords.some(kw => key.includes(kw) || kw.includes(key))
      ) {
        matchedKey = key;
        responseText = value.answer;
        sources = value.sources;
        break;
      }

      // 4. Stem-aware token overlap: at least half the key tokens stem-match message tokens
      //    Guards against false positives via routing keyword overlap check
      if (!matchedKey) {
        const keyTokens = key.split(' ').filter(t => t.length > 0);
        const stemMatchCount = keyTokens.filter(kt =>
          stemmedMsgTokens.has(simpleStem(kt))
        ).length;
        const threshold = Math.max(1, Math.ceil(keyTokens.length / 2));
        const routingOverlap = routing.searchKeywords.some(kw => {
          if (key.includes(kw) || kw.includes(key)) return true;
          if (keyTokens.some(kt => kw.includes(kt) || kt.includes(kw))) return true;
          const kwTokens = kw.toLowerCase().split(/\s+/).filter(t => t.length > 0);
          return kwTokens.some(kwt => keyTokens.some(kt => simpleStem(kwt) === simpleStem(kt)));
        });
        if (stemMatchCount >= threshold &&
            (stemMatchCount >= keyTokens.length || routingOverlap)) {
          matchedKey = key;
          responseText = value.answer;
          sources = value.sources;
          break;
        }
      }
    }

    if (!matchedKey) {
      responseText = FALLBACK_TEXT;
      isFallback = true;
    }
  }

  // 9. CTA Selection
  const cta = selectCTA(persona.persona, funnelStage, buyingIntent);

  // 10. Conversation UI Engine (Buttons, Suggestions, Cards)
  const uiState = generateConversationUI(persona.persona, funnelStage, buyingIntent, objection, history);

  // Append qualification options if present
  if (qualResult.options && qualResult.options.length > 0) {
    uiState.buttons = qualResult.options;
  }

  return {
    responseText,
    persona,
    funnelStage,
    buyingIntent,
    qualification: qualResult.updatedState,
    objection,
    cta,
    uiState,
    routing,
    sources,
    isFallback
  };
}
