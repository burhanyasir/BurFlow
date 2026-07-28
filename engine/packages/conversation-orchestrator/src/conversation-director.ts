import {
  ConversationMemoryData, ConversationGoal, FunnelStageExtended,
  DiscernedTopic, isTopicExplained, discernTopics,
} from './conversation-memory';
import { ConversationIntelligenceResult } from './conversation-intelligence-types';
import { SmartButton, CTAType, PersonaType } from './types';
import { ConversationPlan } from './conversation-planner';

export type TopicStatus = 'unknown' | 'mentioned' | 'explained' | 'completed';

export interface TopicLifecycle {
  topic: DiscernedTopic;
  status: TopicStatus;
  firstMentionedAtTurn: number;
  lastMentionedAtTurn: number;
  explainedCount: number;
}

export interface AgendaState {
  completedTopics: DiscernedTopic[];
  currentTopic: DiscernedTopic | null;
  upcomingTopics: DiscernedTopic[];
  topicLifecycles: TopicLifecycle[];
}

export interface PendingQuestion {
  question: string;
  askedAtTurn: number;
  answered: boolean;
}

export interface ProfileConfidenceField {
  value: string | null;
  confidence: 'low' | 'medium' | 'high';
}

export interface ProfileConfidence {
  industry: ProfileConfidenceField;
  persona: ProfileConfidenceField;
  companySize: ProfileConfidenceField;
  useCase: ProfileConfidenceField;
  budget: ProfileConfidenceField;
  decisionTimeline: ProfileConfidenceField;
  helpdesk: ProfileConfidenceField;
  monthlyVolume: ProfileConfidenceField;
}

export type CTATiming = 'none' | 'soft' | 'strong';

export interface ConversationStrategy {
  primaryGoal: ConversationGoal;
  topicToAnswer: DiscernedTopic | null;
  followUpTopic: DiscernedTopic | null;
  qualificationQuestion: string | null;
  cta: CTATiming;
  quickReplies: SmartButton[];
  tone: 'casual' | 'professional' | 'empathic' | 'urgent';
  responseLength: 'short' | 'medium' | 'detailed';
  pendingQuestions: PendingQuestion[];
  agenda: AgendaState;
  profileConfidence: ProfileConfidence;
  reasoning: string[];
}

const AGENDA_TOPIC_ORDER: DiscernedTopic[] = [
  'features', 'pricing', 'security', 'integrations', 'api',
  'roi', 'soc2', 'sso', 'walkthrough', 'comparison',
  'demo', 'trial', 'onboarding', 'developer',
];

function buildTopicLifecycles(memory: ConversationMemoryData): TopicLifecycle[] {
  return AGENDA_TOPIC_ORDER.map(topic => {
    const record = memory.topicsExplained.find(t => t.topic === topic);
    return {
      topic,
      status: record ? 'explained' : 'unknown',
      firstMentionedAtTurn: record ? record.explainedAtTurn : -1,
      lastMentionedAtTurn: record ? record.explainedAtTurn : -1,
      explainedCount: record ? record.count : 0,
    };
  });
}

function buildAgenda(memory: ConversationMemoryData, newTopics: DiscernedTopic[]): AgendaState {
  const lifecycles = buildTopicLifecycles(memory);
  const completed: DiscernedTopic[] = [];
  const upcoming: DiscernedTopic[] = [];
  const current = memory.currentTopic || null;
  const allMentioned = lifecycles.filter(l => l.status !== 'unknown').map(l => l.topic);

  for (const lc of lifecycles) {
    if (lc.status === 'explained' && lc.topic !== current && lc.explainedCount > 0) {
      if (!completed.includes(lc.topic)) completed.push(lc.topic);
    }
  }

  const userShift = newTopics.length > 0 && current && !newTopics.includes(current);
  if (userShift) {
    if (current && !completed.includes(current)) completed.push(current);
  }

  for (const lc of lifecycles) {
    if (lc.status === 'unknown' || lc.status === 'mentioned') {
      if (!upcoming.includes(lc.topic)) upcoming.push(lc.topic);
    }
  }

  const explainedTopics = memory.topicsExplained.map(t => t.topic);
  const allDone = explainedTopics.length + completed.length;
  for (const topic of AGENDA_TOPIC_ORDER) {
    if (topic === current) continue;
    if (completed.includes(topic)) continue;
    if (explainedTopics.includes(topic)) continue;
    if (!upcoming.includes(topic)) upcoming.push(topic);
  }

  return { completedTopics: completed, currentTopic: current, upcomingTopics: upcoming, topicLifecycles: lifecycles };
}

