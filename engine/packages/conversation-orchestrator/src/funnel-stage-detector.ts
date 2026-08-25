import { FunnelStage } from './types';

export function detectFunnelStage(
  message: string,
  previousStage: FunnelStage = 'greeting',
  hasBuyingIntent: boolean = false,
  isObjection: boolean = false,
): FunnelStage {
  const text = message.toLowerCase().trim();

  if (hasBuyingIntent || /ready to buy|sign me up|start trial|book demo|purchase|buy now|let's do it|get started now|i want to start/i.test(text)) {
    return 'purchase_intent';
  }

  if (isObjection || /expensive|too expensive|why pay|cost too much|don't (think|believe) (it's|its) worth|not (worth|secure|safe)|privacy concern|gdpr|data (leak|breach)|compliance issue|hack|vulnerability/i.test(text)) {
    return 'objection';
  }

  if (/^(hi|hello|hey|howdy|good morning|good afternoon|good evening|thanks|thank you|welcome)\b/i.test(text) && text.length < 50) {
    return 'greeting';
  }

  if (/pricing|cost|plans|tiers|starter|professional|enterprise|free trial|overages|limits|features|what (do|can|does) .+(do|offer)|capabilities|pricing page|price page|how much/i.test(text)) {
    return 'evaluation';
  }

  if (/how (does|do|can) .+(work|function|operate|integrate|setup)|grounding|vector|rag|integration|wordpress|shopify|api|sdk|setup|embed|install|configure/i.test(text)) {
    return 'interest';
  }

  if (/what is|what does|who is|plain english|overview|demo|tell me about|describe|explain/i.test(text)) {
    return 'discovery';
  }

  if (/broken|error|bug|issue|help me with my|log in|can't login|not working|down|outage|error message/i.test(text)) {
    return 'support';
  }

  if (previousStage === 'greeting') {
    return 'discovery';
  }

  if (/why|because|reason|tell me more|explain|elaborate|details|how does that|what about|can you (explain|tell|describe)/i.test(text)) {
    return previousStage;
  }

  if (/compare|vs|versus|alternative|competitor|difference|better than/i.test(text)) {
    return 'evaluation';
  }

  if (/integrat|connect|setup|install|embed|configure|plugin|webhook/i.test(text)) {
    return 'interest';
  }

  return previousStage;
}
