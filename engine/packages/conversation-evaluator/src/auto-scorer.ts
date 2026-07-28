import { TurnEvaluation, DeadEnd, LoopEvent, CTAEvent, EvaluationMetrics } from './types';
import type { BrainOutput } from '@conversation-engine/conversation-orchestrator';

const GENERIC_PATTERNS = [
  /^great question\./i, /^happy to clarify\./i, /^here is what you need to know\./i,
  /^let me break that down/i, /^most customers ask/i, /^i.d be happy to help/i,
  /^that is a common one/i, /^straight to the point:/i,
  /^the short answer is:/i, /^i can help with that\./i,
  /^let me know if you have questions/i, /^anything else\?/i, /^is there anything else/i,
  /^what else can i help/i,
];

const DEAD_END_PATTERNS = [
  /let me know if you have questions/i,
  /anything else\?/i,
  /is there anything else/i,
  /what else can i help/i,
  /other questions\?/i,
  /further questions/i,
];

export interface TurnAnalysis {
  turnNumber: number;
  userMessage: string;
  brainOutput: BrainOutput;
  responseText: string;
  estimatedNaturalness: 1 | 2 | 3 | 4 | 5;
  feltGeneric: boolean;
  repeatedPhrases: string[];
  deadEnd: boolean;
  topicContinuityGood: boolean;
  memoryReferenced: boolean;
  advancedFunnel: boolean;
  notes: string;
}

// Track repeated phrases across the conversation
const phraseFrequency = new Map<string, number[]>();

export function resetPhraseTracking(): void {
  phraseFrequency.clear();
}

function extractPhrases(text: string, minLen = 15): string[] {
  const phrases: string[] = [];
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length >= minLen);
  for (const s of sentences) {
    const normalized = s.toLowerCase().replace(/[^\w\s]/g, '').trim();
    if (normalized.length >= minLen) phrases.push(normalized);
  }
  return phrases;
}

export function analyzeTurn(
  turnNumber: number,
  userMessage: string,
  brainOutput: BrainOutput,
): TurnAnalysis {
  const response = brainOutput.responseText;
  const lower = response.toLowerCase();
  const topicsInResponse = brainOutput.memory.currentTopic
    ? [brainOutput.memory.currentTopic]
    : brainOutput.plan.topicsToDiscuss || [];

  // Naturalness estimation
  let naturalness: 1 | 2 | 3 | 4 | 5 = 3;
  const isGeneric = GENERIC_PATTERNS.some(p => p.test(response));
  const isShort = response.length < 40 && brainOutput.plan.goal !== 'finish_conversation';
  const isFormulaic = brainOutput.strategy?.reasoning.some(r => r.includes('Loop')) || false;

  if (isGeneric || isShort || isFormulaic) naturalness = 2;
  if (isGeneric && isShort) naturalness = 1;
  if (!isGeneric && response.length > 80 && brainOutput.strategy?.tone) naturalness = 4;
  if (!isGeneric && response.length > 150 && brainOutput.plan.goal !== 'qualify') naturalness = 5;

  // Generic check
  const feltGeneric = isGeneric || isShort;

  // Repeated phrases
  const phrases = extractPhrases(response);
  const repeatedPhrases: string[] = [];
  for (const p of phrases) {
    const turns = phraseFrequency.get(p) || [];
    if (turns.length > 0 && !turns.includes(turnNumber)) {
      repeatedPhrases.push(p.slice(0, 60));
    }
    phraseFrequency.set(p, [...turns, turnNumber]);
  }

  // Dead-end check
  const deadEnd = DEAD_END_PATTERNS.some(p => p.test(lower));

  // Topic continuity
  const oldTopics = brainOutput.memory.topicsExplained.map(t => t.topic);
  const userTopics = detectTopics(userMessage);
  const responseStaysOnUserTopic = userTopics.length === 0 ||
    userTopics.some(ut => lower.includes(ut));
  const topicContinuityGood = responseStaysOnUserTopic;

  // Memory referenced
  const mem = brainOutput.memory;
  const memoryReferenced =
    (mem.companySize && lower.includes(mem.companySize.toLowerCase())) ||
    (mem.industry && lower.includes(mem.industry.toLowerCase())) ||
    (mem.currentHelpdesk && lower.includes(mem.currentHelpdesk.toLowerCase())) ||
    (mem.persona && lower.includes(mem.persona.replace('_', ' '))) ||
    false;

  // Advanced funnel
  const advancedFunnel = brainOutput.plan.goal === 'advance_funnel' ||
    brainOutput.plan.goal === 'close_trial' ||
    brainOutput.plan.goal === 'recommend_plan' ||
    brainOutput.plan.goal === 'schedule_demo' ||
    !!brainOutput.cta.primaryCTA && brainOutput.cta.primaryCTA !== 'none';

  // Notes
  const notes: string[] = [];
  if (isGeneric) notes.push('Generic opening pattern detected');
  if (isShort) notes.push('Response too short');
  if (deadEnd) notes.push('Dead-end CTA');
  if (repeatedPhrases.length > 0) notes.push(`Repeated: "${repeatedPhrases[0].slice(0, 40)}"`);
  if (!topicContinuityGood) notes.push('Topic mismatch with user message');
  if (brainOutput.plan.goal === 'qualify' && userTopics.length === 0) notes.push('Qualification without user topic prompt');

  return {
    turnNumber,
    userMessage,
    brainOutput,
    responseText: response,
    estimatedNaturalness: naturalness,
    feltGeneric,
    repeatedPhrases,
    deadEnd,
    topicContinuityGood,
    memoryReferenced,
    advancedFunnel,
    notes: notes.join('; '),
  };
}