function findPendingQuestions(memory: ConversationMemoryData): PendingQuestion[] {
  const pending: PendingQuestion[] = [];
  for (let i = Math.max(0, memory.turns.length - 4); i < memory.turns.length; i++) {
    const turn = memory.turns[i];
    if (!turn) continue;
    if (turn.message.includes('?') && !turn.message.toLowerCase().includes('how are you')) {
      const responseTopics = discernTopics(turn.response);
      const messageTopics = discernTopics(turn.message);
      const answered = responseTopics.length > 0 && responseTopics.some(t => messageTopics.includes(t));
      pending.push({
        question: turn.message,
        askedAtTurn: turn.turnNumber,
        answered: answered || turn.customerIntent === 'confirming' || turn.customerIntent === 'greeting',
      });
    }
  }
  return pending;
}

function computeProfileConfidence(memory: ConversationMemoryData): ProfileConfidence {
  const fields = ['industry', 'persona', 'companySize', 'useCase', 'budget', 'decisionTimeline', 'helpdesk'] as const;
  const result: Record<string, ProfileConfidenceField> = {};
  for (const field of fields) {
    const value = (memory as any)[field] as string | undefined;
    if (value) {
      const turnDetection = memory.turns.filter(t => {
        const msg = t.message.toLowerCase();
        const resp = t.response.toLowerCase();
        return msg.includes(value.toLowerCase()) || resp.includes(value.toLowerCase());
      }).length;
      result[field] = {
        value,
        confidence: turnDetection >= 3 ? 'high' : turnDetection >= 2 ? 'medium' : 'low',
      };
    } else {
      result[field] = { value: null, confidence: 'low' };
    }
  }
  const monthlyVolume = memory.monthlyConversations;
  if (monthlyVolume) {
    result.monthlyVolume = { value: monthlyVolume, confidence: memory.qualificationCollected.completed ? 'high' : 'medium' };
  } else {
    result.monthlyVolume = { value: null, confidence: 'low' };
  }
  return result as unknown as ProfileConfidence;
}

function shouldAskQualification(plan: ConversationPlan, memory: ConversationMemoryData): { ask: boolean; question: string } {
  if (memory.qualificationCollected.completed) return { ask: false, question: '' };
  if (plan.missingQualification.length === 0) return { ask: false, question: '' };
  const nonGreetingTurns = memory.turns.filter(t => t.customerIntent !== 'greeting').length;
  if (nonGreetingTurns < 2) return { ask: false, question: '' };
  return { ask: true, question: plan.missingQualification[0] };
}

function determineCTATiming(plan: ConversationPlan, memory: ConversationMemoryData, ciResult: ConversationIntelligenceResult): CTATiming {
  if (plan.goal === 'finish_conversation') return 'none';

  // Conversion goals always need strong CTA
  if (plan.goal === 'close_trial' || plan.goal === 'schedule_demo') return 'strong';
  if (plan.goal === 'recover_abandonment') return 'strong';
  if (plan.goal === 'recommend_plan') return 'soft';

  // Value gate: early turns (0-1) with no topics don't get CTAs
  if (memory.turnCount <= 1 && memory.topicsExplained.length === 0 && plan.goal !== 'recommend_plan') {
    return 'none';
  }

  if (plan.goal === 'recommend_plan') return 'soft';

  // Qualification: show CTA only after some conversation has happened
  if (plan.goal === 'qualify') {
    if (memory.persona === 'enterprise' || memory.persona === 'developer' || memory.persona === 'agency') return 'soft';
    if (memory.turnCount >= 3 || memory.qualificationCollected.completed) return 'soft';
    return 'none';
  }

  const stage = plan.funnelStage;
  if (stage === 'purchase_intent' || stage === 'decision') return 'strong';
  if (stage === 'evaluation') return 'soft';
  if (stage === 'interest' || stage === 'consideration') return 'soft';
  if (memory.turnCount <= 1) return 'none';

  // Match strength to buying intent
  if (ciResult.buyingIntent.hasBuyingIntent || memory.buyingIntentDetected) return 'strong';

  return 'soft';
}

function determineResponseLength(plan: ConversationPlan, memory: ConversationMemoryData): 'short' | 'medium' | 'detailed' {
  if (plan.goal === 'build_trust') return 'short';
  if (plan.goal === 'finish_conversation') return 'short';
  if (plan.goal === 'qualify') return 'short';
  if (plan.customerIntent === 'comparing' || plan.customerIntent === 'evaluating') return 'detailed';
  if (plan.topicsToDiscuss.length > 1) return 'detailed';
  if (memory.turnCount > 8) return 'medium';
  return 'medium';
}

function detectLoop(memory: ConversationMemoryData): boolean {
  const recent = memory.turns.slice(-10);
  if (recent.length < 5) return false;

  const recentGoals = recent.map(t => t.goal).filter(g => g !== 'none' && g !== 'advance_funnel');
  if (recentGoals.length < 4) return false;

  const goalCounts = new Map<string, number>();
  for (const g of recentGoals) goalCounts.set(g, (goalCounts.get(g) || 0) + 1);
  const uniqueGoals = new Set(recentGoals);

  if (uniqueGoals.size < 3) {
    const maxRepeats = Math.max(...goalCounts.values());
    return maxRepeats >= 4;
  }

  const stages = recent.map(t => t.funnelStage);
  if (new Set(stages).size > 1) return false;

  for (let i = 2; i < recentGoals.length; i++) {
    if (recentGoals[i] === recentGoals[i - 2] && recentGoals[i] !== recentGoals[i - 1]) {
      return true;
    }
  }

  return false;
}

