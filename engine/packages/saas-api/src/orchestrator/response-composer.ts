import { OrchestratorState } from './types';

// Phrases that must NEVER appear in responses (internal leakage)
const LEAKAGE_PATTERNS = [
  /\bintent classification\b/i,
  /\bembedding(s)?\b/i,
  /\bpipeline(s)?\b/i,
  /\brouting\b/i,
  /\bprompting\b/i,
  /\bconversation brain\b/i,
  /\bbrain[\s-]?(output|response|result)\b/i,
  /\bconversation engine\b/i,
  /\binternal strategy\b/i,
  /\bsystem prompt(s)?\b/i,
  /\bdecision logic\b/i,
  /\bmemory implementation\b/i,
  /\blegacy[-\s]?memory\b/i,
  /\bturn(s)? count\b/i,
  /\bfunnel[-\s]?stage\b/i,
  /\bqualification[-\s]?state\b/i,
  /\bbuying[-\s]?intent[-\s]?(detected|score|tier)?\b/i,
  /\bCI[-\s]?result\b/i,
  /\borchestrat(or|ion)\b/,
];

const GENERIC_FILLER = [
  'Short version:',
  'The main thing to know is:',
  'What you are asking about comes down to this.',
  'You are asking the right questions.',
  'That is a good instinct.',
  'Here is what matters for your situation.',
  'Here is what matters.',
  'Here is the thing about that.',
  'So the core of it is:',
  'The practical answer is this.',
  'Here is the reality on that point.',
  'That is a fair point. Here is the other side of it.',
  'Fair question. Let me give you the straight answer.',
  'Sure, here is the relevant part.',
  'The way this works is straightforward.',
  'This is one of those details that makes a difference.',
];

const FOLLOW_UP_PATTERNS = /(?:Would you like|Want) to (?:go deeper into|explore|dig deeper into) [\w\s,-]+(?:\s+next)?\??|There is more to cover on [\w\s]+? - shall I continue\??|Shall I continue\??|Do you want me to show how it works in practice\??/gi;

function stripInternalLeakage(text: string): string {
  let result = text;
  for (const p of LEAKAGE_PATTERNS) {
    result = result.replace(p, '');
  }
  return result;
}

function stripGenericFiller(text: string): string {
  let result = text.trim();

  // Pass 1: Strip leading opening
  for (const opening of GENERIC_FILLER) {
    if (result.startsWith(opening)) {
      result = result.slice(opening.length).trim();
      result = result.replace(/^[,\s.]+/, '').trim();
      if (result.length > 0) {
        result = result[0].toUpperCase() + result.slice(1);
      }
      break;
    }
  }

  // Pass 2: Strip inline filler
  for (const opening of GENERIC_FILLER) {
    const escaped = opening.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inlinePattern = new RegExp(`\\s*${escaped}\\s*`, 'gi');
    result = result.replace(inlinePattern, ' ');
  }

  result = result.replace(/\s{2,}/g, ' ').trim();
  if (result.length > 0) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  return result;
}

function deduplicateSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const s of sentences) {
    const normalized = s.trim().toLowerCase();
    if (normalized.length < 5) continue;
    // Check if very similar sentence already seen
    let isDuplicate = false;
    const key = normalized.slice(0, 30);
    if (seen.has(key)) isDuplicate = true;
    if (!isDuplicate) {
      seen.add(key);
      unique.push(s.trim());
    }
  }

  return unique.join(' ');
}

