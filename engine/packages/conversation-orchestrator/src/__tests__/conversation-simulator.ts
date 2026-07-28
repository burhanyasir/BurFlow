import { processConversationBrain, BrainOutput } from '../conversation-brain';
import { ConversationIntelligenceMemory } from '../conversation-intelligence-types';
import { DiscernedTopic, ConversationGoal, discernTopics, FunnelStageExtended } from '../conversation-memory';
import { ConversationStrategy } from '../conversation-director';
import { PersonaType, ObjectionCategory, CTAType } from '../types';

export interface PersonaConfig {
  name: string;
  personaType: PersonaType;
  traits: {
    patience: number;
    technicalKnowledge: number;
    budgetSensitivity: number;
    urgency: number;
    buyingIntent: number;
    skepticism: number;
    qualificationWillingness: number;
    conversationLength: number;
    objectionProbability: number;
    topicChangeProbability: number;
    shortReplyProbability: number;
    offTopicProbability: number;
    competitorComparisonProbability: number;
    humanRequestProbability: number;
  };
  industry?: string;
  companySize?: string;
  useCase?: string;
  monthlyConversations?: string;
  currentHelpdesk?: string;
  budget?: string;
  decisionTimeline?: string;
  initialMessage: string;
}

export const PERSONAS: PersonaConfig[] = [
  {
    name: 'Small Business Owner',
    personaType: 'small_business',
    traits: { patience: 0.6, technicalKnowledge: 0.3, budgetSensitivity: 0.8, urgency: 0.5, buyingIntent: 0.5, skepticism: 0.4, qualificationWillingness: 0.6, conversationLength: 10, objectionProbability: 0.3, topicChangeProbability: 0.2, shortReplyProbability: 0.25, offTopicProbability: 0.1, competitorComparisonProbability: 0.2, humanRequestProbability: 0.15 },
    industry: 'retail', companySize: '5', useCase: 'customer support automation', monthlyConversations: '500', budget: '100-200',
    initialMessage: 'Hi, I run a small business and need help managing customer support.',
  },
  {
    name: 'Shopify Merchant',
    personaType: 'ecommerce',
    traits: { patience: 0.5, technicalKnowledge: 0.4, budgetSensitivity: 0.6, urgency: 0.7, buyingIntent: 0.7, skepticism: 0.3, qualificationWillingness: 0.7, conversationLength: 14, objectionProbability: 0.25, topicChangeProbability: 0.25, shortReplyProbability: 0.2, offTopicProbability: 0.08, competitorComparisonProbability: 0.25, humanRequestProbability: 0.1 },
    industry: 'ecommerce', companySize: '10', useCase: 'Shopify order support', monthlyConversations: '3000', budget: '200-300',
    initialMessage: 'Hi, I have a Shopify store and need help with customer support automation.',
  },
  {
    name: 'SaaS Founder',
    personaType: 'startup',
    traits: { patience: 0.4, technicalKnowledge: 0.8, budgetSensitivity: 0.5, urgency: 0.8, buyingIntent: 0.6, skepticism: 0.5, qualificationWillingness: 0.5, conversationLength: 14, objectionProbability: 0.3, topicChangeProbability: 0.3, shortReplyProbability: 0.15, offTopicProbability: 0.05, competitorComparisonProbability: 0.3, humanRequestProbability: 0.05 },
    industry: 'saas', companySize: '8', useCase: 'customer support for SaaS platform', monthlyConversations: '2000', budget: '200-500',
    initialMessage: 'Hey, I am building a SaaS product and exploring support automation.',
  },
  {
    name: 'Enterprise IT Manager',
    personaType: 'enterprise',
    traits: { patience: 0.7, technicalKnowledge: 0.7, budgetSensitivity: 0.3, urgency: 0.5, buyingIntent: 0.8, skepticism: 0.6, qualificationWillingness: 0.8, conversationLength: 20, objectionProbability: 0.4, topicChangeProbability: 0.2, shortReplyProbability: 0.1, offTopicProbability: 0.02, competitorComparisonProbability: 0.3, humanRequestProbability: 0.2 },
    industry: 'enterprise software', companySize: '5000', useCase: 'enterprise support solution evaluation', monthlyConversations: '50000', currentHelpdesk: 'Zendesk', budget: '5000+', decisionTimeline: '3 months',
    initialMessage: 'Hello, I am evaluating support solutions for our enterprise organization.',
  },
  {
    name: 'Customer Support Manager',
    personaType: 'support_manager',
    traits: { patience: 0.5, technicalKnowledge: 0.6, budgetSensitivity: 0.5, urgency: 0.7, buyingIntent: 0.6, skepticism: 0.4, qualificationWillingness: 0.6, conversationLength: 14, objectionProbability: 0.2, topicChangeProbability: 0.2, shortReplyProbability: 0.15, offTopicProbability: 0.05, competitorComparisonProbability: 0.2, humanRequestProbability: 0.1 },
    industry: 'technology', companySize: '200', useCase: 'improving support team efficiency', monthlyConversations: '10000', currentHelpdesk: 'Intercom',
    initialMessage: 'Hi, I manage a support team and we need better automation.',
  },
  {
    name: 'Developer',
    personaType: 'developer',
    traits: { patience: 0.3, technicalKnowledge: 0.95, budgetSensitivity: 0.4, urgency: 0.6, buyingIntent: 0.4, skepticism: 0.7, qualificationWillingness: 0.3, conversationLength: 10, objectionProbability: 0.35, topicChangeProbability: 0.3, shortReplyProbability: 0.2, offTopicProbability: 0.05, competitorComparisonProbability: 0.25, humanRequestProbability: 0.05 },
    industry: 'technology', companySize: '50', useCase: 'API integration for existing product',
    initialMessage: 'Hey, I want to check out your API and see if it fits our stack.',
  },
  {
    name: 'Agency Owner',
    personaType: 'agency',
    traits: { patience: 0.5, technicalKnowledge: 0.5, budgetSensitivity: 0.6, urgency: 0.6, buyingIntent: 0.5, skepticism: 0.5, qualificationWillingness: 0.5, conversationLength: 12, objectionProbability: 0.25, topicChangeProbability: 0.2, shortReplyProbability: 0.2, offTopicProbability: 0.1, competitorComparisonProbability: 0.2, humanRequestProbability: 0.15 },
    industry: 'digital agency', companySize: '20', useCase: 'white label support for clients',
    initialMessage: 'Hi, I own a digital agency and looking for white label support options.',
  },
  {
    name: 'Healthcare Clinic',
    personaType: 'small_business',
    traits: { patience: 0.6, technicalKnowledge: 0.3, budgetSensitivity: 0.6, urgency: 0.6, buyingIntent: 0.5, skepticism: 0.5, qualificationWillingness: 0.7, conversationLength: 12, objectionProbability: 0.3, topicChangeProbability: 0.15, shortReplyProbability: 0.2, offTopicProbability: 0.05, competitorComparisonProbability: 0.15, humanRequestProbability: 0.15 },
    industry: 'healthcare', companySize: '15', useCase: 'patient appointment and intake automation', monthlyConversations: '1000', budget: '200-400',
    initialMessage: 'Hello, we are a dental clinic looking for patient support automation.',
  },
  {
    name: 'Restaurant Owner',
    personaType: 'small_business',
    traits: { patience: 0.4, technicalKnowledge: 0.2, budgetSensitivity: 0.8, urgency: 0.6, buyingIntent: 0.4, skepticism: 0.5, qualificationWillingness: 0.5, conversationLength: 10, objectionProbability: 0.3, topicChangeProbability: 0.2, shortReplyProbability: 0.3, offTopicProbability: 0.1, competitorComparisonProbability: 0.15, humanRequestProbability: 0.2 },
    industry: 'hospitality', companySize: '3', useCase: 'customer inquiry and reservation management', monthlyConversations: '500', budget: '50-100',
    initialMessage: 'Hi, I own a restaurant and need help with customer questions and reservations.',
  },
  {
    name: 'Legal Firm',
    personaType: 'enterprise',
    traits: { patience: 0.7, technicalKnowledge: 0.3, budgetSensitivity: 0.4, urgency: 0.5, buyingIntent: 0.6, skepticism: 0.6, qualificationWillingness: 0.7, conversationLength: 12, objectionProbability: 0.35, topicChangeProbability: 0.15, shortReplyProbability: 0.15, offTopicProbability: 0.05, competitorComparisonProbability: 0.2, humanRequestProbability: 0.2 },
    industry: 'legal', companySize: '30', useCase: 'client intake and case status automation', monthlyConversations: '2000', budget: '300-500',
    initialMessage: 'Hi, we are a law firm looking for client intake and communication automation.',
  },
];

