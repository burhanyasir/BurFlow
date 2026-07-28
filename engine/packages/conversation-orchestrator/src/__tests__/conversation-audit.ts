import { processConversationBrain, BrainInput, BrainOutput } from '../conversation-brain';
import { ConversationIntelligenceMemory } from '../conversation-intelligence-types';
import { ConversationStrategy, CTATiming } from '../conversation-director';
import { DiscernedTopic, ConversationGoal, discernTopics, ConversationMemoryData } from '../conversation-memory';
import { FunnelStageExtended } from '../conversation-memory';

const TOPIC_RESPONSE_TEMPLATES: Record<string, string[]> = {
  features: ['Our features include AI-powered chat, analytics, and integrations.', 'Key features are grounded AI, multi-platform support, and analytics.'],
  pricing: ['Pricing starts at $29 per month for the Professional plan.', 'We have Starter at $19, Professional at $29, and Enterprise with custom pricing.'],
  security: ['We are SOC 2 compliant with encryption and access controls.', 'Security includes encryption at rest and in transit with compliance certifications.'],
  integrations: ['We integrate with Shopify, Zendesk, Intercom, and Slack.', 'Our platform connects with major tools and has a REST API.'],
  api: ['Our REST API supports webhooks, custom endpoints, and SDKs.', 'The API is well-documented with client libraries for all major languages.'],
  walkthrough: ['Let me walk through how it works step by step.', 'Here is how the platform works from setup to live.'],
  roi: ['Customers typically see 3x ROI within the first quarter.', 'Our platform reduces support costs by 40% on average.'],
  soc2: ['We are SOC 2 Type II certified with annual audits.', 'SOC 2 compliance is included in all Enterprise plans.'],
  sso: ['SSO via SAML is supported for Enterprise plans.', 'We support Okta, Azure AD, and OneLogin for SSO.'],
  demo: ['We can schedule a demo to show you the platform.', 'Let me set up a personalized demo for your team.'],
  trial: ['You can start a 14-day free trial with full access.', 'The trial includes all features with no credit card required.'],
  onboarding: ['Setup takes about 10 minutes with our guided onboarding.', 'Our onboarding includes documentation, templates, and support.'],
  developer: ['Developers can use our API and SDK for custom integrations.', 'We have extensive developer documentation and code samples.'],
  comparison: ['Compared to alternatives, our platform offers better deflection rates.', 'We outperform competitors on accuracy and ease of setup.'],
};

const GOAL_SUFFIXES: Record<string, string> = {
  build_trust: ' Many teams trust us for reliable AI support.',
  answer_question: ' Does that answer your question?',
  handle_objection: ' I understand your concern and want to address it.',
  qualify: ' To help recommend the right plan, could you share more about your needs?',
  advance_funnel: ' Would you like to explore this further?',
  recommend_plan: ' I would recommend our Professional plan for your needs.',
  close_trial: ' Would you like to start the trial now?',
  schedule_demo: ' When works best for a quick demo?',
  recover_abandonment: ' Can I share something that might help?',
  finish_conversation: ' Feel free to come back anytime.',
  none: '',
};

const CTA_TEXT_RECORD: Record<string, string> = {
  start_free_trial: ' You can start a free trial today.',
  book_demo: ' Would you like to book a demo?',
  contact_sales: ' Our sales team is ready to help.',
  developer_docs: ' Check out our developer docs.',
  pricing: ' See our pricing page for details.',
  partner_program: ' Join our partner program.',
  support: ' Our support team is available 24/7.',
};

export function generateResponseForStrategy(
  strategy: ConversationStrategy,
  userMessage: string,
  previousTopics?: string[],
): string {
  let response = '';

  const topic = strategy.topicToAnswer;
  if (topic && TOPIC_RESPONSE_TEMPLATES[topic]) {
    const templates = TOPIC_RESPONSE_TEMPLATES[topic];
    const used = previousTopics || [];
    const idx = used.filter(t => t === topic).length % templates.length;
    response = templates[idx];
  } else {
    response = 'Here is what you need to know.';
  }

  const goalSuffix = GOAL_SUFFIXES[strategy.primaryGoal];
  if (goalSuffix) response += goalSuffix;

  if (strategy.qualificationQuestion) {
    const fullQuestion = QUAL_LABEL_TO_QUESTION[strategy.qualificationQuestion] || strategy.qualificationQuestion;
    response += ` ${fullQuestion}`;
  }

  if (strategy.cta === 'soft' || strategy.cta === 'strong') {
    const ctaKey = Object.keys(CTA_TEXT_RECORD).find(k => {
      if (strategy.cta === 'soft') return k === 'start_free_trial' || k === 'pricing';
      return true;
    });
    if (ctaKey) response += CTA_TEXT_RECORD[ctaKey];
  }

  if (!response) response = userMessage.includes('?') ? 'Here is the information you requested.' : 'I am happy to help with that.';

  return response;
}