function normalizeTone(text: string, state: OrchestratorState): string {
  let result = text;

  // Remove unsupported claims
  const unsupportedPatterns = [
    /\b(best|#1|number one|leading|top[- ]rated|industry[- ]leading)\b/i,
    /\b(guaranteed|100%|never|always|every|all)\b.*?(?:problem|issue|ticket)/i,
  ];
  for (const p of unsupportedPatterns) {
    result = result.replace(p, (match) => {
      if (['best', '#1', 'number one'].some(w => match.toLowerCase().includes(w))) return '';
      return match;
    });
  }

  // Remove robotic transitions
  const roboticTransitions = [
    /\b(great|perfect|excellent|fantastic) (question|point|observation)\b/i,
    /\bthat is an (excellent|great|very good) question\b/i,
    /\bi am (glad|happy|pleased) (you asked|to help|to assist)\b/i,
  ];
  for (const p of roboticTransitions) {
    result = result.replace(p, '');
  }

  // Mood-aware tone adjustment
  if (state.mood === 'frustrated' || state.mood === 'angry') {
    // Remove overly cheerful phrases
    result = result.replace(/\b(great|awesome|fantastic|wonderful|perfect)\b/gi, '');
  }

  return result;
}

function cleanupPunctuation(text: string): string {
  let result = text;
  result = result.replace(/\?\s*\?/g, '?');
  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/\s+([.,!?;:])/g, '$1');
  result = result.trim();
  if (result.length > 0 && !/[.!?]$/.test(result)) {
    result += '.';
  }
  return result;
}

export function replaceFollowUp(text: string, state: OrchestratorState, message: string): string {
  const hasPricingIntent = /\b(price|cost|charge|pricing|plan|tier|subscription|monthly|annual|fee)\b/i.test(message);
  const hasSecurityIntent = /\b(security|soc2|compliance|encrypt|audit|certif|hipaa|gdpr)\b/i.test(message);
  const hasIntegrationIntent = /\b(integration|connect|slack|salesforce|zendesk|api|webhook)\b/i.test(message);
  const topics = state.ledger.topicsCovered;
  const useCase = state.knownFacts.useCase;

  let replacement: string;
  if (hasPricingIntent || topics.includes('pricing')) {
    replacement = "I can walk you through the plans and help find the right fit for your team.";
  } else if (hasSecurityIntent || topics.includes('security')) {
    replacement = "I can share more about our security certifications and infrastructure. Interested?";
  } else if (hasIntegrationIntent || topics.includes('integrations')) {
    replacement = "We integrate with most popular tools. Want to check if yours is supported?";
  } else if (useCase === 'reduce support tickets' || topics.includes('roi') || topics.includes('features')) {
    replacement = "We can look at how companies typically reduce support tickets, or we can estimate what that could mean for your business.";
  } else if (useCase === 'improve customer service' || topics.includes('walkthrough')) {
    replacement = "Would you like to see how it works, or discuss what it would look like for your team?";
  } else {
    replacement = "Is there a specific aspect you would like to explore further?";
  }

  let replacedCount = 0;
  let result = text.replace(FOLLOW_UP_PATTERNS, () => {
    replacedCount++;
    return replacedCount === 1 ? replacement : '';
  });

  result = result.replace(/\s+\?\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return result;
}

export interface CompositionResult {
  text: string;
  leakageDetected: boolean;
  duplicatesRemoved: number;
}

export function composeResponse(
  rawText: string,
  state: OrchestratorState,
  message: string,
): CompositionResult {
  if (!rawText) return { text: '', leakageDetected: false, duplicatesRemoved: 0 };

  let result = rawText;
  let leakageDetected = false;
  let duplicatesRemoved = 0;

  // 1. Strip internal leakage
  const beforeLen = result.length;
  result = stripInternalLeakage(result);
  if (result.length !== beforeLen) {
    leakageDetected = true;
    state.metrics.internalLeakageCount++;
  }

  // 2. Strip generic filler
  result = stripGenericFiller(result);

  // 3. Deduplicate sentences
  const beforeDedup = result.length;
  result = deduplicateSentences(result);
  if (result.length !== beforeDedup) {
    duplicatesRemoved++;
  }

  // 4. Replace follow-up patterns
  result = replaceFollowUp(result, state, message);

  // 5. Normalize tone
  result = normalizeTone(result, state);

  // 6. Cleanup punctuation
  result = cleanupPunctuation(result);

  return { text: result, leakageDetected, duplicatesRemoved };
}
