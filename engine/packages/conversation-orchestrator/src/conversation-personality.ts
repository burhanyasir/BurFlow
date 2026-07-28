import {
  ConversationMemoryData,
  ConversationGoal,
  CustomerIntent,
  FunnelStageExtended,
  DiscernedTopic,
  ContextSummaryData,
  discernTopics,
  isTopicExplained,
} from './conversation-memory';
import { ConversationIntelligenceResult } from './conversation-intelligence-types';
import { PersonaType, ObjectionCategory } from './types';

export type ToneType = 'helpful' | 'professional' | 'empathic' | 'confident' | 'urgent';

export const OPENINGS_BY_GOAL: Record<string, string[]> = {
  answer_question: [
    'Sure, here is the relevant part.',
    'The way this works is straightforward.',
    'Here is what matters for your situation.',
    'Short version:',
    'What you are asking about comes down to this.',
    'The practical answer is this.',
    'Here is the thing about that.',
    'So the core of it is:',
    'This is one of those details that makes a difference.',
    'The main thing to know is:',
  ],
  handle_objection: [
    'That makes sense, and you are not the first to bring it up.',
    'That is a fair point — here is what I would say to it.',
    'Here is what we have seen with other teams on this.',
    'That is a reasonable thing to wonder about.',
    'Here is the reality on that point.',
    'I have heard that from others too, here is what we found.',
    'Worth digging into that — here is the context.',
    'I get why that comes up. Here is how we think about it.',
    'Fair question. Let me give you the straight answer.',
    'That is a fair point. Here is the other side of it.',
  ],
  build_trust: [
    'That is a smart way to look at it.',
    'You are asking the right questions.',
    'Here is what teams like yours tend to see.',
    'That is exactly the kind of question that separates good setups from great ones.',
    'You are thinking about this the right way.',
    'Here is what we have learned from similar situations.',
    'That is a good instinct — let me confirm it.',
    'From what you are describing, you are on the right track.',
  ],
  qualify: [
    'That helps narrow it down.',
    'Good to know, that changes the picture.',
    'That gives me a much clearer sense of where you are.',
    'Perfect, that is exactly what I needed to understand.',
    'Thanks — that helps me tailor what comes next.',
    'That is useful context for the recommendation.',
    'Got it, that points me in a specific direction.',
    'That tells me a lot about the right fit for you.',
  ],
  advance_funnel: [
    'That aligns with what I was thinking.',
    'Here is how I see it fitting together.',
    'Based on everything so far, here is the picture.',
    'Here is where this usually goes next.',
    'Given what you have shared, my recommendation is.',
    'Here is how I would approach this.',
    'This is the path I see working best for you.',
    'Putting it all together, here is what I would do.',
  ],
  recommend_plan: [
    'Based on your situation,',
    'For what you need,',
    'Looking at your setup,',
    'Given what you have told me,',
    'The plan that fits best is:',
    'For a team like yours,',
    'Here is what I would go with:',
    'Taking everything into account,',
  ],
  close_trial: [
    'You can start in a few minutes.',
    'The quickest way to see it in action is:',
    'Here is how to get going.',
    'Setting it up takes about 10 minutes.',
    'Ready to take it for a spin?',
  ],
  schedule_demo: [
    'Let me check what slots I have.',
    'I can set that up for you now.',
    'We can find a time that works.',
    'Happy to walk through it live.',
  ],
  finish_conversation: [
    'Glad I could help.',
    'I am here whenever you need.',
    'Loop back anytime.',
    'Happy to pick this up later.',
    'You know where to find me.',
    'Good luck with it — I am here if questions come up.',
  ],
  none: [],
};