function determineFollowUpTopic(agenda: AgendaState, memory: ConversationMemoryData, newTopics: DiscernedTopic[], hasPending: boolean): DiscernedTopic | null {
  // If user brought up new topics, they're driving — don't override with agenda suggestions
  if (newTopics.length > 0) return null;
  // If pending unanswered questions, let answering them serve as the next step
  if (hasPending) return null;
  // Deepen current topic if still shallow (count < 3 means initial + one follow-up)
  if (memory.currentTopic) {
    const record = memory.topicsExplained.find(t => t.topic === memory.currentTopic);
    if (record && record.count < 3) {
      return memory.currentTopic;
    }
  }
  // Advance to next logical topic from agenda
  if (agenda.upcomingTopics.length > 0) {
    const next = agenda.upcomingTopics[0];
    if (!isTopicExplained(memory, next)) return next;
  }
  // Fallback: any completely unmentioned topic
  for (const topic of AGENDA_TOPIC_ORDER) {
    if (!isTopicExplained(memory, topic)) return topic;
  }
  // Absolute last resort — stay on current topic
  return memory.currentTopic || 'features';
}

function getPrimaryGoal(plan: ConversationPlan, loopDetected: boolean): ConversationGoal {
  if (loopDetected && plan.goal !== 'finish_conversation' && plan.goal !== 'build_trust') {
    if (plan.customerIntent === 'objection' || plan.customerIntent === 'rejecting') return 'handle_objection';
    return 'advance_funnel';
  }
  return plan.goal;
}

export function processConversationDirector(
  message: string,
  memory: ConversationMemoryData,
  ciResult: ConversationIntelligenceResult,
  plan: ConversationPlan,
): ConversationStrategy {
  const reasoning: string[] = [];
  const newTopics = discernTopics(message);

  const agenda = buildAgenda(memory, newTopics);

  const pending = findPendingQuestions(memory);

  const hasPendingUnanswered = pending.some(p => !p.answered);

  const qualification = shouldAskQualification(plan, memory);

  const loopDetected = detectLoop(memory);

  const primaryGoal = getPrimaryGoal(plan, loopDetected);
  reasoning.push(`Goal: ${primaryGoal} (original: ${plan.goal})`);

  if (loopDetected) {
    reasoning.push('Loop detected — forcing advancement');
  }

  let topicToAnswer: DiscernedTopic | null = null;
  if (newTopics.length > 0) {
    const unhandled = newTopics.filter(t => !isTopicExplained(memory, t));
    if (unhandled.length > 0) {
      topicToAnswer = unhandled[0];
      reasoning.push(`Answering new topic: ${topicToAnswer}`);
    } else {
      topicToAnswer = newTopics[0];
      reasoning.push(`Re-answering topic: ${topicToAnswer}`);
    }
  } else if (hasPendingUnanswered) {
    const firstPending = pending.find(p => !p.answered);
    if (firstPending) {
      const pendingTopics = discernTopics(firstPending.question);
      if (pendingTopics.length > 0) {
        topicToAnswer = pendingTopics[0];
        reasoning.push(`Answering pending question about: ${topicToAnswer}`);
      }
    }
  }
  if (memory.currentTopic && !topicToAnswer) {
    topicToAnswer = memory.currentTopic;
  }

  let followUpTopic = determineFollowUpTopic(agenda, memory, newTopics, hasPendingUnanswered);
  if (followUpTopic) {
    reasoning.push(`Follow-up suggestion: ${followUpTopic}`);
  }
  if (hasPendingUnanswered) {
    reasoning.push('Holding follow-up due to pending questions');
  }

  if (qualification.ask && hasPendingUnanswered) {
    reasoning.push('Skipping qualification due to pending questions');
  }
  if (qualification.ask) {
    reasoning.push('Qualification needed this turn');
  }

  const qualificationQuestion = qualification.ask && !hasPendingUnanswered ? qualification.question : null;
  if (qualificationQuestion) {
    reasoning.push(`Qualification question: ${qualificationQuestion}`);
  }

  const cta = determineCTATiming(plan, memory, ciResult);
  reasoning.push(`CTA timing: ${cta}`);

  const tone = plan.constraints.tone;
  const responseLength = determineResponseLength(plan, memory);

  const profileConfidence = computeProfileConfidence(memory);

  if (pending.length > 0) {
    reasoning.push(`${pending.filter(p => !p.answered).length} unanswered pending questions`);
  }

  return {
    primaryGoal,
    topicToAnswer,
    followUpTopic,
    qualificationQuestion,
    cta,
    quickReplies: [],
    tone,
    responseLength,
    pendingQuestions: pending,
    agenda,
    profileConfidence,
    reasoning,
  };
}