export function runReplayDynamic(replay: ReplayDef): ConversationAudit {
  let legacyMemory: ConversationIntelligenceMemory = {
    turns: [],
    persona: 'unknown',
    funnelStage: 'greeting',
    buyingIntentDetected: false,
    objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0,
    topics: [],
    ...replay.initialLegacy,
  };

  const turnAudits: TurnAudit[] = [];
  let qualificationCount = 0;
  let reachedTrialOrDemo = false;
  const allTopics: string[] = [];

  for (let i = 0; i < replay.turns.length; i++) {
    const { message } = replay.turns[i];
    const brainOutput = processConversationBrain({ message, responseText: '', legacyMemory });
    const strategy = brainOutput.strategy;
    if (!strategy) {
      throw new Error(`[${replay.name}] No strategy at turn ${i + 1}`);
    }

    const generatedResponse = generateResponseForStrategy(strategy, message, allTopics);

    const enrichedOutput = processConversationBrain({ message, responseText: generatedResponse, legacyMemory });
    const enrichedStrategy = enrichedOutput.strategy;
    if (!enrichedStrategy) {
      throw new Error(`[${replay.name}] No strategy at turn ${i + 1} (enriched)`);
    }

    if (strategy.topicToAnswer) allTopics.push(strategy.topicToAnswer);

    const audit = auditTurn(i + 1, message, enrichedOutput.responseText, enrichedStrategy, enrichedOutput, turnAudits);
    turnAudits.push(audit);

    if (strategy.qualificationQuestion) qualificationCount++;

    if (/trial|demo|sign.?up/i.test(enrichedOutput.responseText)) {
      reachedTrialOrDemo = true;
    }

    legacyMemory = enrichedOutput.legacyMemory;
  }

  const scores = computeAggregate(turnAudits);

  const allIssues = turnAudits.flatMap(t => t.issues);
  const loopCount = allIssues.filter(i => i.toLowerCase().includes('loop')).length;

  const topicCounts = new Map<string, number>();
  const legacy = legacyMemory as any;
  const explained = legacy.topics || [];
  for (const t of explained) {
    topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
  }
  const repeatedTopics = Array.from(topicCounts.entries())
    .filter(([_, count]) => count > 5)
    .map(([topic]) => topic);

  const deviations = Array.from(new Set(allIssues));
  const compliancePct = Math.round(scores.overall * 10000) / 100;

  return {
    replayName: replay.name,
    turnCount: replay.turns.length,
    turns: turnAudits,
    scores,
    loopCount,
    repeatedTopics,
    repeatedQualifications: qualificationCount,
    reachedTrialOrDemo,
    deviations,
    compliancePct,
  };
}


export interface TurnDef {
  message: string;
  responseText: string;
}

export interface ReplayDef {
  name: string;
  persona: string;
  turns: TurnDef[];
  initialLegacy?: Partial<ConversationIntelligenceMemory>;
}

export interface TurnScores {
  topicAccuracy: number;
  goalAccuracy: number;
  contextUsage: number;
  agendaProgression: number;
  ctaTiming: number;
  qualificationTiming: number;
}

export interface TurnAudit {
  turnNumber: number;
  message: string;
  response: string;
  strategy: ConversationStrategy;
  brainOutput: BrainOutput;
  scores: TurnScores;
  issues: string[];
  details: Record<string, unknown>;
}

export interface AggregateScores {
  topicAccuracy: number;
  goalAccuracy: number;
  contextUsage: number;
  agendaProgression: number;
  ctaTiming: number;
  qualificationTiming: number;
  overall: number;
}

export interface ConversationAudit {
  replayName: string;
  turnCount: number;
  turns: TurnAudit[];
  scores: AggregateScores;
  loopCount: number;
  repeatedTopics: string[];
  repeatedQualifications: number;
  reachedTrialOrDemo: boolean;
  deviations: string[];
  compliancePct: number;
}

