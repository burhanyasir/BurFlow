import { Strategy, ConversationMood, OrchestratorState } from './types';
import {
  GREETING_PATTERNS,
  FAREWELL_PATTERNS,
  SMALL_TALK_PATTERNS,
  GRATITUDE_PATTERNS,
} from '@conversation-engine/conversation-orchestrator';

interface RapportResult {
  handled: boolean;
  strategy: Strategy;
  mood: ConversationMood;
  response: string;
}

const CONFUSION_PATTERNS = [
  /^(hmm|huh|wait|hold on)/i,
  /^what\??$/i,
  /i don'?t (understand|get|follow)/i,
  /(?:that|this) (doesn'?t|does not) make sense/i,
  /(?:can you|could you) (explain|clarify|elaborate)/i,
  /what do you mean/i,
  /(?:not|don'?t) (sure|clear|understand)/i,
  /(?:rephrase|repeat|again)/i,
  /sorry[,.].*(?:what|confus|understand)/i,
];

const FRUSTRATION_PATTERNS = [
  /\b(ridiculous|useless|terrible|horrible|awful)\b/i,
  /\b(this is|that is) (not|never|doesn'?t)\b/i,
  /\b(waste of time|fed up|sick of|tired of)\b/i,
  /\b(frustrat|annoying|infuriat|exasperat)\b/i,
  /\b(you'?re not|you are not|aren'?t) (helping|listening|understanding)\b/i,
  /\bjust (tell|give|show) me (what|the|a)\b.*?(?:already|now)/i,
];

const SKEPTICISM_PATTERNS = [
  /^really\??$/i,
  /^seriously\??$/i,
  /i doubt (it|that)/i,
  /(?:prove|show) it/i,
  /(?:is that|that'?s) (true|real|accurate)/i,
  /(?:too good|sounds like) to be true/i,
  /i'?ll believe it when/i,
  /\b(skeptic|suspicious|unconvinced)\b/i,
];

const HUMOR_PATTERNS = [
  /^(lol|lmao|rofl|😂|🤣)$/i,
  /\b(just kidding|jk|kidding|joking)\b/i,
  /\b(funny|hilarious|that'?s a good one)\b/i,
  /^(haha|hahaha|hehe)/i,
];

const BUSINESS_WORDS = new Set([
  'help', 'need', 'question', 'issue', 'problem', 'support', 'ticket',
  'pricing', 'cost', 'price', 'plan', 'buy', 'trial', 'sign up',
  'reduce', 'improve', 'automate', 'integrate', 'demo',
  'account', 'billing', 'error', 'bug', 'feature', 'subscription',
  'upgrade', 'cancel', 'refund', 'invoice', 'payment',
]);

function hasBusinessIntent(message: string): boolean {
  const words = message.toLowerCase().split(/\s+/);
  let businessWordCount = 0;
  for (const w of words) {
    if (BUSINESS_WORDS.has(w)) businessWordCount++;
    if (businessWordCount >= 2) return true;
  }
  return false;
}

function matchesAny(message: string, patterns: RegExp[]): boolean {
  const lower = message.trim().toLowerCase();
  return patterns.some(p => p.test(lower));
}

function isPureGreeting(message: string): boolean {
  if (GREETING_PATTERNS.test(message.trim().toLowerCase())) {
    if (message.split(/\s+/).length > 3 && hasBusinessIntent(message)) return false;
    return true;
  }
  return false;
}

function detectMood(message: string): ConversationMood | null {
  if (matchesAny(message, FRUSTRATION_PATTERNS)) return 'frustrated';
  if (matchesAny(message, CONFUSION_PATTERNS)) return 'confused';
  if (matchesAny(message, SKEPTICISM_PATTERNS)) return 'skeptical';
  if (matchesAny(message, HUMOR_PATTERNS)) return 'humorous';
  if (GRATITUDE_PATTERNS.test(message.trim().toLowerCase())) return 'appreciative';
  if (/\b(angry|mad|furious|livid|pissed)\b/i.test(message)) return 'angry';
  if (/\b(maybe|perhaps|i guess|not sure if|possibly|might)\b/i.test(message)) return 'hesitant';
  if (GREETING_PATTERNS.test(message.trim().toLowerCase()) || SMALL_TALK_PATTERNS.test(message.trim().toLowerCase())) return 'positive';
  return null;
}

function getGreetingResponse(message: string): string {
  const lower = message.trim().toLowerCase();
  if (/^how (are you|are things|is it going)\b/i.test(lower)) {
    return "I'm doing well, thanks! What can I help you with today?";
  }
  if (GRATITUDE_PATTERNS.test(lower)) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  if (FAREWELL_PATTERNS.test(lower)) {
    return "Take care! Feel free to reach out anytime.";
  }
  if (/^good (morning|afternoon|evening|day)\b/i.test(lower)) {
    return "Good morning! How can I help you today?";
  }
  return "Hi! Great to meet you. What can I help you with today?";
}

function getSmallTalkResponse(message: string): string {
  const lower = message.toLowerCase();
  if (/(?:how'?s|how is) your (day|week)/i.test(lower)) {
    return "It's going well, thanks for asking! How can I help you today?";
  }
  if (/(?:nice|great|lovely)\s+(weather|day)/i.test(lower)) {
    return "It is a nice day! How can I assist you today?";
  }
  return "That's great to hear! What can I help you with?";
}

function getConfusionResponse(): string {
  return "Let me try to clarify. What part would you like me to explain differently?";
}

function getFrustrationResponse(): string {
  return "I understand your frustration. Let me try a different approach — what specific concern can I address?";
}

function getSkepticismResponse(): string {
  return "That's a fair question. Let me share some specifics that might help. What would you like to know more about?";
}

function getHumorResponse(): string {
  return "Glad I could bring a smile! What can I help you with?";
}

function getAngryResponse(): string {
  return "I hear how frustrated you are. Let me focus on what you need — tell me the issue and I will work on fixing it.";
}

function getHesitantResponse(): string {
  return "No pressure at all. Take your time — what questions can I answer to help you decide?";
}

export function processRapportRepair(message: string, state: OrchestratorState): RapportResult {
  const mood = detectMood(message);
  if (mood) state.mood = mood;

  if (FAREWELL_PATTERNS.test(message.trim().toLowerCase()) && !hasBusinessIntent(message)) {
    return {
      handled: true,
      strategy: 'close_conversation',
      mood: mood || 'neutral',
      response: "Take care! Feel free to reach out anytime.",
    };
  }

  if (matchesAny(message, FRUSTRATION_PATTERNS)) {
    return {
      handled: true,
      strategy: 'repair_confusion',
      mood: 'frustrated',
      response: getFrustrationResponse(),
    };
  }

  if (matchesAny(message, SKEPTICISM_PATTERNS)) {
    return {
      handled: true,
      strategy: 'trust_building',
      mood: 'skeptical',
      response: getSkepticismResponse(),
    };
  }

  if (isPureGreeting(message) && state.turnCount === 0) {
    return {
      handled: true,
      strategy: 'greeting',
      mood: 'positive',
      response: getGreetingResponse(message),
    };
  }

  if (isPureGreeting(message) && state.turnCount > 0) {
    // Pass through to brain instead of returning canned response
    return { handled: false, strategy: 'greeting', mood: mood || 'neutral', response: '' };
  }

  if (matchesAny(message, CONFUSION_PATTERNS) && state.turnCount > 0) {
    return {
      handled: true,
      strategy: 'repair_confusion',
      mood: 'confused',
      response: getConfusionResponse(),
    };
  }

  if (matchesAny(message, HUMOR_PATTERNS) && !hasBusinessIntent(message)) {
    return {
      handled: true,
      strategy: 'greeting',
      mood: 'humorous',
      response: getHumorResponse(),
    };
  }

  if (/\b(angry|mad|furious|livid|pissed)\b/i.test(message)) {
    return {
      handled: true,
      strategy: 'repair_confusion',
      mood: 'angry',
      response: getAngryResponse(),
    };
  }

  if (/\b(maybe|perhaps|i guess|not sure if)\b/i.test(message) && state.turnCount > 1) {
    return {
      handled: true,
      strategy: 'clarify',
      mood: 'hesitant',
      response: getHesitantResponse(),
    };
  }

  if (SMALL_TALK_PATTERNS.test(message.trim().toLowerCase()) && !hasBusinessIntent(message) && state.turnCount === 0) {
    return {
      handled: true,
      strategy: 'greeting',
      mood: 'positive',
      response: getSmallTalkResponse(message),
    };
  }

  return { handled: false, strategy: 'answer', mood: mood || 'neutral', response: '' };
}
