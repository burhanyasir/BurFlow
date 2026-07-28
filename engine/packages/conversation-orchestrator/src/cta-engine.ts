import { PersonaType, FunnelStage, BuyingIntentResult, CTASelectionResult } from './types';

export function selectCTA(
  persona: PersonaType,
  stage: FunnelStage,
  buyingIntent: BuyingIntentResult
): CTASelectionResult {
  // 1. Purchase Intent / High Buying Intent
  if (buyingIntent.hasBuyingIntent || stage === 'purchase_intent') {
    if (persona === 'enterprise') {
      return {
        primaryCTA: 'talk_enterprise_sales',
        label: '📅 Schedule Enterprise Demo',
        link: '/contact',
        secondaryCTA: 'contact_sales',
        secondaryLabel: '💼 Contact Sales',
        secondaryLink: '/contact'
      };
    }
    return {
      primaryCTA: 'start_free_trial',
      label: '🚀 Start 14-Day Free Trial',
      link: '/signup',
      secondaryCTA: 'pricing',
      secondaryLabel: '💰 Compare Plans',
      secondaryLink: '/pricing'
    };
  }

  // 2. Developer Persona
  if (persona === 'developer') {
    return {
      primaryCTA: 'developer_docs',
      label: '📘 View Developer Docs',
      link: '/docs',
      secondaryCTA: 'start_free_trial',
      secondaryLabel: '🚀 Start Developer Trial',
      secondaryLink: '/signup'
    };
  }

  // 3. Enterprise Persona
  if (persona === 'enterprise') {
    return {
      primaryCTA: 'book_demo',
      label: '📅 Book Enterprise Demo',
      link: '/contact',
      secondaryCTA: 'contact_sales',
      secondaryLabel: '🔒 Security Dossier',
      secondaryLink: '/contact'
    };
  }

  // 4. Agency Persona
  if (persona === 'agency') {
    return {
      primaryCTA: 'partner_program',
      label: '🤝 Agency Partner Program',
      link: '/contact',
      secondaryCTA: 'start_free_trial',
      secondaryLabel: '🚀 Start Free Trial',
      secondaryLink: '/signup'
    };
  }

  // 5. Evaluation / Pricing Stage
  if (stage === 'evaluation' || stage === 'objection') {
    return {
      primaryCTA: 'start_free_trial',
      label: '🚀 Start 14-Day Free Trial',
      link: '/signup',
      secondaryCTA: 'book_demo',
      secondaryLabel: '🎥 Book a Demo',
      secondaryLink: '/demo'
    };
  }

  // Default CTA
  return {
    primaryCTA: 'start_free_trial',
    label: '🚀 Start Free Trial',
    link: '/signup',
    secondaryCTA: 'book_demo',
    secondaryLabel: '🎥 See Demo',
    secondaryLink: '/#demo'
  };
}