const CTA_PATTERNS: Record<string, RegExp> = {
  start_free_trial: /start.*(free|trial)|free trial|start.*trial|sign.*up|get started/i,
  book_demo: /book.*demo|schedule.*demo/i,
  contact_sales: /contact.*sales|talk.*sales|speak.*sales/i,
  developer_docs: /developer.*doc|api.*doc|doc.*developer/i,
  pricing: /pricing|see.*plan|compare.*plan/i,
  partner_program: /partner.*program|partner/i,
  support: /contact.*support|reach.*support|support.*team.*(available|ready|help)/i,
};

const QUALIFICATION_PATTERNS = [
  /company.*size|how many.*(employee|people|team)/i,
  /what.*industry|what.*company|what.*business/i,
  /use case|what.*(build|do|use).*for/i,
  /monthly.*(conversation|volume|ticket)|how many.*(conversation|ticket)/i,
  /current.*(helpdesk|platform|tool|solution)/i,
  /budget|how much.*(spend|budget)/i,
  /decision.*(timeline|time|frame)|when.*(decide|choose)/i,
];

const QUAL_LABEL_TO_QUESTION: Record<string, string> = {
  'company size': 'To help recommend the right plan, what is your company size?',
  'industry': 'To help narrow down options, what industry are you in?',
  'use case': 'To make sure I recommend the right fit, what is your use case?',
  'monthly conversations': 'How many conversations do you handle per month?',
  'current helpdesk': 'What helpdesk or support platform do you currently use?',
  'budget': 'What is your approximate budget for a support solution?',
  'decision timeline': 'What is your decision timeline for evaluating solutions?',
};

function detectCTAInResponse(response: string): string | null {
  for (const [cta, pattern] of Object.entries(CTA_PATTERNS)) {
    if (pattern.test(response)) return cta;
  }
  return null;
}

function detectQualificationInResponse(response: string): boolean {
  return QUALIFICATION_PATTERNS.some(p => p.test(response));
}

function detectTopicInResponse(response: string, topic: DiscernedTopic): boolean {
  const responseTopics = discernTopics(response);
  return responseTopics.includes(topic);
}

const GOAL_DETECTORS: Record<ConversationGoal, RegExp> = {
  build_trust: /help|understand|solution|trust|reliable|great|perfect/i,
  answer_question: /(^|\.) (yes|here|that|it|is|are)|\?|does that answer|more detail/i,
  handle_objection: /understand.*concern|let.*address|appreciate|valid.*point|perspective|fair/i,
  qualify: /company.*size|what.*industry|use case|monthly.*volume|current.*helpdesk|budget|timeline/i,
  advance_funnel: /next|explore|move forward|would you like|shall we|ready to|what.*next/i,
  recommend_plan: /recommend|plan|tier|starter|professional|enterprise|best.*fit|ideal/i,
  close_trial: /trial|start.*free|sign.*up|get.*started|try it/i,
  schedule_demo: /demo|walkthrough|book|schedule|show you/i,
  recover_abandonment: /revisit|another.*look|second.*chance|offer|special/i,
  finish_conversation: /bye|goodbye|take care|feel free|anytime|glad/i,
  none: /.*/,
};

function detectGoalInResponse(response: string, goal: ConversationGoal): boolean {
  const detector = GOAL_DETECTORS[goal];
  if (!detector) return true;
  return detector.test(response);
}

function detectContextReference(response: string, memory: ConversationMemoryData): boolean {
  if (memory.industry && response.toLowerCase().includes(memory.industry.toLowerCase())) return true;
  if (memory.persona && memory.persona !== 'unknown' && response.toLowerCase().includes(memory.persona.replace(/_/g, ' '))) return true;
  if (memory.companySize && response.includes(memory.companySize)) return true;
  if (memory.useCase && response.toLowerCase().includes(memory.useCase.toLowerCase())) return true;
  return false;
}

