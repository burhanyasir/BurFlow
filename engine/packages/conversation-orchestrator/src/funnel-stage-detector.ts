import { FunnelStage } from './types';

export function detectFunnelStage(
  message: string,
  previousStage: FunnelStage = 'greeting',
  hasBuyingIntent: boolean = false,
  isObjection: boolean = false
): FunnelStage {
  const text = message.toLowerCase().trim();

  // 1. High Buying Intent -> Purchase Intent
  if (hasBuyingIntent || /ready to buy|sign me up|start trial|book demo|purchase|buy now|let's do it/i.test(text)) {
    return 'purchase_intent';
  }

  // 2. Objection Stage
  if (isObjection || /expensive|why pay|hallucinate|secure|privacy|competitor|intercom|chatgpt/i.test(text)) {
    return 'objection';
  }

  // 3. Greeting Stage
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|welcome)\b/i.test(text) && text.length < 30) {
    return 'greeting';
  }

  // 4. Evaluation Stage (Pricing, Features, Limits)
  if (/pricing|cost|plans|tiers|starter|professional|enterprise|free trial|overages|limits|features|what (do|can|does) .+(do|offer)|capabilities/i.test(text)) {
    return 'evaluation';
  }

  // 5. Interest Stage (Integrations, SDK, How it works)
  if (/how (does|do|can) .+(work|function|operate|integrate|setup)|grounding|vector|rag|integration|wordpress|shopify|api|sdk|setup/i.test(text)) {
    return 'interest';
  }

  // 6. Discovery Stage (What is this, who is it for)
  if (/what is|what does|who is|plain english|overview|demo/i.test(text)) {
    return 'discovery';
  }

  // 7. Support Stage
  if (/broken|error|bug|issue|help me with my|log in/i.test(text)) {
    return 'support';
  }

  // Progress forward if currently in greeting
  if (previousStage === 'greeting') {
    return 'discovery';
  }

  return previousStage;
}