const TOPIC_MESSAGE_POOLS: Record<string, string[]> = {
  features: [
    'What features do you offer?',
    'Can you tell me about your main features?',
    'What can the AI actually do?',
    'What functionality is included?',
    'What does your platform do exactly?',
    'What capabilities does it have?',
    'Can it handle multiple use cases?',
    'What kind of automation do you provide?',
  ],
  pricing: [
    'How much does it cost?',
    'What are your pricing plans?',
    'Can you share pricing details?',
    'How much for the professional plan?',
    'What is the monthly cost?',
    'Are there different tiers?',
    'What do I get for the price?',
    'How does billing work?',
  ],
  security: [
    'What about security?',
    'How do you handle security?',
    'Is my data secure?',
    'What security measures do you have?',
    'Do you have encryption?',
    'How do you protect customer data?',
    'What about data privacy?',
    'Are you compliant with regulations?',
  ],
  integrations: [
    'What do you integrate with?',
    'Does it work with Shopify?',
    'Can you connect with Zendesk?',
    'What about Intercom integration?',
    'Do you have a Slack integration?',
    'Can I connect my existing tools?',
    'What platforms do you support?',
    'Is there a WordPress plugin?',
  ],
  api: [
    'Do you have an API?',
    'What does the API look like?',
    'Can I embed this in my product?',
    'Is there a REST API?',
    'What about webhooks?',
    'How does the API authentication work?',
    'Do you have SDKs?',
    'Can I customize the integration?',
  ],
  walkthrough: [
    'How does it work?',
    'Can you walk me through it?',
    'How does the AI process work?',
    'What is the setup process?',
    'How do I get started?',
    'Can you explain how it works step by step?',
    'What is the architecture?',
    'How does it handle conversations?',
  ],
  roi: [
    'What is the ROI?',
    'How much can I save?',
    'What kind of results do customers see?',
    'Will this reduce support costs?',
    'How long until I see returns?',
    'What deflection rates do you see?',
    'How does it impact CSAT?',
    'Can you share customer success stories?',
  ],
  comparison: [
    'How do you compare to competitors?',
    'What makes you different?',
    'Why should I choose you over alternatives?',
    'How do you compare to Zendesk?',
    'What are your advantages?',
    'Tell me how you are better than others.',
    'Why are you a better fit?',
    'What is your competitive edge?',
  ],
  demo: [
    'Can I see a demo?',
    'I would like to see it in action.',
    'Do you have a demo video?',
    'Can you show me how it works?',
    'I want a walkthrough of the product.',
    'Schedule a demo for me.',
    'Can my team see a demo?',
    'Show me the dashboard.',
  ],
  trial: [
    'Can I try it first?',
    'Do you have a free trial?',
    'Is there a way to test it?',
    'Can I start a trial?',
    'How long is the trial period?',
    'What is included in the trial?',
    'Can I get started with the trial?',
    'I want to try before buying.',
  ],
  onboarding: [
    'How long does setup take?',
    'Is it easy to set up?',
    'What is the onboarding process?',
    'Do you help with implementation?',
    'How do I migrate my existing data?',
    'What support do you provide during setup?',
    'Can I set it up myself?',
    'How technical is the setup?',
  ],
  developer: [
    'Is it developer friendly?',
    'What about custom development?',
    'Can I customize the chat widget?',
    'Do you have good documentation?',
    'What tech stack do you use?',
    'Can I extend the functionality?',
    'Is there a headless option?',
    'How flexible is the platform?',
  ],
  sso: [
    'Do you support SSO?',
    'What about SAML?',
    'Can we use Okta?',
    'Does it work with Azure AD?',
    'How does authentication work?',
    'Is there directory integration?',
    'Can we use our existing identity provider?',
    'What about role-based access?',
  ],
  soc2: [
    'Are you SOC 2 compliant?',
    'Do you have SOC 2 certification?',
    'What compliance certifications do you have?',
    'Is there an audit report?',
    'How often are you audited?',
    'Can we see your SOC 2 report?',
    'What is your compliance posture?',
    'Do you meet enterprise compliance requirements?',
  ],
};