const EMOTIONAL_CUE_MAP: Array<{ pattern: RegExp; acknowledgment: string }> = [
  { pattern: /\b(expensive|too much|too high|overpriced|pricey|can't afford|budget|steep)\b/i, acknowledgment: 'That is completely fair to ask about.' },
  { pattern: /\b(don't like|hate|terrible|awful|worst|bad experience|frustrat|annoying|useless)\b/i, acknowledgment: 'I appreciate you being straight with me.' },
  { pattern: /\b(interesting|cool|nice|great|awesome|love|amazing|impress)\b/i, acknowledgment: '' },  // handled inline
  { pattern: /\b(confus\w*|unclear|don't understand|complicated|complex|hard to follow)\b/i, acknowledgment: 'Let me rephrase that more clearly.' },
  { pattern: /\b(scared|worried|nervous|hesitant|unsure|uncertain|doubt)\b/i, acknowledgment: 'No pressure at all — this is just exploratory.' },
  { pattern: /\b(waste|not worth|overkill|too much for us|don't need)\b/i, acknowledgment: 'I appreciate you being direct about that.' },
  { pattern: /\b(trust|secure|safe|privacy|data|compliance|soc)/i, acknowledgment: '' },  // handled inline
  { pattern: /\b(competitor|using.*instead|switching|other.*option|alternative)/i, acknowledgment: 'Good to know what you are comparing against.' },
];

const EMOTIONAL_DIRECT_ACK: Array<{ pattern: RegExp; response: string }> = [
  { pattern: /^really\??$/i, response: '' },  // deep-dive via processConversationBrain
  { pattern: /^why\??$/i, response: '' },  // deep-dive via processConversationBrain  
  { pattern: /^how\??$/i, response: '' },  // deep-dive via processConversationBrain
  { pattern: /^cool$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^interesting$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^hmm$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^(ok|okay)$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^sure$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^maybe$/i, response: 'No rush. Anything I can clarify to help you decide?' },
  { pattern: /^(yes|yeah|yep)$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^(no|nah|nope)$/i, response: 'Fair enough. What would work better for you?' },
  { pattern: /^thx$/i, response: 'Glad that helped. Anything else on your mind?' },
  { pattern: /^got it$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^makes sense$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^i see$/i, response: '' },  // deep-dive via contextualizeShortReply
  { pattern: /^alright$/i, response: 'What is next?' },
];

const OFF_TOPIC_REDIRECTS: Record<string, string> = {
  football: "I would not be much help there. What challenge are you trying to solve with AI-powered support?",
  soccer: "I would not be much help there. What challenge are you trying to solve with AI-powered support?",
  sports: "I am not much of a sports analyst. Mind if we get back to your support setup?",
  weather: "I wish I could control the weather. What can I help you with on the support side?",
  politics: "I stay out of that one. How can I help with your support workflow?",
  quantum: "I will leave that to the physicists. What support challenges are you looking at?",
  'quantum computing': "I will leave that to the physicists. What support challenges are you looking at?",
  cooking: "I am better with code than cooking. What can I help you with?",
  music: "I am more of a text-based person. What can I help you explore?",
};

const BETTER_ENDINGS: Record<string, { response: string; finalCTA?: string }> = {
  'all the information i need': { response: 'Glad that covered everything. The trial is open whenever you are ready.', finalCTA: 'start_free_trial' },
  'answers my questions': { response: 'Good, glad that cleared things up. If you want to try it, you can start a free trial anytime.', finalCTA: 'start_free_trial' },
  'good for now': { response: 'No problem — I am here when you need me.', finalCTA: undefined },
  bye: { response: 'Take care. Message me anytime.', finalCTA: undefined },
  goodbye: { response: 'Take care. Message me anytime.', finalCTA: undefined },
  'talk later': { response: 'Sounds good. I will be here.', finalCTA: undefined },
  'catch you': { response: 'Sounds good. I will be here.', finalCTA: undefined },
  'think about it': { response: 'No rush. Take your time and loop back when you are ready.', finalCTA: 'contact_sales' },
  "i'll think about it": { response: 'No rush. Take your time and loop back when you are ready.', finalCTA: 'contact_sales' },
  'not now': { response: 'No pressure. If your situation changes, I am just a message away.', finalCTA: undefined },
  'not interested': { response: 'Understood. If you ever want to revisit the conversation, I will be here.', finalCTA: undefined },
};

const PLAN_RECOMMENDATIONS: Record<PersonaType, (mem: ConversationMemoryData) => { plan: string; explanation: string }> = {
  enterprise: (mem) => {
    const details: string[] = [];
    if (mem.companySize && parseInt(mem.companySize) > 1000) details.push(`a team of ${mem.companySize}`);
    if (mem.industry) details.push(`your ${mem.industry}`);
    if (mem.monthlyConversations && parseInt(mem.monthlyConversations) > 10000) details.push('your volume');
    if (mem.currentHelpdesk) details.push(`your ${mem.currentHelpdesk} setup`);
    const prefix = details.length > 0 ? `With ${details.join(', ')}` : 'From what you have shared';
    return { plan: 'Enterprise', explanation: `${prefix}, Enterprise makes the most sense.` };
  },
  developer: (mem) => {
    const details: string[] = [];
    if (mem.useCase) details.push(`your ${mem.useCase} use case`);
    if (mem.industry) details.push(`${mem.industry}`);
    if (mem.currentHelpdesk) details.push(`your ${mem.currentHelpdesk} setup`);
    const prefix = details.length > 0 ? `Given ${details.join(', ')}` : 'Based on what you described';
    return { plan: 'Professional', explanation: `${prefix}, Professional would be a good fit.` };
  },
  agency: (mem) => {
    const details: string[] = [];
    if (mem.companySize) details.push(`a team of ${mem.companySize}`);
    if (mem.industry) details.push(`${mem.industry} focus`);
    const prefix = details.length > 0 ? `For ${details.join(', ')}` : 'For agency needs';
    return { plan: 'Agency Partner', explanation: `${prefix}, our Partner Program is the way to go.` };
  },
  ecommerce: (mem) => {
    const details: string[] = [];
    if (mem.companySize) details.push(`${mem.companySize} people on the team`);
    if (mem.industry) details.push(`${mem.industry}`);
    if (mem.monthlyConversations) details.push(`handling ${mem.monthlyConversations} conversations a month`);
    const prefix = details.length > 0 ? `With ${details.join(', ')}` : 'For ecommerce';
    return { plan: 'Professional', explanation: `${prefix}, Professional should work well.` };
  },
  support_manager: (mem) => {
    const details: string[] = [];
    if (mem.monthlyConversations && parseInt(mem.monthlyConversations) > 10000) {
      if (mem.industry) details.push(`${mem.industry} volume of ${mem.monthlyConversations}`);
      return { plan: 'Enterprise', explanation: `At that volume${details.length > 0 ? ' with ' + details.join(', ') : ''}, Enterprise gives you the best value.` };
    }
    if (mem.companySize) details.push(`a team of ${mem.companySize}`);
    if (mem.currentHelpdesk) details.push(`${mem.currentHelpdesk}`);
    const prefix = details.length > 0 ? `For ${details.join(', ')}` : 'Based on your needs';
    return { plan: 'Professional', explanation: `${prefix}, Professional is a solid choice.` };
  },
  startup: (mem) => {
    const details: string[] = [];
    if (mem.useCase) details.push(`your ${mem.useCase} needs`);
    if (mem.industry) details.push(`${mem.industry}`);
    const prefix = details.length > 0 ? `For ${details.join(', ')}` : 'At your stage';
    return { plan: 'Starter', explanation: `${prefix}, Starter is a great way to get going.` };
  },
  small_business: (mem) => {
    const details: string[] = [];
    if (mem.industry) details.push(`a ${mem.industry} business`);
    if (mem.useCase) details.push(`your ${mem.useCase} needs`);
    const prefix = details.length > 0 ? `For ${details.join(', ')}` : 'Based on your situation';
    return { plan: 'Professional', explanation: `${prefix}, Professional seems right.` };
  },
  existing_customer: (mem) => {
    const details: string[] = [];
    if (mem.companySize && parseInt(mem.companySize) > 500) details.push(`a growing team of ${mem.companySize}`);
    if (mem.industry) details.push(`${mem.industry} expansion`);
    const prefix = details.length > 0 ? `With ${details.join(', ')}` : 'As you grow';
    return { plan: 'Enterprise', explanation: `${prefix}, upgrading to Enterprise unlocks more value.` };
  },
  unknown: (mem) => {
    const details: string[] = [];
    if (mem.companySize) details.push(`a team of ${mem.companySize}`);
    if (mem.industry) details.push(`in ${mem.industry}`);
    if (mem.monthlyConversations) details.push(`${mem.monthlyConversations} conversations`);
    const prefix = details.length > 0 ? `With ${details.join(', ')}` : 'Based on what you have shared';
    return { plan: 'Professional', explanation: `${prefix}, Professional is probably the best start.` };
  },
};

const SMART_FOLLOW_UPS: Record<string, Array<{ condition: (mem: ConversationMemoryData, ci: ConversationIntelligenceResult) => boolean; question: string }>> = {
  pricing: [
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.companySize,
      question: 'How many people would be using it? That is the main pricing factor.',
    },
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.currentHelpdesk,
      question: 'Do you have a helpdesk or support tool already?',
    },
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.monthlyConversations,
      question: 'About how many support conversations do you handle per month?',
    },
    {
      condition: () => true,
      question: 'Want me to walk through which tier fits your situation?',
    },
  ],
  security: [
    {
      condition: (mem) => mem.persona === 'enterprise' || (!!mem.companySize && parseInt(mem.companySize || '0') > 500),
      question: 'Do you need to go through a formal vendor security review?',
    },
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.industry,
      question: 'What sector are you in? Compliance requirements vary quite a bit.',
    },
    {
      condition: () => true,
      question: 'I can share our security docs — are there specific certifications you need?',
    },
  ],
  developer: [
    {
      condition: () => true,
      question: 'Would this plug into your current API or are you building something new?',
    },
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.useCase,
      question: 'What kind of integration are you building? I can point you to the relevant docs.',
    },
  ],
  features: [
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.companySize,
      question: 'How large is the team that would use it?',
    },
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.currentHelpdesk,
      question: 'What tools are you using today? I can highlight how we fit in.',
    },
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.monthlyConversations,
      question: 'How many support conversations come through in a typical month?',
    },
    {
      condition: () => true,
      question: 'Do you want me to show how it works in practice?',
    },
  ],
  founder: [
    {
      condition: () => true,
      question: 'What is the biggest support challenge you are dealing with right now?',
    },
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.companySize,
      question: 'How big is the support team?',
    },
  ],
  integrations: [
    {
      condition: () => true,
      question: 'What platforms does your team rely on day to day?',
    },
    {
      condition: (mem) => !mem.qualificationCollected.completed && !mem.currentHelpdesk,
      question: 'What is in your current stack? I can check compatibility on the spot.',
    },
  ],
  setup: [
    {
      condition: () => true,
      question: 'Want me to walk you through the setup step by step?',
    },
  ],
};

