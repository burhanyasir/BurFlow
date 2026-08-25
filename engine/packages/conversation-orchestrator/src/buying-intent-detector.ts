import { BuyingIntentResult } from './types';

export interface BuyingIntentInput {
  message: string;
  turnCount?: number;
  previousBuyingIntent?: boolean;
  previousConfidence?: number;
  objectionHistory?: string[];
}

const STRONG_BUYING_PHRASES = [
  'ready to buy',
  'sign me up',
  'start trial',
  'start free trial',
  'book demo',
  'schedule demo',
  'purchase',
  "let's do it",
  'want to buy',
  'buy now',
  'upgrade now',
  'take my money',
  'how do i sign up',
  'where do i sign up',
  'get started now',
  'i want to start',
  'ready to get started',
  'sign us up',
  'lets go',
  "let's go",
];

const PRICING_INQUIRY_PHRASES = [
  'how much does it cost',
  'subscription cost',
  'price list',
  'what does it cost',
  'what do you charge',
  'pricing for',
  'cost per month',
  'monthly cost',
  'annual cost',
];

const COMPARISON_PHRASES = [
  'compare plans',
  'compare pricing',
  'difference between',
  'which plan',
  'what plan',
  'best plan for',
  'recommend.*plan',
];

export function detectBuyingIntent(input: BuyingIntentInput | string): BuyingIntentResult {
  const text = typeof input === 'string' ? input.toLowerCase().trim() : input.message.toLowerCase().trim();
  const turnCount = typeof input === 'string' ? 0 : (input.turnCount || 0);
  const prevBuying = typeof input === 'string' ? false : (input.previousBuyingIntent || false);
  const prevConfidence = typeof input === 'string' ? 0 : (input.previousConfidence || 0);
  const objections = typeof input === 'string' ? [] : (input.objectionHistory || []);

  let targetTier: 'free' | 'starter' | 'professional' | 'enterprise' | undefined;
  if (/enterprise|custom plan|sales demo|50,000|500,000|1,000,000|1m\+|100,000\+|100k\+/i.test(text)) {
    targetTier = 'enterprise';
  } else if (/professional|\$99|10,000|10k/i.test(text)) {
    targetTier = 'professional';
  } else if (/starter|\$49|1,000|1k/i.test(text)) {
    targetTier = 'starter';
  } else if (/free plan|free tier|\$0/i.test(text)) {
    targetTier = 'free';
  }

  const matchedStrongPhrase = STRONG_BUYING_PHRASES.find(phrase => text.includes(phrase));
  if (matchedStrongPhrase) {
    return {
      hasBuyingIntent: true,
      intentPhrase: matchedStrongPhrase,
      targetTier: targetTier || 'professional',
      confidence: 0.95,
    };
  }

  const matchedPricingPhrase = PRICING_INQUIRY_PHRASES.find(phrase => text.includes(phrase));
  if (matchedPricingPhrase) {
    return {
      hasBuyingIntent: true,
      intentPhrase: 'pricing_inquiry',
      targetTier,
      confidence: 0.55,
    };
  }

  const matchedComparisonPhrase = COMPARISON_PHRASES.find(phrase => new RegExp(phrase, 'i').test(text));
  if (matchedComparisonPhrase) {
    return {
      hasBuyingIntent: true,
      intentPhrase: 'plan_comparison',
      targetTier,
      confidence: 0.45,
    };
  }

  if (prevBuying && prevConfidence > 0.6) {
    const decayedConfidence = Math.max(0.1, prevConfidence - (turnCount > 3 ? 0.05 * (turnCount - 3) : 0));
    if (decayedConfidence >= 0.3) {
      return {
        hasBuyingIntent: true,
        intentPhrase: 'carried_forward',
        targetTier,
        confidence: decayedConfidence,
      };
    }
  }

  if (objections.includes('price')) {
    return {
      hasBuyingIntent: false,
      confidence: 0.0,
    };
  }

  return {
    hasBuyingIntent: false,
    confidence: 0.0,
  };
}