const OBJECTION_MESSAGES: Record<ObjectionCategory, string[]> = {
  price: [
    'That is too expensive for us.',
    'Can you do better on pricing?',
    'That is way over our budget.',
    'We cannot afford that right now.',
    'Do you have a cheaper option?',
    'That seems pricey for what it does.',
    'Can you give us a discount?',
    'We were hoping for something more affordable.',
  ],
  security: [
    'I am concerned about data security.',
    'How do I know my data is safe?',
    'What if there is a data breach?',
    'I need to check with our security team.',
    'This seems risky from a security perspective.',
    'Where is the data stored?',
    'Do you have security certifications?',
    'I am not comfortable with cloud storage.',
  ],
  setup: [
    'This seems complicated to set up.',
    'I do not have time for a long implementation.',
    'How long does it really take to get started?',
    'Is it really easy to set up?',
    'I am worried about the learning curve.',
    'My team will struggle with this.',
    'We do not have technical staff for setup.',
    'This looks like it needs a lot of configuration.',
  ],
  competition: [
    'We are already using something similar.',
    'Another platform does this already.',
    'How are you different from Intercom?',
    'We tried something like this before.',
    'Our current solution works fine.',
    'We are happy with our current setup.',
    'Why should we switch?',
    'Your competitors offer this cheaper.',
  ],
  roi: [
    'I am not sure the ROI is there.',
    'Will this actually save us money?',
    'I need to justify this to my boss.',
    'The cost seems higher than the benefit.',
    'Can you prove this works?',
    'I need concrete numbers.',
    'What is the payback period?',
    'I am not convinced about the value.',
  ],
  implementation: [
    'This will take too long to implement.',
    'We do not have bandwidth for this now.',
    'Our team is too busy for a rollout.',
    'Integration with our systems will be hard.',
    'We would need to train everyone.',
    'This would disrupt our current operations.',
    'When would we even have time for this?',
    'The implementation seems like a project.',
  ],
  enterprise_procurement: [
    'We need to go through procurement.',
    'This requires vendor approval.',
    'Our legal team needs to review this.',
    'We have a strict vendor management process.',
    'Can you provide a security questionnaire?',
    'We need an MSA and SLA agreement.',
    'This needs to go through our approval process.',
    'Do you have enterprise licensing?',
  ],
  developer_concerns: [
    'The API does not look flexible enough.',
    'I am not sure about the technical architecture.',
    'How scalable is this?',
    'Does it handle high traffic?',
    'I have concerns about latency.',
    'The customization options seem limited.',
    'What is the tech stack?',
    'I need to check the documentation first.',
  ],
  none: [],
};

