import { GeneratorInput } from './types';

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function buildPromptMessages(input: GeneratorInput): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  const systemPrompt = input.systemPrompt || 'You are a helpful customer support assistant.';

  // ─── System prompt ───────────────────────────────────────
  const systemSections: string[] = [
    systemPrompt,
  ];

  // Business context
  systemSections.push(`\n## Business Context\n- Current persona: ${input.persona}\n- Funnel stage: ${input.funnelStage}\n- Lead score: ${input.leadScore}/10\n- Conversation score: ${input.conversationScore}/10`);

  // Tone adaptation based on sentiment
  let toneInstruction = 'Respond in a professional, helpful tone.';
  if (input.sentiment.polarity < -0.3) {
    toneInstruction = 'The customer seems frustrated or upset. Respond with empathy, patience, and understanding. De-escalate any tension. Avoid being pushy.';
  } else if (input.sentiment.polarity > 0.3) {
    toneInstruction = 'The customer is in a positive mood. Match their enthusiasm while staying professional.';
  }
  if (input.sentiment.urgency === 'high') {
    toneInstruction += ' The customer has high urgency. Be direct and prioritize speed.';
  }
  systemSections.push(`\n## Tone Guidelines\n${toneInstruction}`);

  // Sales pressure based on buying intent
  let pressureInstruction = 'Use low sales pressure. Focus on helping, not selling.';
  if (input.buyingIntent.detected && input.buyingIntent.confidence > 0.6) {
    pressureInstruction = 'The customer has shown buying intent. You may present relevant offers naturally, but do not be pushy. Let the customer lead.';
  }
  if (input.funnelStage === 'purchase_intent' || input.funnelStage === 'evaluation') {
    pressureInstruction += ' The customer is actively evaluating. Provide specific value propositions and product details.';
  }
  systemSections.push(`\n## Sales Pressure\n${pressureInstruction}`);

  // Knowledge context
  if (input.knowledgeResults.length > 0) {
    const knowledgeSection = input.knowledgeResults.map(k => `- ${k.title}: ${k.content}${k.source ? ` (Source: ${k.source})` : ''}`).join('\n');
    systemSections.push(`\n## Knowledge Context\nReference the following knowledge when relevant:\n${knowledgeSection}`);
  }

  // No repetition rules
  systemSections.push(`\n## Response Rules\n- NEVER repeat information you have already shared.\n- NEVER ask questions the customer has already answered.\n- Reference retrieved knowledge when answering questions.\n- Handle objections naturally — acknowledge them before addressing.\n- Offer CTAs (calls to action) only when the timing is appropriate.\n- Support follow-up questions naturally.\n- Keep responses concise and conversational.\n- Return a JSON object with the following fields:\n  - "response": string (your main response text)\n  - "cta": { "primaryCTA": string (one of "demo", "pricing", "signup", "contact", "learn_more", "none"), "label": string, "link": string } | null\n  - "quickReplies": array of { "id": string, "label": string, "action": string, "payload": string, "variant"?: string }\n  - "confidence": number (0-1, how confident you are in this response)\n  - "safetyFlags": string[]\n  - "reasoning": { "tone": string, "salesPressure": "none"|"low"|"medium"|"high", "objectionHandled"?: string, "knowledgeReferenced": string[], "ctaTiming": string, "followUpSupported": boolean }\n\nIMPORTANT: Respond with valid JSON only.`);

  const systemContent = systemSections.join('\n');
  messages.push({ role: 'system', content: systemContent });

  // ─── Conversation history (trimmed to context window) ────
  const maxTokens = input.tenantConfig?.maxTokens || 1024;
  const modelContextWindow = getContextWindow(input.tenantConfig?.model || '');
  const reservedForOutput = maxTokens;
  const availableForInput = modelContextWindow - reservedForOutput - estimateTokens(systemContent);

  if (availableForInput <= 0) {
    messages.push({ role: 'user', content: input.message });
    return messages;
  }

  let budgetUsed = 0;
  for (let i = input.conversationHistory.length - 1; i >= 0; i--) {
    const msg = input.conversationHistory[i];
    const tokens = estimateTokens(msg.content);
    if (budgetUsed + tokens <= availableForInput * 0.6) {
      messages.splice(1, 0, { role: msg.role, content: msg.content });
      budgetUsed += tokens;
    } else {
      break;
    }
  }

  // ─── Session memory / context stack summary ──────────────
  const contextKeys = Object.keys(input.contextStack);
  if (contextKeys.length > 0) {
    const summary = contextKeys.slice(0, 5).map(k => `${k}: ${JSON.stringify(input.contextStack[k]).slice(0, 200)}`).join('\n');
    messages.push({ role: 'system', content: `## Session Memory\n${summary}` });
  }

  // ─── Current state summary (qualification, objections, trust) ──
  const stateParts: string[] = [];
  if (input.qualificationState.completed) stateParts.push('Qualification: completed');
  else if (input.qualificationState.progress > 0) stateParts.push(`Qualification: ${Math.round(input.qualificationState.progress * 100)}% complete`);
  if (input.objections.length > 0) stateParts.push(`Objections raised: ${input.objections.join(', ')}`);
  if (input.trustSignals.length > 0) stateParts.push(`Trust signals: ${input.trustSignals.join(', ')}`);
  if (input.recoveryState.needsRecovery) stateParts.push(`Recovery needed: ${input.recoveryState.recoverySuggestion || ''}`);
  if (input.abandonmentRisk.level !== 'low') stateParts.push(`Abandonment risk: ${input.abandonmentRisk.level} (${input.abandonmentRisk.score}/100)`);
  if (stateParts.length > 0) {
    messages.push({ role: 'system', content: `## Current State\n${stateParts.join('\n')}` });
  }

  // ─── CTA & quick replies context ─────────────────────────
  const ctaInfo = input.currentCta.primaryCTA !== 'none' ? `Current CTA: ${input.currentCta.label} (${input.currentCta.link})` : '';
  const qrInfo = input.quickReplies.length > 0 ? `Current quick replies available: ${input.quickReplies.map(q => q.label).join(', ')}` : '';
  if (ctaInfo || qrInfo) {
    messages.push({ role: 'system', content: `## Available Actions\n${[ctaInfo, qrInfo].filter(Boolean).join('\n')}` });
  }

  // ─── User message ────────────────────────────────────────
  messages.push({ role: 'user', content: input.message });

  return messages;
}

function getContextWindow(model: string): number {
  const lower = model.toLowerCase();
  if (lower.includes('gpt-4o-mini') || lower.includes('gpt-4o')) return 128000;
  if (lower.includes('gpt-4-turbo')) return 128000;
  if (lower.includes('gpt-4')) return 8192;
  if (lower.includes('gpt-3.5')) return 16385;
  if (lower.includes('o3') || lower.includes('o4')) return 200000;
  if (lower.includes('claude')) return 200000;
  if (lower.includes('gemini')) return 1048576;
  if (lower.includes('llama') || lower.includes('mistral') || lower.includes('mixtral')) return 32768;
  return 8192;
}
