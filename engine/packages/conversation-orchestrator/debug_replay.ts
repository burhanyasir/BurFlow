import { processConversationBrain } from './src/conversation-brain';

const turns = [
  { message: 'Hi, I have a Shopify store and need help with customer support', responseText: 'We can help with customer support for your Shopify store.' },
  { message: 'How does it work with Shopify?', responseText: 'Our integration connects directly to your Shopify store.' },
  { message: 'Can it handle product questions and order status?', responseText: 'Yes, it handles product questions, order status, and returns.' },
  { message: 'What about shipping inquiries?', responseText: 'It can answer shipping questions automatically.' },
  { message: 'Do you integrate with Oberlo?', responseText: 'We integrate with Oberlo and other dropshipping tools.' },
  { message: 'How much does it cost?', responseText: 'Our pricing starts at $29 per month for the Professional plan.' },
  { message: 'Are there different plans?', responseText: 'We have Starter, Professional, and Enterprise plans.' },
  { message: 'What features are in the Professional plan?', responseText: 'Professional includes AI chat, analytics, and integrations.' },
  { message: 'How many conversations can it handle?', responseText: 'It depends on the plan. How many conversations do you handle monthly?' },
  { message: 'Maybe around 5000 per month', responseText: 'Great, with 5000 conversations the Professional plan would work well.' },
  { message: 'Can I try it before committing?', responseText: 'Yes, we offer a 14-day free trial.' },
  { message: 'How do I set it up?', responseText: 'Setup takes about 10 minutes with our Shopify integration.' },
  { message: 'Is there any coding required?', responseText: 'No coding required. It works out of the box with Shopify.' },
  { message: 'What about returns management?', responseText: 'Our AI can handle return requests and RMA status.' },
  { message: 'Does it support multiple languages?', responseText: 'Yes, it supports over 20 languages.' },
  { message: 'How is the analytics dashboard?', responseText: 'You get real-time analytics on conversations and satisfaction.' },
  { message: 'That sounds good, I want to start the trial', responseText: 'Great, let me help you get started with the trial.' },
];

let legacyMemory: any = {
  turns: [],
  persona: 'unknown',
  funnelStage: 'greeting',
  buyingIntentDetected: false,
  objections: [],
  qualificationState: { questionsAskedCount: 0, completed: false },
  repeatedPhraseCount: 0,
  topics: [],
};

for (let i = 0; i < turns.length; i++) {
  const { message, responseText } = turns[i];
  console.log(`\n--- Turn ${i + 1}: "${message}"`);
  try {
    const result = processConversationBrain({ message, responseText, legacyMemory });
    console.log('Has strategy:', !!result.strategy);
    if (result.strategy) {
      console.log('  Goal:', result.strategy.primaryGoal);
      console.log('  Topic:', result.strategy.topicToAnswer);
      console.log('  CTA:', result.strategy.cta);
      console.log('  Qual:', result.strategy.qualificationQuestion);
    } else {
      console.log('  Plan goal:', result.plan.goal);
      console.log('  Plan intent:', result.plan.customerIntent);
    }
    legacyMemory = result.legacyMemory;
  } catch (err: any) {
    console.log('  ERROR:', err.message);
    break;
  }
}