export function getOpening(goal: ConversationGoal, memory: ConversationMemoryData): string | null {
  const openings = OPENINGS_BY_GOAL[goal];
  if (!openings || openings.length === 0) return null;

  const available = openings.filter(o => !memory.usedOpenings.includes(o));
  if (available.length === 0) return null;

  const choice = available[Math.floor(Math.random() * available.length)];
  memory.usedOpenings.push(choice);
  if (memory.usedOpenings.length > 20) memory.usedOpenings.shift();
  return choice;
}

export function detectEmotionalCue(message: string): string | null {
  for (const entry of EMOTIONAL_CUE_MAP) {
    if (entry.pattern.test(message)) return entry.acknowledgment;
  }
  return null;
}

export function handleShortReply(message: string): string | null {
  const trimmed = message.trim();
  for (const entry of EMOTIONAL_DIRECT_ACK) {
    if (entry.pattern.test(trimmed)) return entry.response;
  }
  return null;
}

export function isOffTopic(message: string): string | null {
  const lower = message.toLowerCase().trim();
  for (const [key, redirect] of Object.entries(OFF_TOPIC_REDIRECTS)) {
    if (lower.includes(key)) return redirect;
  }

  const offTopicPatterns = [
    /(\bfootball\b|\bsoccer\b|\bsports\b|\bweather\b|\bpolitics\b|\belection\b|\bmovie\b|\btv show\b|\bgaming\b)/i,
    /(\bquantum\b|\bcooking\b|\bmusic\b|\bart\b|\btravel\b|\bfashion\b|\bcelebrity\b)/i,
  ];
  for (const pat of offTopicPatterns) {
    if (pat.test(message)) {
      return "Interesting topic. To get back on track, what challenge are you trying to solve with AI support?";
    }
  }

  return null;
}