function detectTopics(message: string): string[] {
  const lower = message.toLowerCase();
  const topics: string[] = [];
  if (/(feature|capabilit|what do you do|product|platform)/i.test(lower)) topics.push('features');
  if (/(price|pricing|cost|plan|tier|how much|subscription)/i.test(lower)) topics.push('pricing');
  if (/(integrat|zendesk|intercom|slack|widget|embed|connect)/i.test(lower)) topics.push('integrations');
  if (/(security|compliance|soc2|gdpr|hipaa|encrypt|data)/i.test(lower)) topics.push('security');
  if (/(api|sdk|developer|dev|code|webhook|rest)/i.test(lower)) topics.push('api');
  if (/(demo|trial|free|try|get.started|sandbox)/i.test(lower)) topics.push('trial');
  if (/(compare|vs |versus|competitor|alternative|difference)/i.test(lower)) topics.push('comparison');
  if (/(walkthrough|how.*work|pipeline|architecture)/i.test(lower)) topics.push('walkthrough');
  if (/(roi|revenue|save money|payback|cost.saving)/i.test(lower)) topics.push('roi');
  if (/(sso|saml|okta|active directory|azure ad)/i.test(lower)) topics.push('sso');
  if (/(setup|onboard|deploy|install|getting.started)/i.test(lower)) topics.push('onboarding');
  return topics;
}

export function detectLoops(analyses: TurnAnalysis[]): LoopEvent[] {
  const goals = analyses.map(a => a.brainOutput.plan.goal).filter(Boolean) as string[];
  const loops: LoopEvent[] = [];
  for (let i = 0; i < goals.length - 2; i++) {
    for (let len = 2; len <= Math.min(3, goals.length - i); len++) {
      const pattern = goals.slice(i, i + len).join(',');
      let count = 1;
      for (let j = i + len; j <= goals.length - len; j += len) {
        if (goals.slice(j, j + len).join(',') === pattern) count++;
        else break;
      }
      if (count >= 2) {
        loops.push({ startTurn: analyses[i].turnNumber, endTurn: analyses[i + len * count - 1]?.turnNumber || 0, pattern, count });
      }
    }
  }
  const unique = new Map<string, LoopEvent>();
  for (const l of loops) {
    const key = `${l.startTurn}-${l.pattern}`;
    if (!unique.has(key)) unique.set(key, l);
  }
  return Array.from(unique.values()).slice(0, 3);
}

export function extractCTAs(analyses: TurnAnalysis[]): CTAEvent[] {
  return analyses.map(a => ({
    turnNumber: a.turnNumber,
    ctaType: a.brainOutput.cta.primaryCTA || 'none',
    label: a.brainOutput.cta.label || '',
    appropriate: a.brainOutput.cta.primaryCTA !== 'none',
    userResponded: false,
  }));
}

export function turnAnalysisToEvaluation(analysis: TurnAnalysis): TurnEvaluation {
  return {
    turnNumber: analysis.turnNumber,
    userMessage: analysis.userMessage,
    assistantResponse: analysis.responseText,
    observedCustomerIntent: analysis.brainOutput.plan.customerIntent,
    expectedGoal: analysis.brainOutput.plan.goal,
    actualGoal: analysis.brainOutput.plan.goal,
    goalMatch: true,
    topicsDiscussed: analysis.brainOutput.memory.topicsExplained.map(t => t.topic),
    naturalness: analysis.estimatedNaturalness,
    feltGeneric: analysis.feltGeneric,
    repeatedPhrases: analysis.repeatedPhrases,
    unnecessaryQualification: analysis.brainOutput.plan.goal === 'qualify' && analysis.feltGeneric,
    ctaPresent: analysis.brainOutput.cta.primaryCTA !== 'none',
    ctaAppropriate: analysis.brainOutput.cta.primaryCTA !== 'none',
    ctaTiming: analysis.brainOutput.cta.primaryCTA !== 'none' ? 'appropriate' : 'none',
    memoryReferenced: analysis.memoryReferenced,
    memoryShouldHaveBeenReferenced: analysis.turnNumber > 1,
    topicContinuityGood: analysis.topicContinuityGood,
    advancedFunnel: analysis.advancedFunnel,
    handledObjection: analysis.brainOutput.plan.goal === 'handle_objection',
    betterFollowUpAvailable: false,
    betterFollowUpText: null,
    notes: analysis.notes,
  };
}