const SHORT_REPLIES = ['ok', 'okay', 'yes', 'yeah', 'sure', 'cool', 'great', 'nice', 'interesting', 'hmm', 'no', 'nah', 'maybe'];
const OFF_TOPIC_MESSAGES = [
  'How is the weather today?',
  'Do you guys have a football team?',
  'What do you think about the latest tech news?',
  'I saw a funny meme about chatbots earlier.',
  'Do you follow any sports?',
  'What is your company culture like?',
  'How is the work from home policy?',
  'What is your favorite programming language?',
];
const COMPETITOR_MENTIONS = ['Have you heard of Intercom?', 'We are looking at Zendesk too.', 'How about Freshdesk?', 'What about Drift?', 'HubSpot has a similar feature.', 'We are comparing a few options.', 'Someone recommended Zoho Desk.', 'What makes you better than the rest?'];
const HUMAN_REQUESTS = ['Can I talk to a human?', 'I want to speak with sales.', 'Is there a person I can talk to?', 'Can you connect me with your team?', 'I need to discuss this with a real person.', 'Get me on a call with someone.', 'I prefer talking to a human.', 'Can someone call me?'];

export class CustomerSimulator {
  private config: PersonaConfig;
  private turnCount: number = 0;
  private discussedTopics: Set<string> = new Set();
  private raisedObjections: Set<string> = new Set();
  private satisfaction: number = 0.5;
  private interestLevel: number = 0.5;
  private hasRequestedHuman: boolean = false;
  private hasRequestedDemo: boolean = false;
  private hasStartedTrial: boolean = false;
  private pendingTopics: string[] = [];
  private lastBrainGoal: string = '';
  private consecutiveShortReplies: number = 0;
  private silenceTurns: number = 0;
  private topicTransitions: number = 0;

