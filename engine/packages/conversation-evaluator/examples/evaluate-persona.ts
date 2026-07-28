import {
  ConversationRecord, TurnEvaluation, QualificationEvent,
  CTAEvent, FunnelProgression, TopicEvent, MemoryRefEvent,
  PersonaType, ScenarioType,
} from '../src/types';
import { evaluateConversation, aggregateReports } from '../src/scorer';
import { formatReport, formatAggregatedSummary } from '../src/report-generator';
import { createPersonaTemplate } from '../src/templates';

/**
 * Example: Evaluate a Shopify Merchant (curious) conversation
 *
 * To use: replace the sample data below with real conversation records.
 * Run: npx ts-node examples/evaluate-persona.ts
 */
function main() {
  const persona: PersonaType = 'shopify_merchant';
  const scenario: ScenarioType = 'curious';

  // Load the persona template to know what to expect
  const template = createPersonaTemplate(persona);
  const config = template.scenarios[scenario];

  // --- SAMPLE CONVERSATION RECORD ---
  // Replace this with data from an actual manual conversation test.
  const record: ConversationRecord = {
    evaluator: 'Example Run',
    date: new Date().toISOString().slice(0, 10),
    persona,
    scenario,
    userGoal: config.userGoal,
    turnCount: 8,
    turns: buildSampleTurns(),
    qualificationTimeline: buildSampleQualification(),
    funnelProgression: buildSampleFunnelProgression(),
    topicsDiscussed: buildSampleTopics(),
    memoryReferences: buildSampleMemoryRefs(),
    ctaHistory: buildSampleCTAs(),
    deadEnds: [
      { turnNumber: 6, responseText: 'Let me know if you have questions.', reason: 'Generic dead-end CTA' },
    ],
    loops: [],
    finalRecommendation: null,
    reviewerNotes: [
      'Initial exploration was good on features',
      'Topic transition to pricing felt abrupt (turn 4)',
      'Missed opportunity to ask about integration needs',
    ],
    overallImpression: 'Solid overall but topic transitions need work',
  };

  // Run the evaluation
  console.log('\nEvaluating conversation...');
  const report = evaluateConversation(record);

  // Print the report
  console.log(formatReport(report));

  // Aggregate reports (when you have multiple conversations)
  console.log('\n\n=== AGGREGATED (SINGLE CONVERSATION) ===');
  const summary = aggregateReports([report]);
  console.log(formatAggregatedSummary(summary));
}

