import { ConversationMemoryData } from './conversation-memory';
import { ConversationIntelligenceResult } from './conversation-intelligence-types';
import {
  GREETING_PATTERNS,
  FAREWELL_PATTERNS,
  GRATITUDE_PATTERNS,
} from './patterns';

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

const CTA_PATTERNS = /\b(trial|demo|sign.?up|start|purchase|buy|schedule|contact|talk to sales|book)\b/i;
const QUALIFICATION_QUESTION_PATTERNS = /\b(how many|what.*industry|what.*company|what.*team|do you use|what.*budget|what.*timeline|how.*large|what.*size|what.*monthly)\b/i;

export function validateResponse(
  proposedResponse: string,
  userMessage: string,
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
): ValidationResult {
  const issues: string[] = [];

  if (!proposedResponse || proposedResponse.trim().length === 0) {
    issues.push('Response is empty');
    return { valid: false, issues };
  }

  const lowerResponse = proposedResponse.toLowerCase();
  const lowerMessage = userMessage.toLowerCase().trim();

  checkAnswersMessage(proposedResponse, lowerMessage, lowerResponse, issues);
  checkNoRepetition(proposedResponse, memory, issues);
  checkAdvancesConversation(proposedResponse, lowerResponse, userMessage, lowerMessage, issues);
  checkAtMostOneCTA(proposedResponse, lowerResponse, issues);
  checkAtMostOneQualification(proposedResponse, lowerResponse, issues);
  checkEndsNaturally(proposedResponse, lowerResponse, userMessage, issues);

  return { valid: issues.length === 0, issues };
}

function checkAnswersMessage(response: string, lowerMsg: string, lowerResp: string, issues: string[]): void {
  const isGreetingMsg = GREETING_PATTERNS.test(lowerMsg);
  const isFarewellMsg = FAREWELL_PATTERNS.test(lowerMsg);
  const isGratitudeMsg = GRATITUDE_PATTERNS.test(lowerMsg);

  if (isGreetingMsg && !/(hi|hello|hey|welcome|greetings|how can i help|what.*challenge|good)/i.test(lowerResp) && response.length > 3) {
    issues.push('Response does not acknowledge greeting');
  }

  if (isFarewellMsg && !/(bye|goodbye|take care|come back|see you|anytime)/i.test(lowerResp)) {
    issues.push('Response does not acknowledge farewell');
  }

  if (isGratitudeMsg && !/(welcome|happy to|glad|pleasure|anytime)/i.test(lowerResp) && response.length > 5) {
    issues.push('Response does not acknowledge gratitude');
  }

  if (/(who (made|created|built) you|who are you|what are you)/i.test(lowerMsg)) {
    if (!/(conversation engine|ai assistant|built|created|team)/i.test(lowerResp)) {
      issues.push('Response does not address identity question');
    }
  }

  const reallyWordInMsg = /\breally\b/i.test(lowerMsg);
  if (reallyWordInMsg && !/(yes|absolutely|of course|certainly|definitely|here is|let me explain|that.s right|you bet|sure thing)/i.test(lowerResp) && response.trim().length < 30) {
    issues.push('Response does not acknowledge "really" emphasis');
  }
}

function checkNoRepetition(response: string, memory: ConversationMemoryData, issues: string[]): void {
  if (!memory.lastResponseText) return;

  if (response.toLowerCase() === memory.lastResponseText.toLowerCase()) {
    issues.push('Response is identical to previous response');
    return;
  }

  const lastWords = memory.lastResponseText.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const responseWords = response.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  if (lastWords.length < 4 || responseWords.length < 5) return;

  const overlap = responseWords.filter(w => lastWords.includes(w));
  const overlapRatio = responseWords.length > 0 ? overlap.length / responseWords.length : 0;

  if (overlapRatio > 0.8) {
    issues.push(`Response has high word overlap with previous response`);
  }
}

function checkAdvancesConversation(response: string, lowerResp: string, userMsg: string, lowerMsg: string, issues: string[]): void {
  const isFarewell = FAREWELL_PATTERNS.test(lowerResp);
  if (isFarewell) return;

  if (GRATITUDE_PATTERNS.test(lowerResp) && response.trim().length < 20) return;

  const isQuestion = userMsg.includes('?');
  if (isQuestion && response.trim().length < 25 && !/(yes|no|okay|sure|maybe|i don't know)/i.test(lowerResp)) {
    return;
  }

  if (isQuestion && /^(okay sure|sure|okay|yeah|fine|alright|got it|mmhm|uh huh|yep|nope)\b/i.test(lowerResp.trim())) {
    issues.push('Response is dismissive of user question');
    return;
  }

  if (isQuestion && response.trim().length > 30) return;

  if (/(who (made|created|built) you|who are you|what are you)/i.test(userMsg) && !FAREWELL_PATTERNS.test(lowerResp)) {
    return;
  }

  const hasFollowUp = lowerResp.includes('?');
  const hasCTA = CTA_PATTERNS.test(lowerResp);
  const hasDirection = /\b(you could|would you|can you|let me|here.s|next|try |check out|consider|explore|i.recommend|learn more|feel free)\b/i.test(lowerResp);
  const hasOffer = /\b(start |begin |get started|sign up|register|book |schedule |try for free)\b/i.test(lowerResp);

  if (!hasFollowUp && !hasCTA && !hasDirection && !hasOffer) {
    if (!FAREWELL_PATTERNS.test(lowerResp) && response.trim().length >= 20) {
      issues.push('Response has no follow-up direction');
    }
  }
}

function checkAtMostOneCTA(response: string, lowerResp: string, issues: string[]): void {
  const ctaMatches = response.match(/\b(start free trial|book a demo|talk to sales|sign up|register|contact sales|schedule demo|get started|try for free)\b/gi);
  if (ctaMatches && ctaMatches.length > 1) {
    issues.push(`Response contains ${ctaMatches.length} CTAs (max 1)`);
  }
}

function checkAtMostOneQualification(response: string, lowerResp: string, issues: string[]): void {
  const qualMatches = response.match(QUALIFICATION_QUESTION_PATTERNS);
  if (qualMatches && qualMatches.length > 1) {
    issues.push(`Response contains ${qualMatches.length} qualification questions (max 1)`);
  }
}

function checkEndsNaturally(response: string, lowerResp: string, userMsg: string, issues: string[]): void {
  const trimmed = response.trim();
  if (trimmed.length === 0) return;

  if (FAREWELL_PATTERNS.test(lowerResp)) return;
  if (trimmed.length < 20) return;

  const lastChar = trimmed[trimmed.length - 1];
  if (lastChar !== '.' && lastChar !== '?' && lastChar !== '!' && lastChar !== ')') {
    issues.push('Response does not end with proper punctuation');
  }
}