  constructor(config: PersonaConfig) {
    this.config = config;
    this.pendingTopics = this.buildInitialAgenda();
  }

  get personaType(): string { return this.config.name; }
  get traits() { return this.config.traits; }
  get configData(): PersonaConfig { return this.config; }

  private buildInitialAgenda(): string[] {
    const topics = ['features', 'pricing', 'integrations', 'walkthrough'];
    if (this.config.personaType === 'enterprise') topics.push('security', 'sso', 'soc2');
    if (this.config.personaType === 'developer') topics.push('api', 'developer');
    topics.push('demo', 'trial');
    return topics;
  }

  generateMessage(lastResponse?: string, strategy?: ConversationStrategy, brainOutput?: BrainOutput): string {
    this.turnCount++;

    if (this.silenceTurns > 0) {
      this.silenceTurns--;
      if (this.silenceTurns > 0) return '';
    }

    if (this.turnCount === 1) return this.config.initialMessage;

    if (this.turnCount >= this.config.traits.conversationLength + 3) {
      return this.pickOne(['Thank you, I have all the information I need.', 'Great, I think I am good for now.', 'Thanks, that answers my questions.']).response;
    }

    if (this.hasStartedTrial || this.hasRequestedDemo) {
      if (Math.random() < 0.3) {
        return this.pickOne(['Great, let me start the trial.', 'Perfect, sign me up.', 'Let me get started.', 'Sounds good, let me try it.', 'I am ready to begin.']).response;
      }
    }

    const recentGoal = strategy?.primaryGoal || 'none';

    if (strategy?.cta === 'strong' && strategy?.primaryGoal === 'close_trial') {
      if (this.config.traits.buyingIntent > 0.5 || Math.random() < this.config.traits.buyingIntent) {
        this.hasStartedTrial = true;
        return this.pickOne(['Yes, I want to start the trial!', 'Let me sign up for the trial.', 'Okay, let me try it out.', 'Great, start my trial please.']).response;
      }
    }

    if (strategy?.cta === 'strong' && strategy?.primaryGoal === 'schedule_demo') {
      if (Math.random() < this.config.traits.buyingIntent + 0.2) {
        this.hasRequestedDemo = true;
        return this.pickOne(['Yes, schedule a demo for me.', 'Book a demo please.', 'Let me set up a demo.', 'I want to see the demo.']).response;
      }
    }

    if (Math.random() < this.config.traits.shortReplyProbability && this.consecutiveShortReplies < 2) {
      this.consecutiveShortReplies++;
      return this.pickOne(SHORT_REPLIES).response;
    }
    this.consecutiveShortReplies = 0;

    if (Math.random() < this.config.traits.humanRequestProbability && !this.hasRequestedHuman && this.turnCount > 5) {
      this.hasRequestedHuman = true;
      return this.pickOne(HUMAN_REQUESTS).response;
    }

    if (strategy && Math.random() < 0.4 && this.config.traits.qualificationWillingness < Math.random()) {
      const qualQ = strategy.qualificationQuestion;
      if (qualQ) {
        if (Math.random() < 0.3) {
          return this.pickOne(['Why do you need that information?', 'I am not sure that is relevant.', 'Can we focus on the product first?', 'I would rather not share that right now.']).response;
        }
        return this.pickOne(this.getQualificationAnswer(qualQ)).response;
      }
    }

    if (Math.random() < this.config.traits.offTopicProbability && this.turnCount > 3) {
      return this.pickOne(OFF_TOPIC_MESSAGES).response;
    }

    if (Math.random() < this.config.traits.competitorComparisonProbability && this.turnCount > 3) {
      return this.pickOne(COMPETITOR_MENTIONS).response;
    }

    if (this.raisedObjections.size < 3 && Math.random() < this.config.traits.objectionProbability && this.turnCount > 2) {
      const categories: ObjectionCategory[] = ['price', 'security', 'setup', 'competition', 'roi', 'implementation'];
      if (this.config.personaType === 'enterprise') categories.push('enterprise_procurement');
      if (this.config.personaType === 'developer') categories.push('developer_concerns');
      const avail = categories.filter(c => !this.raisedObjections.has(c) && OBJECTION_MESSAGES[c].length > 0);
      if (avail.length > 0) {
        const cat = this.pickOne(avail).response as ObjectionCategory;
        this.raisedObjections.add(cat);
        return this.pickOne(OBJECTION_MESSAGES[cat]).response;
      }
    }

    if (lastResponse && Math.random() < this.config.traits.skepticism) {
      if (/(trust|believe|sure|really)/i.test(lastResponse) || Math.random() < 0.3) {
        return this.pickOne(['Are you sure about that?', 'How do I know you are telling the truth?', 'I am a bit skeptical about those claims.', 'Can you prove that?', 'That sounds too good to be true.', 'I have heard promises like that before.']).response;
      }
    }

    if (this.pendingTopics.length > 0 && (Math.random() < 0.6 || this.turnCount > 3)) {
      const topic = this.pendingTopics.shift()!;
      this.discussedTopics.add(topic);
      this.topicTransitions++;
      const pool = TOPIC_MESSAGE_POOLS[topic];
      if (pool) return this.pickOne(pool).response;

      if (topic === 'discount') {
        return this.pickOne(['Can I get a discount?', 'Any promotions available?', 'Do you have any special pricing?', 'Is there a startup discount?']).response;
      }
    }

    if (Math.random() < this.config.traits.topicChangeProbability && this.discussedTopics.size > 0) {
      const topics = Object.keys(TOPIC_MESSAGE_POOLS).filter(t => !this.discussedTopics.has(t));
      if (topics.length > 0) {
        const topic = this.pickOne(topics).response;
        this.discussedTopics.add(topic);
        this.topicTransitions++;
        const pool = TOPIC_MESSAGE_POOLS[topic];
        if (pool) return this.pickOne(pool).response;
      }
    }

    if (lastResponse && !lastResponse.includes('?')) {
      const followUps = [
        'Can you tell me more?',
        'Go on.',
        'What else should I know?',
        'Anything else?',
        'Is that all?',
        'What about other features?',
        'I need more details.',
        'Explain further please.',
      ];
      return this.pickOne(followUps).response;
    }

    const genericQuestions = [
      'What else can you tell me?',
      'I see, go on.',
      'Anything else I should consider?',
      'What do you recommend?',
      'Can you walk me through the next steps?',
      'That is helpful, what about other aspects?',
      'Interesting, tell me more.',
      'How would this work for my situation?',
    ];
    return this.pickOne(genericQuestions).response;
  }