function auditTurn(
  turnNumber: number,
  message: string,
  response: string,
  strategy: ConversationStrategy,
  brainOutput: BrainOutput,
  previousAudits: TurnAudit[],
): TurnAudit {
  const issues: string[] = [];
  const scores: TurnScores = { topicAccuracy: 0, goalAccuracy: 0, contextUsage: 0, agendaProgression: 0, ctaTiming: 0, qualificationTiming: 0 };
  const details: Record<string, unknown> = {};

  if (strategy.topicToAnswer) {
    const answered = detectTopicInResponse(response, strategy.topicToAnswer);
    scores.topicAccuracy = answered ? 1 : 0;
    if (!answered) issues.push(`Did not answer topic: ${strategy.topicToAnswer}`);
    details.topicToAnswer = strategy.topicToAnswer;
    details.topicAnswered = answered;
  } else {
    scores.topicAccuracy = 1;
  }

  const goalMatched = detectGoalInResponse(response, strategy.primaryGoal);
  scores.goalAccuracy = goalMatched ? 1 : 0;
  if (!goalMatched) issues.push(`Response does not match goal: ${strategy.primaryGoal}`);
  details.primaryGoal = strategy.primaryGoal;
  details.goalMatched = goalMatched;

  if (strategy.qualificationQuestion) {
    const asked = detectQualificationInResponse(response);
    scores.qualificationTiming = asked ? 1 : 0;
    if (!asked) issues.push('Required qualification question not found');
    details.qualificationAsked = asked;
  } else {
    scores.qualificationTiming = 1;
  }

  const foundCTA = detectCTAInResponse(response);
  details.foundCTA = foundCTA;
  details.expectedCTATiming = strategy.cta;
  if (strategy.cta === 'none') {
    if (foundCTA) {
      issues.push(`Expected no CTA but found: ${foundCTA}`);
      scores.ctaTiming = 0;
    } else {
      scores.ctaTiming = 1;
    }
  } else if (strategy.cta === 'soft') {
    scores.ctaTiming = foundCTA ? 1 : 0.5;
    if (!foundCTA) issues.push('Expected soft CTA but none found');
  } else if (strategy.cta === 'strong') {
    scores.ctaTiming = foundCTA ? 1 : 0;
    if (!foundCTA) issues.push('Expected strong CTA but none found');
  }

  const completedTopics = strategy.agenda.completedTopics;
  const repeatedCompleted = completedTopics.filter(t => detectTopicInResponse(response, t));
  if (repeatedCompleted.length > 0) {
    issues.push(`Repeated completed topics: ${repeatedCompleted.join(', ')}`);
    details.repeatedCompletedTopics = repeatedCompleted;
  }

  const hasContext = detectContextReference(response, brainOutput.memory);
  scores.contextUsage = hasContext ? 1 : 0.5;
  details.hasContext = hasContext;

  if (turnNumber > 1 && previousAudits.length > 0) {
    const prev = previousAudits[previousAudits.length - 1];
    const prevAgenda = prev.strategy.agenda;
    const currAgenda = strategy.agenda;
    const progressed =
      currAgenda.completedTopics.length > prevAgenda.completedTopics.length ||
      currAgenda.currentTopic !== prevAgenda.currentTopic ||
      currAgenda.upcomingTopics.length < prevAgenda.upcomingTopics.length ||
      strategy.topicToAnswer !== prev.strategy.topicToAnswer;
    let consecutiveStuck = 0;
    for (let i = previousAudits.length - 1; i >= 0; i--) {
      const aPrev = previousAudits[i].strategy.agenda;
      if (aPrev.completedTopics.length === currAgenda.completedTopics.length &&
          aPrev.currentTopic === currAgenda.currentTopic) {
        consecutiveStuck++;
      } else {
        break;
      }
    }
    if (progressed || consecutiveStuck < 3) {
      scores.agendaProgression = 1;
    } else {
      scores.agendaProgression = 0.5;
      issues.push('Agenda did not advance for 3+ turns');
    }
  } else {
    scores.agendaProgression = 1;
  }

  return {
    turnNumber,
    message,
    response,
    strategy,
    brainOutput,
    scores,
    issues,
    details,
  };
}

export function computeAggregate(turns: TurnAudit[]): AggregateScores {
  if (turns.length === 0) {
    return { topicAccuracy: 0, goalAccuracy: 0, contextUsage: 0, agendaProgression: 0, ctaTiming: 0, qualificationTiming: 0, overall: 0 };
  }
  const sum = (key: keyof TurnScores): number => turns.reduce((a, t) => a + t.scores[key], 0) / turns.length;
  const topicAccuracy = sum('topicAccuracy');
  const goalAccuracy = sum('goalAccuracy');
  const contextUsage = sum('contextUsage');
  const agendaProgression = sum('agendaProgression');
  const ctaTiming = sum('ctaTiming');
  const qualificationTiming = sum('qualificationTiming');
  const overall = (topicAccuracy + goalAccuracy + contextUsage + agendaProgression + ctaTiming + qualificationTiming) / 6;
  return { topicAccuracy, goalAccuracy, contextUsage, agendaProgression, ctaTiming, qualificationTiming, overall };
}

