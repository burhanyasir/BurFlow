import { BuyingIntentResult } from './types';

export function detectBuyingIntent(message: string): BuyingIntentResult {
  const text = message.toLowerCase().trim();

  const intentPhrases = [
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
    'where do i sign up'
  ];

  const matchedPhrase = intentPhrases.find(phrase => text.includes(phrase));

  let targetTier: 'free' | 'starter' | 'professional' | 'enterprise' | undefined;
  if (/enterprise|custom plan|sales demo|50,000|500,000/i.test(text)) {
    targetTier = 'enterprise';
  } else if (/professional|\$99|10,000|10k/i.test(text)) {
    targetTier = 'professional';
  } else if (/starter|\$49|1,000|1k/i.test(text)) {
    targetTier = 'starter';
  } else if (/free plan|free tier|\$0/i.test(text)) {
    targetTier = 'free';
  }

  if (matchedPhrase) {
    return {
      hasBuyingIntent: true,
      intentPhrase: matchedPhrase,
      targetTier: targetTier || 'professional',
      confidence: 0.95
    };
  }

  if (/pricing|how much does it cost|subscription cost|price list/i.test(text)) {
    return {
      hasBuyingIntent: true,
      intentPhrase: 'pricing_inquiry',
      targetTier,
      confidence: 0.75
    };
  }

  return {
    hasBuyingIntent: false,
    confidence: 0.1
  };
}