  private getQualificationAnswer(question: string): string[] {
    const lower = question.toLowerCase();
    if (lower.includes('company size') || lower.includes('how many people')) {
      return [`We have about ${this.config.companySize || '10'} people.`, `Our team size is ${this.config.companySize || '10'}.`];
    }
    if (lower.includes('industry') || lower.includes('what industry')) {
      return [`We are in the ${this.config.industry || 'technology'} industry.`, `Our industry is ${this.config.industry || 'technology'}.`];
    }
    if (lower.includes('use case') || lower.includes('what are you building')) {
      return [`We need it for ${this.config.useCase || 'customer support'}.`, `Our use case is ${this.config.useCase || 'customer support'}.`];
    }
    if (lower.includes('conversation') || lower.includes('monthly') || lower.includes('volume')) {
      return [`About ${this.config.monthlyConversations || '1000'} conversations per month.`, `We handle around ${this.config.monthlyConversations || '1000'} monthly.`];
    }
    if (lower.includes('helpdesk') || lower.includes('current') || lower.includes('platform')) {
      return [`We currently use ${this.config.currentHelpdesk || 'a basic ticketing system'}.`, `Right now we are on ${this.config.currentHelpdesk || 'email'} for support.`];
    }
    if (lower.includes('budget') || lower.includes('spend')) {
      return [`Our budget is ${this.config.budget || 'around $200 per month'}.`, `We can spend ${this.config.budget || '$200 monthly'} on a solution.`];
    }
    if (lower.includes('decision') || lower.includes('timeline') || lower.includes('when')) {
      return [`We are looking to decide within ${this.config.decisionTimeline || 'a month'}.`, `Our timeline is ${this.config.decisionTimeline || 'about a month'}.`];
    }
    return ['That sounds about right for us.', 'Let me answer that.', 'Sure, here is the information.'];
  }