export function handleBetterEnding(message: string): { response: string; finalCTA?: string } | null {
  const lower = message.toLowerCase().trim();
  for (const [key, value] of Object.entries(BETTER_ENDINGS)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(lower)) return value;
  }
  return null;
}

export function getSmartFollowUp(message: string, memory: ConversationMemoryData, ci: ConversationIntelligenceResult): string | null {
  const lower = message.toLowerCase();

  const personaFollowUps = SMART_FOLLOW_UPS['founder'];
  if (/\b(founder|ceo|cto|owner|co-founder|cofounder)\b/i.test(lower)) {
    for (const fu of personaFollowUps) {
      if (fu.condition(memory, ci)) return fu.question;
    }
  }

  const explained = memory.topicsExplained.map(t => t.topic);
  for (const topic of explained) {
    const followUps = SMART_FOLLOW_UPS[topic];
    if (!followUps) continue;
    for (const fu of followUps) {
      if (fu.condition(memory, ci)) {
        const alreadyAsked = memory.questionsAnswered.some(q => q.includes(fu.question.slice(0, 20)));
        if (!alreadyAsked) {
          memory.questionsAnswered.push(fu.question);
          return fu.question;
        }
      }
    }
  }

  return null;
}

export function buildContextSummary(memory: ConversationMemoryData, ci: ConversationIntelligenceResult): ContextSummaryData {
  const keyTopics = memory.topicsExplained.map(t => t.topic);
  return {
    lastUpdatedAtTurn: memory.turnCount,
    persona: memory.persona,
    companySize: memory.companySize,
    industry: memory.industry,
    needsSoc2: isTopicExplained(memory, 'soc2') || isTopicExplained(memory, 'security'),
    interestInPricing: isTopicExplained(memory, 'pricing'),
    currentHelpdesk: memory.currentHelpdesk,
    buyingIntent: memory.buyingIntentDetected ? 'high' : memory.turnCount > 5 ? 'medium' : 'low',
    keyTopics,
    objections: [...memory.objectionsHandled],
    missingQualification: [],
  };
}