function buildSampleTurns(): TurnEvaluation[] {
  return [
    {
      turnNumber: 1, userMessage: 'Hi, I run a Shopify store and need help with customer service automation.',
      assistantResponse: 'Great question. Our platform is built around workflow automation — it routes tickets, triggers actions, and gives your team one place to manage everything.',
      observedCustomerIntent: 'learning', expectedGoal: 'answer_question', actualGoal: 'answer_question',
      goalMatch: true, topicsDiscussed: ['features'], naturalness: 4,
      feltGeneric: false, repeatedPhrases: [], unnecessaryQualification: false,
      ctaPresent: false, ctaAppropriate: true, ctaTiming: 'none',
      memoryReferenced: false, memoryShouldHaveBeenReferenced: false,
      topicContinuityGood: true, advancedFunnel: true, handledObjection: false,
      betterFollowUpAvailable: false, betterFollowUpText: null, notes: '',
    },
    {
      turnNumber: 2, userMessage: 'How does it integrate with Shopify?',
      assistantResponse: 'We integrate natively with Shopify, syncing conversations and order data in real time. It connects directly to your product catalog and customer database.',
      observedCustomerIntent: 'learning', expectedGoal: 'answer_question', actualGoal: 'answer_question',
      goalMatch: true, topicsDiscussed: ['integrations'], naturalness: 5,
      feltGeneric: false, repeatedPhrases: [], unnecessaryQualification: false,
      ctaPresent: false, ctaAppropriate: true, ctaTiming: 'none',
      memoryReferenced: true, memoryShouldHaveBeenReferenced: true,
      topicContinuityGood: true, advancedFunnel: true, handledObjection: false,
      betterFollowUpAvailable: false, betterFollowUpText: null, notes: '',
    },
    {
      turnNumber: 3, userMessage: 'What about pricing?',
      assistantResponse: 'That helps me narrow it down. We have three tiers: Starter at $49/month for up to 3 agents, Professional at $99/month for growing teams, and Enterprise with custom pricing.',
      observedCustomerIntent: 'evaluating', expectedGoal: 'qualify', actualGoal: 'qualify',
      goalMatch: true, topicsDiscussed: ['pricing'], naturalness: 3,
      feltGeneric: false, repeatedPhrases: ['up to 3 agents'], unnecessaryQualification: false,
      ctaPresent: false, ctaAppropriate: true, ctaTiming: 'none',
      memoryReferenced: false, memoryShouldHaveBeenReferenced: true,
      topicContinuityGood: false, advancedFunnel: true, handledObjection: false,
      betterFollowUpAvailable: true, betterFollowUpText: 'Ask about their store size before jumping to pricing',
      notes: 'Topic change from integrations to pricing felt abrupt',
    },
    {
      turnNumber: 4, userMessage: 'How many conversations do you handle monthly?',
      assistantResponse: 'Great, thanks. What industry are you in?',
      observedCustomerIntent: 'confirming', expectedGoal: 'qualify', actualGoal: 'qualify',
      goalMatch: true, topicsDiscussed: [], naturalness: 2,
      feltGeneric: true, repeatedPhrases: [], unnecessaryQualification: true,
      ctaPresent: false, ctaAppropriate: true, ctaTiming: 'none',
      memoryReferenced: false, memoryShouldHaveBeenReferenced: false,
      topicContinuityGood: false, advancedFunnel: false, handledObjection: false,
      betterFollowUpAvailable: false, betterFollowUpText: null, notes: 'Missed the user\'s question about monthly conversations',
    },
    {
      turnNumber: 5, userMessage: 'Can I try it first?',
      assistantResponse: 'Absolutely. You can start a 14-day free trial, no credit card required. Most Shopify stores are fully set up within the first week.',
      observedCustomerIntent: 'buying', expectedGoal: 'close_trial', actualGoal: 'close_trial',
      goalMatch: true, topicsDiscussed: ['trial'], naturalness: 4,
      feltGeneric: false, repeatedPhrases: [], unnecessaryQualification: false,
      ctaPresent: true, ctaAppropriate: true, ctaTiming: 'appropriate',
      memoryReferenced: true, memoryShouldHaveBeenReferenced: true,
      topicContinuityGood: true, advancedFunnel: true, handledObjection: false,
      betterFollowUpAvailable: false, betterFollowUpText: null, notes: '',
    },
    {
      turnNumber: 6, userMessage: 'Great, sign me up.',
      assistantResponse: 'Let me know if you have questions.',
      observedCustomerIntent: 'buying', expectedGoal: 'close_trial', actualGoal: 'close_trial',
      goalMatch: false, topicsDiscussed: [], naturalness: 1,
      feltGeneric: true, repeatedPhrases: [], unnecessaryQualification: false,
      ctaPresent: true, ctaAppropriate: false, ctaTiming: 'none',
      memoryReferenced: false, memoryShouldHaveBeenReferenced: true,
      topicContinuityGood: false, advancedFunnel: false, handledObjection: false,
      betterFollowUpAvailable: true, betterFollowUpText: 'Walk through the signup process and first setup steps',
      notes: 'Dead-end response when user was ready to convert',
    },
    {
      turnNumber: 7, userMessage: 'How do I start?',
      assistantResponse: 'Here is the easiest way in. You can sign up in under a minute. Visit our signup page to create your account.',
      observedCustomerIntent: 'buying', expectedGoal: 'close_trial', actualGoal: 'close_trial',
      goalMatch: true, topicsDiscussed: ['trial'], naturalness: 4,
      feltGeneric: false, repeatedPhrases: [], unnecessaryQualification: false,
      ctaPresent: true, ctaAppropriate: true, ctaTiming: 'appropriate',
      memoryReferenced: true, memoryShouldHaveBeenReferenced: true,
      topicContinuityGood: true, advancedFunnel: true, handledObjection: false,
      betterFollowUpAvailable: false, betterFollowUpText: null, notes: '',
    },
    {
      turnNumber: 8, userMessage: 'Thanks for your help!',
      assistantResponse: 'Happy to help. Feel free to come back anytime.',
      observedCustomerIntent: 'leaving', expectedGoal: 'finish_conversation', actualGoal: 'finish_conversation',
      goalMatch: true, topicsDiscussed: [], naturalness: 4,
      feltGeneric: false, repeatedPhrases: [], unnecessaryQualification: false,
      ctaPresent: false, ctaAppropriate: true, ctaTiming: 'none',
      memoryReferenced: false, memoryShouldHaveBeenReferenced: false,
      topicContinuityGood: true, advancedFunnel: true, handledObjection: false,
      betterFollowUpAvailable: false, betterFollowUpText: null, notes: '',
    },
  ];
}

function buildSampleQualification(): QualificationEvent[] {
  return [
    { turnNumber: 3, question: 'What is your company size?', natural: true, acknowledged: true, userAnswer: 'Small team' },
    { turnNumber: 4, question: 'What industry are you in?', natural: false, acknowledged: false, userAnswer: null },
  ];
}

function buildSampleFunnelProgression(): FunnelProgression[] {
  return [
    { turnNumber: 1, from: 'greeting', to: 'awareness', natural: true },
    { turnNumber: 3, from: 'awareness', to: 'interest', natural: true },
    { turnNumber: 5, from: 'interest', to: 'purchase_intent', natural: true },
    { turnNumber: 6, from: 'purchase_intent', to: 'decision', natural: false },
  ];
}

function buildSampleTopics(): TopicEvent[] {
  return [
    { turnNumber: 1, topic: 'features', action: 'introduced' },
    { turnNumber: 1, topic: 'features', action: 'explained' },
    { turnNumber: 2, topic: 'integrations', action: 'introduced' },
    { turnNumber: 2, topic: 'integrations', action: 'explained' },
    { turnNumber: 3, topic: 'pricing', action: 'introduced' },
    { turnNumber: 5, topic: 'trial', action: 'introduced' },
  ];
}

function buildSampleMemoryRefs(): MemoryRefEvent[] {
  return [
    { turnNumber: 2, memoryField: 'Shopify store', natural: true, accurate: true },
    { turnNumber: 5, memoryField: 'Shopify store', natural: true, accurate: true },
    { turnNumber: 7, memoryField: 'trial interest', natural: true, accurate: true },
  ];
}

function buildSampleCTAs(): CTAEvent[] {
  return [
    { turnNumber: 5, ctaType: 'start_free_trial', label: 'Start Free Trial', appropriate: true, userResponded: true },
    { turnNumber: 6, ctaType: 'none', label: '', appropriate: false, userResponded: false },
    { turnNumber: 7, ctaType: 'start_free_trial', label: 'Start Free Trial', appropriate: true, userResponded: true },
  ];
}

main();
