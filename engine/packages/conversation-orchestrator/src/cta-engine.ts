import { PersonaType, FunnelStage, BuyingIntentResult, CTASelectionResult, CTAType } from './types';

export interface CTAInput {
  persona: PersonaType;
  stage: FunnelStage;
  buyingIntent: BuyingIntentResult;
  rejectedCTAs?: string[];
  trustLevel?: 'low' | 'medium' | 'high';
  qualificationCompleted?: boolean;
  turnCount?: number;
  hasObjection?: boolean;
  objectionCategory?: string;
  customerTemperature?: string;
}

function isRejected(rejectedCTAs: string[] | undefined, ctaId: CTAType): boolean {
  if (!rejectedCTAs || rejectedCTAs.length === 0) return false;
  return rejectedCTAs.some(r => r.toLowerCase() === ctaId.toLowerCase());
}

export function selectCTA(input: CTAInput): CTASelectionResult {
  const {
    persona,
    stage,
    buyingIntent,
    rejectedCTAs = [],
    trustLevel = 'medium',
    qualificationCompleted = false,
    turnCount = 0,
    hasObjection = false,
    objectionCategory,
    customerTemperature,
  } = input;

  const confidence = buyingIntent.confidence;

  if (customerTemperature === 'lost' || turnCount > 15) {
    if (!isRejected(rejectedCTAs, 'contact_sales')) {
      return {
        primaryCTA: 'contact_sales',
        label: 'Talk to a Human',
        link: '/contact',
        secondaryCTA: undefined,
        secondaryLabel: undefined,
        secondaryLink: undefined,
      };
    }
    return {
      primaryCTA: 'none',
      label: '',
      link: '',
    };
  }

  if (hasObjection && objectionCategory === 'price') {
    if (!isRejected(rejectedCTAs, 'start_free_trial')) {
      return {
        primaryCTA: 'start_free_trial',
        label: 'Try Free (No Card)',
        link: '/signup',
        secondaryCTA: 'book_demo',
        secondaryLabel: 'Book a Demo',
        secondaryLink: '/demo',
      };
    }
    if (!isRejected(rejectedCTAs, 'book_demo')) {
      return {
        primaryCTA: 'book_demo',
        label: 'See It in Action',
        link: '/demo',
        secondaryCTA: 'contact_sales',
        secondaryLabel: 'Talk to Sales',
        secondaryLink: '/contact',
      };
    }
  }

  if (hasObjection && objectionCategory === 'security') {
    if (!isRejected(rejectedCTAs, 'contact_sales')) {
      return {
        primaryCTA: 'contact_sales',
        label: 'Talk to Security Team',
        link: '/contact',
        secondaryCTA: 'developer_docs',
        secondaryLabel: 'View Security Docs',
        secondaryLink: '/security',
      };
    }
  }

  if (hasObjection && objectionCategory === 'setup') {
    if (!isRejected(rejectedCTAs, 'book_demo')) {
      return {
        primaryCTA: 'book_demo',
        label: 'Book Setup Walkthrough',
        link: '/demo',
        secondaryCTA: 'developer_docs',
        secondaryLabel: 'Setup Guide',
        secondaryLink: '/docs/setup',
      };
    }
  }

  if (confidence >= 0.85 && stage === 'purchase_intent') {
    if (persona === 'enterprise') {
      if (!isRejected(rejectedCTAs, 'book_demo')) {
        return {
          primaryCTA: 'book_demo',
          label: 'Schedule Enterprise Demo',
          link: '/contact',
          secondaryCTA: 'contact_sales',
          secondaryLabel: 'Contact Sales',
          secondaryLink: '/contact',
        };
      }
      if (!isRejected(rejectedCTAs, 'contact_sales')) {
        return {
          primaryCTA: 'contact_sales',
          label: 'Talk to Enterprise Sales',
          link: '/contact',
          secondaryCTA: undefined,
          secondaryLabel: undefined,
          secondaryLink: undefined,
        };
      }
    }
    if (!isRejected(rejectedCTAs, 'start_free_trial')) {
      return {
        primaryCTA: 'start_free_trial',
        label: 'Start 14-Day Free Trial',
        link: '/signup',
        secondaryCTA: 'book_demo',
        secondaryLabel: 'Book a Demo',
        secondaryLink: '/demo',
      };
    }
    if (!isRejected(rejectedCTAs, 'book_demo')) {
      return {
        primaryCTA: 'book_demo',
        label: 'Book a Demo',
        link: '/demo',
        secondaryCTA: 'contact_sales',
        secondaryLabel: 'Talk to Sales',
        secondaryLink: '/contact',
      };
    }
  }

  if (confidence >= 0.5) {
    if (persona === 'enterprise' && !isRejected(rejectedCTAs, 'book_demo')) {
      return {
        primaryCTA: 'book_demo',
        label: 'Book Enterprise Demo',
        link: '/contact',
        secondaryCTA: 'start_free_trial',
        secondaryLabel: 'Start Free Trial',
        secondaryLink: '/signup',
      };
    }
    if (!isRejected(rejectedCTAs, 'start_free_trial')) {
      return {
        primaryCTA: 'start_free_trial',
        label: 'Start Free Trial',
        link: '/signup',
        secondaryCTA: 'book_demo',
        secondaryLabel: 'Book a Demo',
        secondaryLink: '/demo',
      };
    }
  }

  if (persona === 'developer') {
    if (!isRejected(rejectedCTAs, 'developer_docs')) {
      return {
        primaryCTA: 'developer_docs',
        label: 'View Developer Docs',
        link: '/docs',
        secondaryCTA: 'start_free_trial',
        secondaryLabel: 'Start Developer Trial',
        secondaryLink: '/signup',
      };
    }
  }

  if (persona === 'agency') {
    if (!isRejected(rejectedCTAs, 'partner_program')) {
      return {
        primaryCTA: 'partner_program',
        label: 'Join Partner Program',
        link: '/contact',
        secondaryCTA: 'start_free_trial',
        secondaryLabel: 'Start Free Trial',
        secondaryLink: '/signup',
      };
    }
  }

  if (stage === 'evaluation') {
    if (!isRejected(rejectedCTAs, 'book_demo')) {
      return {
        primaryCTA: 'book_demo',
        label: 'Book a Demo',
        link: '/demo',
        secondaryCTA: 'start_free_trial',
        secondaryLabel: 'Start Free Trial',
        secondaryLink: '/signup',
      };
    }
    if (!isRejected(rejectedCTAs, 'start_free_trial')) {
      return {
        primaryCTA: 'start_free_trial',
        label: 'Start Free Trial',
        link: '/signup',
        secondaryCTA: 'book_demo',
        secondaryLabel: 'Book a Demo',
        secondaryLink: '/demo',
      };
    }
  }

  if (stage === 'interest') {
    if (!isRejected(rejectedCTAs, 'book_demo')) {
      return {
        primaryCTA: 'book_demo',
        label: 'Watch Demo',
        link: '/demo',
        secondaryCTA: 'start_free_trial',
        secondaryLabel: 'Start Free Trial',
        secondaryLink: '/signup',
      };
    }
  }

  if (trustLevel === 'high' && qualificationCompleted && !isRejected(rejectedCTAs, 'start_free_trial')) {
    return {
      primaryCTA: 'start_free_trial',
      label: 'Start 14-Day Free Trial',
      link: '/signup',
      secondaryCTA: 'book_demo',
      secondaryLabel: 'Book a Demo',
      secondaryLink: '/demo',
    };
  }

  if (!isRejected(rejectedCTAs, 'start_free_trial')) {
    return {
      primaryCTA: 'start_free_trial',
      label: 'Start Free Trial',
      link: '/signup',
      secondaryCTA: 'book_demo',
      secondaryLabel: 'See Demo',
      secondaryLink: '/demo',
    };
  }

  if (!isRejected(rejectedCTAs, 'book_demo')) {
    return {
      primaryCTA: 'book_demo',
      label: 'Book a Demo',
      link: '/demo',
      secondaryCTA: 'contact_sales',
      secondaryLabel: 'Talk to Sales',
      secondaryLink: '/contact',
    };
  }

  return {
    primaryCTA: 'contact_sales',
    label: 'Talk to Sales',
    link: '/contact',
    secondaryCTA: undefined,
    secondaryLabel: undefined,
    secondaryLink: undefined,
  };
}