export function recommendPlan(memory: ConversationMemoryData): { plan: string; explanation: string } {
  const recommender = PLAN_RECOMMENDATIONS[memory.persona] || PLAN_RECOMMENDATIONS.unknown;
  return recommender(memory);
}

export function enforceContinuity(response: string, memory: ConversationMemoryData, newTopics: DiscernedTopic[]): string {
  if (memory.currentTopic && newTopics.length > 0) {
    const currentTopic = memory.currentTopic;
    const topicChange = newTopics.find(t => t !== currentTopic);
    if (topicChange && memory.turns.length >= 2) {
      const lastUserMsg = memory.turns[memory.turns.length - 1]?.message.toLowerCase() || '';
      const userChangedTopic = discernTopics(lastUserMsg).some(t => t !== currentTopic);
      if (!userChangedTopic && memory.turnCount > 1) {
        const bridges = [
          `One more thing on ${currentTopic} before we get to ${topicChange}. `,
          `Let me finish this point about ${currentTopic} first — then we can cover ${topicChange}. `,
          `${topicChange} is a natural next step. Let me just wrap up on ${currentTopic} quickly. `,
        ];
        const bridge = bridges[memory.turnCount % bridges.length];
        return bridge + response;
      }
    }
  }
  return response;
}

export function getPersonalityPrefix(tone: 'casual' | 'professional' | 'empathic' | 'urgent', goal: ConversationGoal): string {
  if (goal === 'finish_conversation') return '';
  if (goal === 'handle_objection' && tone === 'empathic') return '';
  if (goal === 'build_trust') return '';

  const prefixes: Record<string, string[]> = {
    professional: ['', ''],
    casual: ['', ''],
    empathic: ['', ''],
    urgent: ['', ''],
  };

  const pool = prefixes[tone] || [''];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateContextReference(memory: ConversationMemoryData): string | null {
  if (memory.turnCount < 8 || memory.turnCount % 5 !== 0) return null;

  const parts: string[] = [];
  if (memory.persona !== 'unknown') parts.push(`So you are a ${memory.persona.replace('_', ' ')}`);
  if (memory.companySize) parts.push(`with a team of about ${memory.companySize}`);
  if (memory.industry) parts.push(`in the ${memory.industry} space`);
  if (isTopicExplained(memory, 'soc2') || isTopicExplained(memory, 'security')) parts.push('looking for SOC 2 compliance');
  if (memory.currentHelpdesk) parts.push(`currently using ${memory.currentHelpdesk}`);
  if (memory.objectionsHandled.includes('price')) parts.push('with some budget considerations');
  if (memory.buyingIntentDetected) parts.push('and actively evaluating solutions');

  if (parts.length === 0) return null;

  return `Just to make sure I am on the same page — ${parts.join(', ')}.`;
}

const INDUSTRY_PATTERNS: Array<{ pattern: RegExp; industry: string; context: string }> = [
  { pattern: /\bshopify\b/i, industry: 'ecommerce', context: 'your Shopify store' },
  { pattern: /\becommerce\b|\bonline.store\b|\bretail\b|\bshop\b/i, industry: 'ecommerce', context: 'your ecommerce business' },
  { pattern: /\bdentist\b|\bdental\b|\boral.surgery\b/i, industry: 'healthcare', context: 'your dental practice' },
  { pattern: /\bhealthcare\b|\bmedical\b|\bhospital\b|\bclinic\b|\bdoctor\b|\bpatient\b/i, industry: 'healthcare', context: 'your healthcare organization' },
  { pattern: /\blegal\b|\blawyer\b|\blattorney\b|\blaw.firm\b/i, industry: 'legal', context: 'your legal practice' },
  { pattern: /\brestaurant\b|\bcafe\b|\bbar\b|\bfood.truck\b|\bmenu\b/i, industry: 'hospitality', context: 'your restaurant' },
  { pattern: /\bsaas\b|\bsoftware.as.a.service\b/i, industry: 'saas', context: 'your SaaS business' },
  { pattern: /\binternal.*(knowledge|wiki|doc)\b|\bcompany.*doc\b|\bemployee.*handbook\b/i, industry: 'internal_kb', context: 'your internal knowledge base' },
  { pattern: /\bagency\b|\bdigital.*agency\b|\bmarketing.*agency\b/i, industry: 'agency', context: 'your agency' },
  { pattern: /\bstartup\b|\bstart.up\b/i, industry: 'startup', context: 'your startup' },
  { pattern: /\bdeveloper\b|\bdev\b|\bengineering\b|\bapi\b|\bsdk\b|\bcode\b/i, industry: 'technology', context: 'your development team' },
];

const INDUSTRY_SPECIFIC_RESPONSES: Record<string, Array<{ pattern: RegExp; response: string }>> = {
  ecommerce: [
    { pattern: /\bshopify\b/i, response: 'If you are on Shopify, it connects directly to your product catalog and order data. ' },
    { pattern: /\bproduct\b|\border\b|\breturn\b|\bshipping\b/i, response: 'For ecommerce, it handles product questions, order status, returns, and shipping inquiries on their own. ' },
    { pattern: /.*/, response: 'For ecommerce, it handles the common questions customers ask — products, orders, shipping. ' },
  ],
  healthcare: [
    { pattern: /\bpatient\b|\bappointment\b/i, response: 'In healthcare, it manages patient inquiries, appointment scheduling, and insurance questions. ' },
    { pattern: /.*/, response: 'For healthcare, it helps patients find answers about services, insurance, and appointments. ' },
  ],
  legal: [
    { pattern: /\bclient\b|\bcourt\b/i, response: 'For law firms, it handles client intake, case status questions, and document requests. ' },
    { pattern: /.*/, response: 'For legal practices, it takes care of client questions about case status, billing, and consultations. ' },
  ],
  hospitality: [
    { pattern: /\bmenu\b|\breservation\b/i, response: 'For restaurants, it handles menu questions, reservations, and common customer inquiries. ' },
    { pattern: /.*/, response: 'For hospitality, it answers questions about menus, hours, and reservations. ' },
  ],
  internal_kb: [
    { pattern: /\bemployee\b|\bpolicy\b|\bhandbook\b/i, response: 'For internal knowledge bases, employees can find company policies, procedures, and docs instantly. ' },
    { pattern: /.*/, response: 'For an internal knowledge base, it indexes your company docs so employees get answers in seconds. ' },
  ],
  saas: [
    { pattern: /\bdoc\b|\bapi\b|\bintegrat\b/i, response: 'For SaaS, it helps users find documentation, API references, and troubleshooting guides on their own. ' },
    { pattern: /.*/, response: 'For SaaS businesses, it deflects support tickets by answering product and billing questions automatically. ' },
  ],
  technology: [
    { pattern: /\bapi\b|\bsdk\b/i, response: 'For developers, the API and SDK make it easy to embed AI search into your product. ' },
    { pattern: /.*/, response: 'For technical teams, it integrates with your existing documentation and codebase. ' },
  ],
};

export function detectIndustry(message: string, memory: ConversationMemoryData): { industry: string | null; context: string | null } {
  const lower = message.toLowerCase();

  if (memory.industry) {
    const industryContexts: Record<string, string> = {
      ecommerce: 'your ecommerce business',
      healthcare: 'your healthcare organization',
      legal: 'your legal practice',
      hospitality: 'your restaurant',
      internal_kb: 'your internal knowledge base',
      saas: 'your SaaS business',
      agency: 'your agency',
      startup: 'your startup',
      technology: 'your development team',
    };
    return { industry: memory.industry, context: industryContexts[memory.industry] || null };
  }

  for (const entry of INDUSTRY_PATTERNS) {
    if (entry.pattern.test(lower)) {
      return { industry: entry.industry, context: entry.context };
    }
  }

  return { industry: null, context: null };
}

export function adaptResponseToContext(response: string, memory: ConversationMemoryData): string {
  const industry = memory.industry;
  if (!industry) return response;

  const responses = INDUSTRY_SPECIFIC_RESPONSES[industry];
  if (!responses) return response;

  for (const entry of responses) {
    if (entry.pattern.test(response)) {
      const lowerResponse = response.toLowerCase();
      const alreadyInjected = responses.some(r => lowerResponse.includes(r.response.slice(0, 20).toLowerCase()));
      if (!alreadyInjected) {
        return `${entry.response} ${response}`;
      }
      break;
    }
  }

  return response;
}

function contextualizeTopicAck(lastTopic: string | undefined, memory: ConversationMemoryData): string | null {
  if (!lastTopic) return null;
  const topicAcks: Record<string, string> = {
    pricing: 'Want to compare the plans side by side, or see which one fits your volume best?',
    features: 'There is more here — the automation engine and analytics are worth a closer look.',
    security: 'We can go deeper on the encryption side or compliance certs — whichever matters more for you.',
    integrations: 'What tools does your team rely on daily? Happy to check what we connect with.',
    api: 'Do you want to see the key endpoints, or look at SDK examples in a specific language?',
    developer: 'I can share SDK examples — JavaScript, Python, or Go, whichever works best.',
    trial: 'Ready to try it? The setup takes about 10 minutes.',
  };
  const response = topicAcks[lastTopic];
  if (response) return response;
  if (memory.lastGoal === 'qualify' && !memory.qualificationCollected.completed) {
    return 'To help find the right fit, ';
  }
  return 'There is more to explore there — want to go deeper?';
}

export function contextualizeShortReply(message: string, memory: ConversationMemoryData): string | null {
  const trimmed = message.trim().toLowerCase();

  const lastTopic = memory.currentTopic;
  const topicDeepens: Record<string, string[]> = {
    pricing: [
      'The plans are structured to scale with your team — the per-agent pricing comes down quite a bit at higher volumes.',
      'The main difference between tiers is the advanced analytics and custom roles.',
      'Most teams find that Professional hits the sweet spot between features and cost.',
    ],
    features: [
      'One capability that makes the biggest difference is the workflow automation engine.',
      'Where teams get the most value is the real-time analytics — seeing exactly where tickets slow down.',
      'The integration side is worth a closer look — it connects directly to your existing tools.',
    ],
    security: [
      'The SOC 2 audit covers more than just encryption — it looks at access controls, incident response, and vendor management.',
      'For most teams, the RBAC and audit logging are the features that come up most in security reviews.',
      'Enterprise deployments usually want to go deeper on data residency and VPC deployment options.',
    ],
    integrations: [
      'The bi-directional sync is what makes it different from a one-way integration.',
      'Most teams start with Slack and their CRM — the rest come as needs grow.',
      'Custom webhooks give you the flexibility to connect almost anything.',
    ],
    api: [
      'The GraphQL endpoint is worth a look if you are building custom dashboards.',
      'Rate limits are generous — 1000 requests per minute on Professional.',
      'SDKs are available for JavaScript, Python, Go, and Ruby.',
    ],
  };

  if (/^(ok|okay|sure)$/.test(trimmed) && memory.turnCount > 1) {
    if (lastTopic && topicDeepens[lastTopic]) {
      return topicDeepens[lastTopic][memory.turnCount % topicDeepens[lastTopic].length];
    }
    if (memory.lastGoal === 'qualify' && !memory.qualificationCollected.completed) {
      return 'To help find the right fit, ';
    }
    if (memory.turnCount > 2) {
      const allTopics: DiscernedTopic[] = ['features', 'pricing', 'security', 'integrations', 'api', 'roi', 'demo', 'trial', 'comparison'];
      const unmentioned = allTopics.filter(t => !isTopicExplained(memory, t));
      if (unmentioned.length > 0) {
        return `Worth looking at ${unmentioned[0]} too — it usually comes up. Want to go there?`;
      }
      return 'Want me to walk through how it works?';
    }
    return 'What would you like to explore next?';
  }

  if (/^(yes|yeah|yep)$/.test(trimmed) && memory.turnCount > 1) {
    const allTopics: DiscernedTopic[] = ['features', 'pricing', 'security', 'integrations', 'api', 'roi', 'demo', 'trial', 'comparison'];
    const unmentioned = allTopics.filter(t => !isTopicExplained(memory, t));
    if (unmentioned.length > 0) {
      return `Great. Worth looking at ${unmentioned[0]} too. Want to go there?`;
    }
    return 'Anything else you want to explore?';
  }

  if (/^really\??$/.test(trimmed) && memory.turnCount > 1) {
    if (lastTopic && topicDeepens[lastTopic]) {
      return topicDeepens[lastTopic][(memory.turnCount + 1) % topicDeepens[lastTopic].length];
    }
    return null;
  }

  if (/^why\??$/.test(trimmed) && memory.turnCount > 1) {
    if (lastTopic && topicDeepens[lastTopic]) {
      return 'The main reason — ' + topicDeepens[lastTopic][(memory.turnCount + 2) % topicDeepens[lastTopic].length];
    }
    return null;
  }

  if (/^how\??$/.test(trimmed) && memory.turnCount > 1) {
    if (lastTopic && topicDeepens[lastTopic]) {
      return 'Here is how it works — ' + topicDeepens[lastTopic][(memory.turnCount + 3) % topicDeepens[lastTopic].length];
    }
    return null;
  }

  if (memory.turnCount > 1) {
    const vagueDeepens: Record<string, string> = {
      hmm: 'Another way to look at it — ',
      interesting: 'There is more to it. ',
      cool: 'There is a lot more to it, actually. ',
      nice: 'There is a lot more to it, actually. ',
      awesome: 'There is a lot more to it, actually. ',
      'i see': 'Here is another layer to that. ',
      'got it': 'Here is another layer to that. ',
      'makes sense': 'Here is another layer to that. ',
      understand: 'Here is another layer to that. ',
      understood: 'Here is another layer to that. ',
      oh: 'One more thing — ',
      'oh ok': 'One more thing — ',
      'oh okay': 'One more thing — ',
    };
    for (const [pattern, response] of Object.entries(vagueDeepens)) {
      if (trimmed === pattern || trimmed.startsWith(pattern)) {
        if (lastTopic && topicDeepens[lastTopic]) {
          return response + topicDeepens[lastTopic][memory.turnCount % topicDeepens[lastTopic].length];
        }
        return response + 'One reason this matters is the impact it has on day-to-day operations.';
      }
    }
  }

  return null;
}

export function handleMidConversationGreeting(memory: ConversationMemoryData): string | null {
  if (memory.turnCount <= 1) return null;

  const lastTopic = memory.currentTopic;
  if (lastTopic) {
    const topicLabels: Record<string, string> = {
      pricing: 'Good to see you again. We were talking about pricing — want to pick up there or switch to something else?',
      features: 'Hey, welcome back. We were looking at features — want to continue where we left off?',
      security: 'Welcome back. We were on the security topic — happy to go deeper there or move to something else.',
      integrations: 'Good to see you again. We were discussing integrations — want to keep going?',
    };
    return topicLabels[lastTopic] || 'Welcome back. How can I help?';
  }

  const lastGoal = memory.lastGoal;
  if (lastGoal === 'qualify') return 'Welcome back. I was hoping to learn a bit more about your setup to find the right plan.';
  if (lastGoal === 'handle_objection') return 'Welcome back. Happy to keep addressing your questions.';
  if (lastGoal === 'close_trial') return 'Welcome back. Ready to get the trial going?';

  return 'Welcome back. What would you like to explore?';
}