  shouldContinue(brainOutput: BrainOutput): boolean {
    const strategy = brainOutput.strategy;
    if (!strategy) return false;
    if (this.turnCount >= this.config.traits.conversationLength + 5) return false;
    if (brainOutput.memory.isCompleted) return false;
    if (brainOutput.memory.isLeaving) return false;
    const isEnding = strategy.primaryGoal === 'finish_conversation';
    if (isEnding) return false;
    const hasRespondedToCTA = this.hasStartedTrial || this.hasRequestedDemo;
    if (hasRespondedToCTA && Math.random() < 0.6) return false;
    return true;
  }

  updateState(brainOutput: BrainOutput): void {
    this.lastBrainGoal = brainOutput.plan.goal;
    if (brainOutput.memory.turnCount > 0) {
      const lastSentiment = brainOutput.memory.sentiment;
      this.satisfaction = 0.5 + (lastSentiment.polarity * 0.5);
      this.satisfaction = Math.max(0, Math.min(1, this.satisfaction));
      this.interestLevel = 0.5 + (brainOutput.memory.leadScore / 200);
      this.interestLevel = Math.max(0, Math.min(1, this.interestLevel));
    }
    if (this.config.traits.buyingIntent > 0.6 && !this.hasRequestedDemo && !this.hasStartedTrial) {
      if (!this.pendingTopics.includes('demo')) this.pendingTopics.push('demo');
      if (!this.pendingTopics.includes('trial')) this.pendingTopics.push('trial');
    }
    this.silenceTurns = 0;
  }

  simulateSilence(): void {
    this.silenceTurns = Math.floor(Math.random() * 3) + 1;
    this.turnCount += this.silenceTurns;
  }

  private pickOne<T>(arr: T[]): { response: T } {
    return { response: arr[Math.floor(Math.random() * arr.length)] };
  }
}