export function runReplay(replay: ReplayDef): ConversationAudit {
  let legacyMemory: ConversationIntelligenceMemory = {
    turns: [],
    persona: 'unknown',
    funnelStage: 'greeting',
    buyingIntentDetected: false,
    objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0,
    topics: [],
    ...replay.initialLegacy,
  };

  const turnAudits: TurnAudit[] = [];
  let qualificationCount = 0;
  let reachedTrialOrDemo = false;

  for (let i = 0; i < replay.turns.length; i++) {
    const { message, responseText } = replay.turns[i];
    const brainOutput = processConversationBrain({ message, responseText, legacyMemory });
    const strategy = brainOutput.strategy;
    if (!strategy) {
      throw new Error(`[${replay.name}] No strategy at turn ${i + 1}`);
    }

    const audit = auditTurn(i + 1, message, brainOutput.responseText, strategy, brainOutput, turnAudits);
    turnAudits.push(audit);

    if (strategy.qualificationQuestion) qualificationCount++;

    if (/trial|demo|sign.?up/i.test(brainOutput.responseText)) {
      reachedTrialOrDemo = true;
    }

    legacyMemory = brainOutput.legacyMemory;
  }

  const scores = computeAggregate(turnAudits);

  const allIssues = turnAudits.flatMap(t => t.issues);
  const loopCount = allIssues.filter(i => i.toLowerCase().includes('loop')).length;

  const topicCounts = new Map<string, number>();
  const legacy = legacyMemory as any;
  const explained = legacy.topics || [];
  for (const t of explained) {
    topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
  }
  const repeatedTopics = Array.from(topicCounts.entries())
    .filter(([_, count]) => count > 5)
    .map(([topic]) => topic);

  const deviations = Array.from(new Set(allIssues));
  const compliancePct = Math.round(scores.overall * 10000) / 100;

  return {
    replayName: replay.name,
    turnCount: replay.turns.length,
    turns: turnAudits,
    scores,
    loopCount,
    repeatedTopics,
    repeatedQualifications: qualificationCount,
    reachedTrialOrDemo,
    deviations,
    compliancePct,
  };
}

export function formatReport(audit: ConversationAudit): string {
  const lines: string[] = [];
  lines.push(`=== ${audit.replayName} ===`);
  lines.push(`Turns: ${audit.turnCount}  |  Compliance: ${audit.compliancePct.toFixed(1)}%  |  Loops: ${audit.loopCount}  |  Repeats: ${audit.repeatedTopics.length > 0 ? audit.repeatedTopics.join(', ') : 'none'}`);
  lines.push(`Trial/Demo: ${audit.reachedTrialOrDemo ? 'yes' : 'no'}  |  Qual Questions: ${audit.repeatedQualifications}`);
  lines.push('');
  lines.push(`  Topic Accuracy:       ${(audit.scores.topicAccuracy * 100).toFixed(1)}%`);
  lines.push(`  Goal Accuracy:        ${(audit.scores.goalAccuracy * 100).toFixed(1)}%`);
  lines.push(`  Context Usage:        ${(audit.scores.contextUsage * 100).toFixed(1)}%`);
  lines.push(`  Agenda Progression:   ${(audit.scores.agendaProgression * 100).toFixed(1)}%`);
  lines.push(`  CTA Timing:           ${(audit.scores.ctaTiming * 100).toFixed(1)}%`);
  lines.push(`  Qualification Timing: ${(audit.scores.qualificationTiming * 100).toFixed(1)}%`);
  if (audit.deviations.length > 0) {
    lines.push('');
    lines.push(`Deviations (${audit.deviations.length}):`);
    for (const d of audit.deviations.slice(0, 30)) {
      lines.push(`  ! ${d}`);
    }
    if (audit.deviations.length > 30) lines.push(`  ... and ${audit.deviations.length - 30} more`);
  }
  return lines.join('\n');
}
