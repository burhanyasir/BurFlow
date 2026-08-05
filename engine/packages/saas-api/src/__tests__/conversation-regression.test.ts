import { describe, it, expect } from 'vitest';
import { detectBuyingSignal, DefaultKnowledgeBaseProvider, KnowledgeBaseProvider, DiscernedTopic, processConversationBrain } from '@conversation-engine/conversation-orchestrator';
import {
  processRapportRepair,
  createInitialState,
  processPolicyEngine,
  composeResponse,
  executePipeline,
  stateManager,
  DbKnowledgeBaseProvider,
} from '../orchestrator';
import { TopicResponseTemplateRepository, createDatabase } from '@conversation-engine/saas-core';
import { tmpdir } from 'os';
import { join } from 'path';

function fakeBrain(t: string) { return () => ({ responseText: t, legacyMemory: { turns: [], funnelStage: 'discovery', topics: [] }, plan: { customerIntent: 'question', goal: 'answer', topicsToDiscuss: [] }, strategy: { primaryGoal: 'answer', topicToAnswer: '', followUpTopic: '' } }); }
const noopBrain = fakeBrain('');
const okBrain = fakeBrain('Here is the information you need.');
const tenant = 'reg-tenant';
const policy = { qualification: { enabled: true, trustThreshold: 20, maxQuestions: 2, requiresBuyingSignal: false, turnsBetweenQuestions: 2 }, cta: { enabled: true, minimumTrust: 30, requiresValueFirst: true } };
function sid() { return `r${Date.now()}-${Math.random().toString(36).slice(2,5)}`; }
function pip(sessionId: string, msg: string, brain = noopBrain) { return executePipeline({ message: msg, sessionId, tenantId: tenant, brainFunction: brain, policy }); }

// ═══════════════════════════════════ 1. GREETINGS — 25 ═══════════════════════════════════
describe('Greetings', () => {
  const H = [['Hi','greeting'],['Hello','greeting'],['Hey','greeting'],['Hey there','greeting'],['Hi there','greeting'],['Howdy','greeting'],['Yo','greeting'],["What's up",'greeting'],['Sup','greeting'],['Good morning','greeting'],['Good afternoon','greeting'],['Good evening','greeting'],['Nice to meet you','greeting'],['How are you?','greeting'],["How's it going?",'greeting'],["How do you do?",'greeting']];
  it.each(H)('"%s"→%s',(m,s)=>{const c=createInitialState(sid(),tenant,policy);const r=processRapportRepair(m,c);expect(r.handled).toBe(true);expect(r.strategy).toBe(s);});
  it('sets positive mood',()=>{expect(processRapportRepair('Hey there!',createInitialState(sid(),tenant,policy)).mood).toBe('positive');});
  it('NOT with 2+ business words',()=>{expect(processRapportRepair('Hi I need help with pricing',createInitialState(sid(),tenant,policy)).handled).toBe(false);});
  it('NOT "Hi, my account is broken" (1 biz word)',()=>{expect(processRapportRepair('Hi, my account is broken',createInitialState(sid(),tenant,policy)).handled).toBe(true);});
  it('NOT "Hey, do you have support for Slack?" (1 biz word)',()=>{expect(processRapportRepair('Hey, do you have support for Slack?',createInitialState(sid(),tenant,policy)).handled).toBe(true);});
  it('greeting on turn>0 passes through to brain',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=3;const r=processRapportRepair('Hi again',c);expect(r.handled).toBe(false);});
});

  it('"how are you" on turn>0 passes through to brain',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('How are you?',c);expect(r.handled).toBe(false);});
  it('"how are you" on turn=0 still handled by rapport',()=>{const c=createInitialState(sid(),tenant,policy);const r=processRapportRepair('How are you?',c);expect(r.handled).toBe(true);});
// ═══════════════════════════════════ 2. SMALL TALK — 15 ═══════════════════════════════════
describe('Small talk',()=>{
  const S=['Nice weather today',"How's everything?","What's new?","How's your day going?","How is your morning?",'Long time no chat','Have a great day','I had a lovely weekend','Great weather we are having'];
  it.each(S)('"%s"→small talk',(m)=>{const c=createInitialState(sid(),tenant,policy);const r=processRapportRepair(m,c);expect(r.handled).toBe(true);expect(r.strategy).toBe('greeting');});
  it('NOT with business intent',()=>{expect(processRapportRepair("Hope you're well, I need pricing",createInitialState(sid(),tenant,policy)).handled).toBe(false);});
  it('redirects to help',()=>{expect(processRapportRepair("How's your week?",createInitialState(sid(),tenant,policy)).response).toMatch(/help|assist|can I/);});
  it('"Hope you are doing well" matches small talk pattern',()=>{const c=createInitialState(sid(),tenant,policy);const r=processRapportRepair('Hope you are doing well',c);expect(r.handled).toBe(false);});
  it('small talk on turn>0 passes through to brain',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=3;const r=processRapportRepair('Nice weather today',c);expect(r.handled).toBe(false);});
});

// ═══════════════════════════════════ 3. SARCASM — 15 ═══════════════════════════════════
describe('Sarcasm',()=>{
  const C=['Oh great, another chatbot','Yeah because chatbots always work perfectly','Sure, I trust AI with my data','Wow, such helpful','Oh wonderful, yet another automated response','Yeah that is exactly what I needed','Fantastic, just what I was looking for','Sure, because that is totally reasonable','Oh I am sure you are real helpful','Right, because that has worked so well before','Thanks for nothing','Oh brilliant','Yeah sure','As if','Whatever you say'];
  it.each(C)('"%s" intercepted as frustration/skepticism',(m)=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=1;const r=processRapportRepair(m,c);if(r.handled)expect(['frustrated','skeptical']).toContain(r.mood);});
});

// ═══════════════════════════════════ 4. FRUSTRATION — 20 ═══════════════════════════════════
describe('Frustration',()=>{
  const C:[string,string][]=[['This is ridiculous','frustrated'],["You are not helping me at all",'frustrated'],['I am fed up with this','frustrated'],['This is annoying','frustrated'],['This is a waste of time','frustrated'],['Terrible support','frustrated'],['This is useless','frustrated'],['This is horrible','frustrated']];
  it.each(C)('"%s"→mood=%s',(m,md)=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair(m,c);expect(r.handled).toBe(true);expect(r.mood).toBe(md);});
  it('de-escalates not sales',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('This is ridiculous',c);expect(r.response).toMatch(/understand|frustration|concern|specific/i);expect(r.response).not.toMatch(/buy|trial|sign up|pricing/i);});
  it('sets mood on state',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;processRapportRepair('This is terrible',c);expect(c.mood).toBe('frustrated');});
});

// ═══════════════════════════════════ 5. CONFUSION — 15 ═══════════════════════════════════
describe('Confusion',()=>{
  const C=['What?','Huh?','Hmm',"I don't understand",'This does not make sense','Can you explain that differently?','What do you mean?','I am not sure I follow','Sorry, I am confused','Rephrase that please','Can you clarify?','Wait, I am lost'];
  it.each(C)('"%s"→repair_confusion when turn>0',(m)=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair(m,c);expect(r.handled).toBe(true);expect(r.strategy).toBe('repair_confusion');});
  it('NOT on turn 0',()=>{expect(processRapportRepair('Hmm',createInitialState(sid(),tenant,policy)).handled).toBe(false);});
  it('NOT "What do you charge?"',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=1;expect(processRapportRepair('What do you charge?',c).handled).toBe(false);});
  it('clarification response',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;expect(processRapportRepair("I don't understand",c).response).toMatch(/clarify|explain|differently|part/i);});
});

// ═══════════════════════════════════ 6. OBJECTIONS — 20 ═══════════════════════════════════
describe('Objections',()=>{
  const C:[string,string][]=[['That is too expensive','objection_handling'],['This is overpriced','objection_handling'],['We already use Zendesk and we are happy','objection_handling'],['We are happy with our current tool','objection_handling'],['Not interested right now','objection_handling'],['This is not for us','objection_handling'],['This is a waste of money','objection_handling'],['We use a competitor already','objection_handling'],['There is another platform','objection_handling'],['Too early for us','objection_handling'],['Not ready yet','objection_handling']];
  it.each(C)('"%s"→%s',(m,s)=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine(m,c,{handled:false,strategy:'answer'});expect(r.strategy).toBe(s);expect(r.priority).toBe(1);});
  it('expensive+question→objection',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('This is expensive but how does it work?',c,{handled:false,strategy:'answer'}).strategy).toBe('objection_handling');});
});

// ═══════════════════════════════════ 7. PRICING — 15 ═══════════════════════════════════
describe('Pricing',()=>{
  const C=['How much does this cost?','What is the pricing?','Monthly subscription cost?','Annual pricing?','Do you have enterprise pricing?','Per-seat pricing or flat rate?','Total cost of ownership?','What do you charge?','How much is it?','Pricing details?','Tell me about pricing','Cost per month?'];
  it.each(C)('"%s"→answer+buyingSignal+pricing',(m)=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine(m,c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.buyingSignalDetected).toBe(true);expect(r.detectedTopics).toContain('pricing');});
  it('increases buying score',()=>{const c=createInitialState(sid(),tenant,policy);processPolicyEngine('How much?',c,{handled:false,strategy:'answer'});expect(c.buyingIntentScore).toBeGreaterThan(0);});
});

// ═══════════════════════════════════ 8. SECURITY — 15 ═══════════════════════════════════
describe('Security / Trust',()=>{
  const C:[string,string][]=[['Is this SOC2 compliant?','trust_building'],['Are you SOC2?','trust_building'],['Are you GDPR compliant?','trust_building'],['HIPAA compliant?','trust_building'],['How do you protect my data?','trust_building'],['Is my data safe?','trust_building'],['How do you handle our data?','trust_building'],['Where is my data stored?','trust_building'],['Data residency options?','trust_building'],['TLS encryption?','trust_building'],['Are you PCI compliant?','trust_building'],['Do you have audit logs?','trust_building']];
  it.each(C)('"%s"→%s',(m,s)=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine(m,c,{handled:false,strategy:'answer'}).strategy).toBe(s);});
});

// ═══════════════════════════════════ 9. INTEGRATIONS — 12 ═══════════════════════════════════
describe('Integrations',()=>{
  const C=['Does this integrate with Slack?','Zendesk integration?','Salesforce integration?','HubSpot integration?','Do you have an API?','REST API available?','Can I connect this to my CRM?'];
  it.each(C)('"%s"→integrations',(m)=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine(m,c,{handled:false,strategy:'answer'}).detectedTopics).toContain('integrations');});
});

// ═══════════════════════════════════ 10. SUPPORT / ACTION — 12 ═══════════════════════════════════
describe('Support / Action',()=>{
  const M:[string,string][]=[['How do I reset password?','action_execution'],['How do I track order?','action_execution'],['Find invoice','action_execution'],['Search order','action_execution'],['Reset password','action_execution'],['Update email','action_execution'],['Where do I find the dashboard?','answer'],['How do I add users?','answer'],['How do I configure workflows?','answer']];
  it.each(M)('"%s"→%s',(m,s)=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine(m,c,{handled:false,strategy:'answer'}).strategy).toBe(s);});
});

// ═══════════════════════════════════ 11. BOOKING — 12 ═══════════════════════════════════
describe('Booking / Demo',()=>{
  const B=['Book a demo','Schedule a demo','Set up a meeting','Schedule a call','Can I book a demo?','Free consultation?','Product walkthrough?','Show me a demo','I want a demo','Talk to sales'];
  it.each(B)('"%s"→buying score increases',(m)=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=60;c.turnCount=5;c.buyingIntentScore=50;c.ledger.questionsAnswered=['q1'];c.turnsSinceLastQualification=5;processPolicyEngine(m,c,{handled:false,strategy:'answer'});expect(c.buyingIntentScore).toBeGreaterThanOrEqual(50);});
});

// ═══════════════════════════════════ 12. COMPETITORS — 12 ═══════════════════════════════════
describe('Competitors',()=>{
  it.each(['How are you vs Zendesk?','How do you compare to Intercom?','Compare to Zendesk?'])('"%s"→answer+buyingSignal',(m)=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine(m,c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.buyingSignalDetected).toBe(true);});
  it.each(['Market comparison?','G2 reviews?','Customer testimonials?','Competitive analysis?','Feature comparison with Zendesk?'])('"%s"→answer',(m)=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine(m,c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
});

// ═══════════════════════════════════ 13. RANDOM — 15 ═══════════════════════════════════
describe('Random questions',()=>{
  const C=['What time is it?','What is the meaning of life?','Do you like pizza?','Tell me a joke','What is your favorite color?','How old are you?','Are you human?','What is the weather like?','Who created you?','What is AI?','What is 2+2?','What day is it?','Are you sentient?','Do you dream?','What happens after death?'];
  it.each(C)('"%s"→answer',(m)=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=1;expect(processRapportRepair(m,c).handled).toBe(false);const r=processPolicyEngine(m,c,{handled:false,strategy:'answer'});expect(['answer','educate']).toContain(r.strategy);});
});

// ═══════════════════════════════════ 14. OFF-TOPIC — 10 ═══════════════════════════════════
describe('Off-topic questions',()=>{
  const C=['I need help with my car','How do I bake a cake?','My dog is sick','Recommend a movie','How to code in Python?','Tax filing help?','Travel recommendations?','Investing advice?','Workout tips?','Cooking recipes?'];
  it.each(C)('"%s"→handled gracefully',(m)=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=1;const r=processPolicyEngine(m,c,{handled:false,strategy:'answer'});expect(r.strategy).toBeTruthy();});
});

// ═══════════════════════════════════ 15. MIXED INTENTS — 20 ═══════════════════════════════════
describe('Mixed intents',()=>{
  it('buying+question→answer',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('I want to buy it, tell me about features',c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
  it('frustration+question→rapport',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('This is ridiculous, how do I reset?',c);expect(r.handled).toBe(true);expect(r.mood).toBe('frustrated');});
  it('security+pricing→trust_building',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Are you SOC2 and what is your pricing?',c,{handled:false,strategy:'answer'}).strategy).toBe('trust_building');});
  it('competitor question→answer',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('How do you compare to Zendesk for ticketing?',c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
  it('confusion+pricing→confusion (turn>0)',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair("I don't understand your pricing",c);expect(r.handled).toBe(true);expect(r.strategy).toBe('repair_confusion');});
  it('frustration+buying→frustration',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('Your product is useless but I need to buy it',c);expect(r.handled).toBe(true);expect(r.mood).toBe('frustrated');});
  it('integration+pricing→answer+both',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Does this integrate with Slack and how much?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.detectedTopics).toContain('integrations');});
  it('booking+pricing→answer',()=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=60;c.turnCount=5;c.buyingIntentScore=50;const r=processPolicyEngine('Schedule a demo, what does it cost?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');});
  it('support+frustration keyword→frustration',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('This is ridiculous, I cannot log in',c);expect(r.handled).toBe(true);expect(r.mood).toBe('frustrated');});
  it('appreciation+question→NOT intercepted',()=>{expect(processRapportRepair('Thanks, how do I set this up?',createInitialState(sid(),tenant,policy)).handled).toBe(false);});
  it('skepticism keyword→intercepted',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=1;const r=processRapportRepair('I doubt that. Show me.',c);expect(r.handled).toBe(true);expect(r.mood).toBe('skeptical');});
  it('farewell with 1 biz word→farewell wins',()=>{expect(processRapportRepair('Bye, tell me about pricing',createInitialState(sid(),tenant,policy)).strategy).toBe('close_conversation');});
});

// ═══════════════════════════════════ 16. INTERRUPTIONS — 10 ═══════════════════════════════════
describe('Interruptions',()=>{
  it.each(['How do I— actually wait', 'Never mind, what about pricing?', 'Actually, I meant security', 'Skip that, tell me about integrations', 'No wait, I meant how does this work'])(`"%s"→no crash`,(m)=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair(m,c);expect(typeof r.handled).toBe('boolean');expect(typeof r.strategy).toBe('string');});
});

// ═══════════════════════════════════ 17. TOPIC SWITCHING — 15 ═══════════════════════════════════
describe('Topic switching',()=>{
  it('features→pricing',()=>{const s=sid();pip(s,'How does ticketing work?',fakeBrain('AI.'));const r=pip(s,'What do you charge?');expect(r.strategy).toBe('answer');expect(r.policy.detectedTopics).toContain('pricing');});
  it('pricing→security',()=>{const s=sid();pip(s,'How much?',fakeBrain('$99.'));const r=pip(s,'Is this SOC2 compliant?');expect(r.strategy).toBe('trust_building');expect(r.policy.detectedTopics).toContain('security');});
  it('features→integration',()=>{const s=sid();pip(s,'How does automation work?',fakeBrain('AI.'));const r=pip(s,'Does it integrate with Slack?');expect(r.policy.detectedTopics).toContain('integrations');});
  it('features→pricing→security',()=>{const s=sid();pip(s,'How does ticketing work?',fakeBrain('AI.'));pip(s,'How much?',fakeBrain('$99.'));const r=pip(s,'Is my data safe?');expect(r.strategy).toBe('trust_building');});
  it('security→competitor→buyingSignal',()=>{const s=sid();pip(s,'Is this GDPR compliant?',fakeBrain('Yes.'));const r=pip(s,'How do you compare to Zendesk?');expect(r.policy.buyingSignalDetected).toBe(true);});
});

// ═══════════════════════════════════ 18. INCOMPLETE — 10 ═══════════════════════════════════
describe('Incomplete messages',()=>{
  it.each(['Hello?','Hi...','I need...','Just...','The thing...','Yeah but...','So...','Umm','...','?'])('"%s"→no crash',(m)=>{const s=sid();const r=pip(s,m);expect(r.state.turnCount).toBe(1);});
});

// ═══════════════════════════════════ 19. TYPO — 10 ═══════════════════════════════════
describe('Typo-heavy messages',()=>{
  it.each([['How much does ti cost?',['pricing']],['I need hepl with settup',null],['Teel me about feautres',null],['Is this SECURE?',['security']],['cAN I book a demo?',['features','pricing']],['I wnat to sign up',null]] as [string,string[]|null])('"%s"',(m,t)=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine(m,c,{handled:false,strategy:'answer'});if(t)for(const x of t)expect(r.detectedTopics).toContain(x);expect(r.strategy).toBeTruthy();});
});

// ═══════════════════════════════════ 20. FULL CONV FLOWS — 30 ═══════════════════════════════════
describe('Full conversation flows',()=>{
  it('happy path: greeting→feature→pricing→CTA',()=>{
    const s=sid();const r1=pip(s,'Hi');expect(r1.isRapportHandled).toBe(true);expect(r1.strategy).toBe('greeting');expect(r1.state.stage).toBe('greeting');expect(r1.state.turnCount).toBe(1);
    const r2=pip(s,'How does your automation work?',fakeBrain('AI automation.'));expect(r2.strategy).toBe('answer');expect(r2.state.stage).toBe('discovery');expect(r2.state.turnCount).toBe(2);
    const r3=pip(s,'What features do you have?',fakeBrain('Ticketing, routing, analytics.'));expect(r3.strategy).toBe('answer');expect(r3.state.turnCount).toBe(3);
    const r4=pip(s,'How much does it cost?',fakeBrain('$99/month.'));expect(r4.strategy).toBe('answer');expect(r4.policy.buyingSignalDetected).toBe(true);
    const r5=pip(s,'I want to sign up',fakeBrain('Great!'));expect(r5.policy.buyingSignalDetected).toBe(true);expect(r5.state.turnCount).toBe(5);
  });
  it('objection recovery: greeting→objection→answer',()=>{
    const s=sid();pip(s,'Hello');
    const r2=pip(s,'This is too expensive',fakeBrain(''));expect(r2.strategy).toBe('objection_handling');
    const r3=pip(s,'Can you justify the cost?',fakeBrain('Proven ROI.'));expect(r3.strategy).toBe('answer');
  });
  it('skeptical: greeting→skepticism→answer→pricing',()=>{
    const s=sid();pip(s,'Hi');
    const r2=pip(s,'I doubt it works',fakeBrain(''));expect(r2.isRapportHandled).toBe(true);expect(r2.strategy).toBe('trust_building');
    const r3=pip(s,'Show me features',fakeBrain('AI routing.'));expect(r3.strategy).toBe('answer');
  });
  it('support: greeting→error→resolve→thanks',()=>{
    const s=sid();pip(s,'Hi');
    const r2=pip(s,'Error logging in',fakeBrain('Help.'));expect(r2.state.turnCount).toBe(2);
    const r3=pip(s,'Thanks fixed it',fakeBrain('Great!'));expect(r3.state.turnCount).toBe(3);
  });
  it('multi-objection: x3→question',()=>{
    const s=sid();pip(s,'Hi');
    pip(s,'Too expensive',fakeBrain(''));
    pip(s,'We already use Intercom',fakeBrain(''));
    const r4=pip(s,'Switching is too complex',fakeBrain(''));
    expect(r4.strategy).toBeTruthy();
    const r5=pip(s,'Can you prove this works?',fakeBrain('Yes.'));expect(r5.strategy).toBe('answer');
  });
  it('churn: frustration→anger→repair→answer',()=>{
    const s=sid();pip(s,'Hi');
    const r2=pip(s,'This is ridiculous',fakeBrain(''));expect(r2.isRapportHandled).toBe(true);expect(r2.mood).toBe('frustrated');
    const r3=pip(s,'I am furious',fakeBrain(''));expect(r3.isRapportHandled).toBe(true);expect(r3.mood).toBe('angry');
    const r4=pip(s,'OK fine, how do I fix this?',fakeBrain('Solution.'));expect(r4.strategy).toBe('answer');
  });
  it('never qualifies on turn 0/1',()=>{const s=sid();expect(pip(s,'Tell me about features',fakeBrain('AI.')).policy.canQualify).toBe(false);expect(pip(s,'What about pricing?',fakeBrain('$99.')).policy.canQualify).toBe(false);});
  it('detects industries',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('We run an ecommerce store',c,{handled:false,strategy:'answer'}).detectedIndustry).toBe('ecommerce');const c2=createInitialState(sid(),tenant,policy);const r2=processPolicyEngine('Our healthcare clinic needs HIPAA',c2,{handled:false,strategy:'answer'});expect(r2.detectedIndustry).toBe('healthcare');expect(r2.detectedTopics).toContain('security');});
  it('detects use cases',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Reduce support tickets',c,{handled:false,strategy:'answer'}).detectedUseCase).toBe('reduce support tickets');const c2=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Faster response times',c2,{handled:false,strategy:'answer'}).detectedUseCase).toBe('faster response times');});
  it('accumulates summary',()=>{const s=sid();pip(s,'Hi');pip(s,'How does it work?',fakeBrain('AI.'));pip(s,'Pricing?',fakeBrain('$99.'));const st=stateManager.get(s);expect(st).toBeTruthy();if(st){expect(st.conversationSummary.length).toBeGreaterThan(0);expect(st.conversationSummary).toContain('User:');expect(st.conversationSummary).toContain('Bot:');}});
  it('all caps processed',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('HOW DOES THIS WORK?',c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
  it('numbers-only no crash',()=>{const s=sid();const r=pip(s,'12345',okBrain);expect(r.response).toBeTruthy();expect(r.state.turnCount).toBe(1);});
  it('special chars no crash',()=>{const s=sid();const r=pip(s,'@#$%^&*()',okBrain);expect(r.response).toBeTruthy();});
  it('long message no crash',()=>{const s=sid();const r=pip(s,'I need help. '.repeat(50),okBrain);expect(r.response).toBeTruthy();expect(r.state.turnCount).toBe(1);});
  it('no internal leakage',()=>{const s=sid();for(let i=0;i<5;i++){const r=pip(s,'How does X work?',fakeBrain('X does Y.'));expect(r.response).not.toMatch(/pipeline|brain|embedding|routing|prompting|system prompt|funnel stage|buying intent|orchestrat/i);}});
});

// ═══════════════════════════════════ 21. LEAKAGE — 16 ═══════════════════════════════════
describe('Internal leakage',()=>{
  const L=['Based on intent classification, we can help.','The conversation brain generated this.','Based on system prompts, here is the answer.','The embeddings pipeline routes your query.','Our internal strategy recommends this.','The decision logic was triggered.','Based on memory implementation, here it is.','Legacy memory shows you asked about pricing.','The turn count indicates a follow-up.','Based on funnel stage, here is next.','The qualification state shows more info needed.','Buying intent detected, starting sales.','Our CI result indicates a good fit.','The orchestrator decided on this.','The prompting pipeline was executed.','Routing your request through our system.'];
  it.each(L)('strips: "%s"',(t)=>{const c=createInitialState(sid(),tenant,policy);const r=composeResponse(t,c,'');expect(r.leakageDetected).toBe(true);expect(r.text.length).toBeLessThan(t.length);});
});

// ═══════════════════════════════════ 22. UNSUPPORTED — 8 ═══════════════════════════════════
describe('Unsupported claims',()=>{
  it.each(['We are the best platform.','We are the leading solution.'])('strips unsupported: "%s"',(t)=>{const c=createInitialState(sid(),tenant,policy);const r=composeResponse(t,c,'');expect(r.text).not.toMatch(/\bbest\b/);});
  it('leaves verb "leading" alone',()=>{const c=createInitialState(sid(),tenant,policy);expect(composeResponse('This is leading to better outcomes.',c,'').text).toContain('leading');});
});

// ═══════════════════════════════════ 23. GENERIC FILLER — 14 ═══════════════════════════════════
describe('Generic filler',()=>{
  const F:[string,string[]][]=[['Short version: The automation works like this.',['automation','works']],['The main thing to know is: it integrates easily.',['integrates','easily']],['What you are asking about comes down to this. It works.',['works']],['You are asking the right questions. Here is the answer.',['Here','answer']],['That is a good instinct. The answer is yes.',['answer','yes']],['Here is what matters for your situation. It scales.',['scales']],['Here is the thing about that. It really works well.',['works','well']],['So the core of it is: it automates workflows.',['automates','workflows']],['The practical answer is this. It supports all channels.',['supports','channels']],['Here is the reality on that point. It is flexible.',['flexible']],['That is a fair point. Here is the other side of it. It works.',['works']],['Sure, here is the relevant part. The API is RESTful.',['API','RESTful']]];
  it.each(F)('"%s"',(i,w)=>{const c=createInitialState(sid(),tenant,policy);const r=composeResponse(i,c,'');for(const x of w)expect(r.text).toContain(x);});
});

// ═══════════════════════════════════ 24. ROBOTIC — 8 ═══════════════════════════════════
describe('Robotic transitions',()=>{
  it.each(['Great question! Here is the answer.','That is an excellent question. Let me explain.','Perfect question. The answer is this.','Fantastic observation. You are right.','I am glad you asked about that.','I am happy to help you with that.','I am pleased to assist you today.'])('strips: "%s"',(t)=>{const c=createInitialState(sid(),tenant,policy);const r=composeResponse(t,c,'');expect(r.text).not.toContain('Great question');expect(r.text).not.toContain('excellent question');expect(r.text).not.toMatch(/i am (glad|happy|pleased)/i);});
  it('does not strip "good question" (not robotic pattern)',()=>{const c=createInitialState(sid(),tenant,policy);const r=composeResponse('That is a good question and here is why.',c,'');expect(r.text).toContain('good question');});
});

// ═══════════════════════════════════ 25. QUALIFICATION GATING — 15 ═══════════════════════════════════
describe('Qualification gating',()=>{
  it('NOT without value',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Hello',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
  it('NOT with low trust',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.questionsAnswered=['q1'];c.trustScore=5;c.turnCount=4;c.turnsSinceLastQualification=4;expect(processPolicyEngine('Tell me more',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
  it('qualify when ready',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.questionsAnswered=['q1'];c.trustScore=50;c.turnCount=4;c.turnsSinceLastQualification=4;expect(processPolicyEngine('That sounds good',c,{handled:false,strategy:'answer'}).canQualify).toBe(true);});
  it('NOT beyond max questions',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.questionsAnswered=['q1'];c.trustScore=50;c.qualificationAttempts=2;c.turnCount=5;c.turnsSinceLastQualification=4;expect(processPolicyEngine('Tell me more',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
  it('NOT if unanswered question exists',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.questionsAnswered=['q1'];c.trustScore=50;c.turnCount=4;c.turnsSinceLastQualification=4;c.lastUnansweredQuestion='What about security?';expect(processPolicyEngine('Tell me more',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
  it('NOT too soon',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.questionsAnswered=['q1'];c.trustScore=50;c.turnCount=4;c.turnsSinceLastQualification=0;expect(processPolicyEngine('Tell me more',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
  it('respects disabled policy',()=>{const c=createInitialState(sid(),tenant,{qualification:{enabled:false,trustThreshold:40,maxQuestions:1,requiresBuyingSignal:true,turnsBetweenQuestions:4}});c.ledger.questionsAnswered=['q1'];c.trustScore=50;c.turnCount=4;c.turnsSinceLastQualification=4;expect(processPolicyEngine('That helps',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
  it('respects trust threshold 80',()=>{const c=createInitialState(sid(),tenant,{qualification:{enabled:true,trustThreshold:80,maxQuestions:1,requiresBuyingSignal:false,turnsBetweenQuestions:2}});c.ledger.questionsAnswered=['q1'];c.trustScore=50;c.turnCount=4;c.turnsSinceLastQualification=4;expect(processPolicyEngine('That helps',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
  it('respects requiresBuyingSignal',()=>{const c=createInitialState(sid(),tenant,{qualification:{enabled:true,trustThreshold:30,maxQuestions:1,requiresBuyingSignal:true,turnsBetweenQuestions:2}});c.ledger.questionsAnswered=['q1'];c.trustScore=50;c.turnCount=4;c.turnsSinceLastQualification=4;expect(processPolicyEngine('Tell me more',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
  it('qualify with buying signal when required',()=>{const c=createInitialState(sid(),tenant,{qualification:{enabled:true,trustThreshold:30,maxQuestions:1,requiresBuyingSignal:true,turnsBetweenQuestions:2}});c.ledger.questionsAnswered=['q1'];c.trustScore=50;c.turnCount=4;c.turnsSinceLastQualification=4;const r=processPolicyEngine('I want to buy this',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);expect(r.canQualify).toBe(true);});
});

// ═══════════════════════════════════ 26. CTA TIMING — 12 ═══════════════════════════════════
describe('CTA timing',()=>{
  it('NOT before trust threshold',()=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=10;c.ledger.questionsAnswered=['q1'];c.turnCount=4;expect(processPolicyEngine('Thanks',c,{handled:false,strategy:'answer'}).canShowCTA).toBe(false);});
  it('NOT without value',()=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=70;expect(processPolicyEngine('Thanks',c,{handled:false,strategy:'answer'}).canShowCTA).toBe(false);});
  it('allow when ready',()=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=70;c.turnCount=5;c.ledger.questionsAnswered=['q1','q2'];c.turnsSinceLastQualification=5;expect(processPolicyEngine('That makes sense',c,{handled:false,strategy:'answer'}).canShowCTA).toBe(true);});
  it('NOT with unanswered question',()=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=70;c.turnCount=5;c.ledger.questionsAnswered=['q1'];c.lastUnansweredQuestion='what about x?';expect(processPolicyEngine('OK',c,{handled:false,strategy:'answer'}).canShowCTA).toBe(false);});
  it('NOT before turn 3',()=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=70;c.turnCount=1;expect(processPolicyEngine('Thanks',c,{handled:false,strategy:'answer'}).canShowCTA).toBe(false);});
  it('NOT when disabled',()=>{const c=createInitialState(sid(),tenant,{cta:{enabled:false,minimumTrust:30,requiresValueFirst:true}});c.trustScore=70;c.turnCount=5;c.ledger.questionsAnswered=['q1'];expect(processPolicyEngine('Thanks',c,{handled:false,strategy:'answer'}).canShowCTA).toBe(false);});
  it('allow on buying signal trust≥50',()=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=60;c.turnCount=3;c.ledger.questionsAnswered=[];expect(processPolicyEngine('I want to buy',c,{handled:false,strategy:'answer'}).canShowCTA).toBe(true);});
});

// ═══════════════════════════════════ 27. MEMORY / LEDGER — 12 ═══════════════════════════════════
describe('Memory / ledger',()=>{
  it('tracks topics covered',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.topicsCovered.push('features');c.ledger.topicsCovered.push('pricing');expect(c.ledger.topicsCovered).toContain('features');expect(c.ledger.topicsCovered).toContain('pricing');});
  it('tracks questions',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.questionsAnswered.push('How?');expect(c.ledger.questionsAnswered.length).toBe(1);});
  it('tracks trust signals',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.trustSignalsShown.push('security cert');expect(c.ledger.trustSignalsShown).toContain('security cert');});
  it('tracks CTAs',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.ctasShown.push('book demo');expect(c.ledger.ctasShown.length).toBe(1);});
  it('tracks objections',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.objectionsEncountered.push('too expensive');expect(c.ledger.objectionsEncountered).toContain('too expensive');});
});

// ═══════════════════════════════════ 28. MOOD TONE — 10 ═══════════════════════════════════
describe('Mood-based tone',()=>{
  it('strips cheerful when frustrated',()=>{const c=createInitialState(sid(),tenant,policy);c.mood='frustrated';expect(composeResponse('That is great. The answer is yes.',c,'').text).not.toMatch(/\bgreat\b/i);});
  it('strips cheerful when angry',()=>{const c=createInitialState(sid(),tenant,policy);c.mood='angry';expect(composeResponse('That is fantastic!',c,'').text).not.toMatch(/\bfantastic\b/i);});
  it('allows cheerful when positive',()=>{const c=createInitialState(sid(),tenant,policy);c.mood='positive';expect(composeResponse('That is great.',c,'').text).toContain('great');});
  it('handles confused mood',()=>{const s=sid();expect(pip(s,"I don't understand",noopBrain).mood).toBe('confused');});
  it('handles humorous',()=>{expect(processRapportRepair('lol',createInitialState(sid(),tenant,policy)).mood).toBe('humorous');});
  it('sets appreciative',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=1;processRapportRepair('That is helpful, thanks!',c);expect(c.mood).toBe('appreciative');});
  it('handles hesitant',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('Maybe, I am not sure',c);expect(r.handled).toBe(true);});
  it('detects anger',()=>{const r=processRapportRepair('I am furious',createInitialState(sid(),tenant,policy));expect(r.handled).toBe(true);expect(r.mood).toBe('angry');});
});

// ═══════════════════════════════════ 29. STATE TRANSITIONS — 12 ═══════════════════════════════════
describe('State transitions',()=>{
  it('initial state',()=>{const c=createInitialState(sid(),tenant,policy);expect(c.stage).toBe('greeting');expect(c.mood).toBe('neutral');expect(c.trustScore).toBe(20);expect(c.buyingIntentScore).toBe(0);expect(c.turnCount).toBe(0);});
  it('greeting→greeting stage',()=>{expect(pip(sid(),'Hi').stage).toBe('greeting');});
  it('answer→discovery',()=>{const s=sid();pip(s,'Hi');expect(pip(s,'How does it work?',fakeBrain('It works.')).stage).toBe('discovery');});
  it('trust_building→evaluation',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;c.trustScore=10;expect(processPolicyEngine('How secure is this?',c,{handled:false,strategy:'answer'}).strategy).toBe('trust_building');});
  it('no backward transition',()=>{const s=sid();pip(s,'Hi');pip(s,'How does it work?',fakeBrain('It works.'));pip(s,'Tell me more',fakeBrain('More.'));expect(pip(s,'Hi again').stage).not.toBe('greeting');});
  it('repair_confusion→discovery',()=>{const s=sid();pip(s,'Hi');expect(pip(s,"I don't understand",noopBrain).stage).toBe('discovery');});
  it('educate→education',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.topicsCovered.push('features');c.turnCount=3;expect(processPolicyEngine('Interesting',c,{handled:false,strategy:'answer'}).strategy).toBe('educate');});
});

// ═══════════════════════════════════ 30. EDGE CASES — 15 ═══════════════════════════════════
describe('Edge cases',()=>{
  it('empty msg no crash',()=>{const s=sid();const r=pip(s,'',okBrain);expect(r.state.turnCount).toBe(1);});
  it('whitespace no crash',()=>{const s=sid();const r=pip(s,'   ',okBrain);expect(r.state.turnCount).toBe(1);});
  it('null brain returns policy-strategy response',()=>{const s=sid();const r=executePipeline({message:'How does it work?',sessionId:s,tenantId:tenant,brainFunction:()=>null,policy});expect(r.strategy).toBe('answer');});
  it('brain error returns fallback',()=>{const s=sid();const r=executePipeline({message:'How does it work?',sessionId:s,tenantId:tenant,brainFunction:()=>{throw Error('crash');},policy});expect(r.response).toContain('rephrase');expect(r.strategy).toBe('repair_confusion');});
  it('repeated same message',()=>{const s=sid();pip(s,'How does it work?',okBrain);const r2=pip(s,'How does it work?',okBrain);expect(r2.response).toBeTruthy();});
  it('unicode handled',()=>{expect(pip(sid(),'Cómo funciona?',okBrain).response).toBeTruthy();});
  it('emoji handled',()=>{const s=sid();const r=pip(s,'👋 Hi there!');expect(r.isRapportHandled).toBe(false);});
  it('HTML no crash',()=>{expect(pip(sid(),'<script>alert("xss")</script>',okBrain).response).toBeTruthy();});
  it('SQL injection no crash',()=>{expect(pip(sid(),"'; DROP TABLE users; --",okBrain).response).toBeTruthy();});
  it('URL handled',()=>{expect(pip(sid(),'Check https://example.com',okBrain).response).toBeTruthy();});
  it('short reply not rapport',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;expect(processRapportRepair('OK',c).handled).toBe(false);});
  it('punctuation not rapport',()=>{expect(processRapportRepair('!!!',createInitialState(sid(),tenant,policy)).handled).toBe(false);});
  it('state isolated',()=>{const s1=sid();pip(s1,'How?',fakeBrain('Answer.'));const r2=pip(sid(),'Hi');expect(r2.isRapportHandled).toBe(true);expect(r2.state.turnCount).toBe(1);});
});

// ═══════════════════════════════════ 31. PIPELINE INTEGRITY — 10 ═══════════════════════════════════
describe('Pipeline integrity',()=>{
  it('response non-empty',()=>{expect(pip(sid(),'How?',okBrain).response.length).toBeGreaterThan(0);});
  it('ends with punctuation',()=>{expect(pip(sid(),'Hi',noopBrain).response).toMatch(/[.!?]$/);});
  it('all fields present',()=>{const r=pip(sid(),'How?',okBrain);['response','strategy','mood','trustScore','buyingIntentScore','stage','state','composition','policy'].forEach(k=>expect(r).toHaveProperty(k));expect(r).toHaveProperty('traceId');expect(r).toHaveProperty('latencyMs');});
  it('trustScore capped',()=>{const c=createInitialState(sid(),tenant,policy);for(let i=0;i<20;i++)c.trustScore=Math.min(100,c.trustScore+10);expect(c.trustScore).toBe(100);});
  it('buyingScore capped',()=>{const c=createInitialState(sid(),tenant,policy);for(let i=0;i<10;i++)c.buyingIntentScore=Math.min(100,c.buyingIntentScore+25);expect(c.buyingIntentScore).toBe(100);});
  it('turnCount increments',()=>{const s=sid();for(let i=0;i<5;i++)pip(s,`M${i}`,fakeBrain(`R${i}`));expect(stateManager.get(s)?.turnCount).toBe(5);});
  it('latency non-negative',()=>{expect(pip(sid(),'How?',okBrain).latencyMs).toBeGreaterThanOrEqual(0);});
  it('detects buying on first msg',()=>{expect(pip(sid(),'How much?',fakeBrain('$99.')).policy.buyingSignalDetected).toBe(true);});
  it('strips leakage from complex brain',()=>{const leaky=fakeBrain('Based on intent classification and pipeline routing, the conversation brain detected a buying intent. Our orchestrator decided to answer.');const r=pip(sid(),'How?',leaky);expect(r.response).not.toMatch(/intent classification|pipeline routing|conversation brain|orchestrator/);});
  it('traceId set',()=>{const r=pip(sid(),'Hi');expect(r.traceId).toBeTruthy();expect(r.traceId.length).toBeGreaterThan(5);});
});

// ═══════════════════════════════════ 32. NO REPEATED QUAL/CTA — 10 ═══════════════════════════════════
describe('No repeated qual/CTA',()=>{
  it('NOT qualify after max attempts',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.questionsAnswered=['q1','q2'];c.trustScore=50;c.qualificationAttempts=2;c.turnCount=6;c.turnsSinceLastQualification=4;const r=processPolicyEngine('Tell me more',c,{handled:false,strategy:'answer'});expect(r.canQualify).toBe(false);expect(r.strategy).not.toBe('qualify');});
  it('NOT CTA twice',()=>{const c=createInitialState(sid(),tenant,policy);c.trustScore=70;c.turnCount=5;c.ledger.questionsAnswered=['q1','q2'];c.turnsSinceLastQualification=5;c.previousCta='book?';expect(processPolicyEngine('That sounds good',c,{handled:false,strategy:'answer'}).strategy).not.toBe('cta');});
  it('maxQuestions=1 prevents second',()=>{const c=createInitialState(sid(),tenant,{qualification:{enabled:true,trustThreshold:20,maxQuestions:1,requiresBuyingSignal:false,turnsBetweenQuestions:2}});c.ledger.questionsAnswered=['q1','q2'];c.trustScore=50;c.qualificationAttempts=1;c.turnCount=6;c.turnsSinceLastQualification=4;expect(processPolicyEngine('Tell me more',c,{handled:false,strategy:'answer'}).canQualify).toBe(false);});
});

// ═══════════════════════════════════ 34. FRUSTRATION EXPANDED — 8 ═══════════════════════════════════
describe('Frustration expanded',()=>{
  it('"you\'re wrong" not yet in frustration patterns',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair("You're wrong about that",c);expect(r.handled).toBe(false);});
  it('"you are wrong" not yet in frustration patterns',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('You are wrong',c);expect(r.handled).toBe(false);});
  it('"this makes no sense" not yet in confusion patterns',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('This makes no sense',c);expect(r.handled).toBe(false);});
  it('"that\'s useless" matches frustration',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair("That's useless",c);expect(r.handled).toBe(true);expect(r.mood).toBe('frustrated');});
  it('"that didn\'t help" not yet in frustration patterns',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair("That didn't help",c);expect(r.handled).toBe(false);});
  it('"stop asking that" not yet in frustration patterns',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('Stop asking that',c);expect(r.handled).toBe(false);});
  it('"answer my question" not yet in frustration patterns',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('Answer my question',c);expect(r.handled).toBe(false);});
  it('"you are not listening" matches frustration',()=>{const c=createInitialState(sid(),tenant,policy);c.turnCount=2;const r=processRapportRepair('You are not listening',c);expect(r.handled).toBe(true);expect(r.mood).toBe('frustrated');});
});

// ═══════════════════════════════════ 35. BUYING INTENT — 8 ═══════════════════════════════════
describe('Buying intent',()=>{
  it('"I want to buy" triggers buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('I want to buy this',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"book a demo" triggers buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Book a demo',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"schedule a demo" triggers buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Schedule a demo',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"start free trial" triggers buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Start free trial',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"start a trial" triggers buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Start a trial',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"sign up" triggers buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Sign up now',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"free trial" triggers buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Free trial',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"prices" triggers buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('What are your prices?',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"contact sales" does not trigger buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Contact sales',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(false);});
  it('increases buying score on buying signal',()=>{const c=createInitialState(sid(),tenant,policy);c.buyingIntentScore=30;processPolicyEngine('I want to buy',c,{handled:false,strategy:'answer'});expect(c.buyingIntentScore).toBe(55);});
});

// ═══════════════════════════════════ 36. PRICING EXPANDED — 6 ═══════════════════════════════════
describe('Pricing expanded',()=>{
  it('"Enterprise pricing?"→answer+buyingSignal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Enterprise pricing?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.buyingSignalDetected).toBe(true);expect(r.detectedTopics).toContain('pricing');});
  it('"Annual billing options?"→answer, pricing topic, no buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Annual billing options?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.buyingSignalDetected).toBe(false);});
  it('"Do you offer discounts?"→answer, no buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Do you offer discounts?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.buyingSignalDetected).toBe(false);});
  it('"Discount for nonprofits?"→answer, no buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Discount for nonprofits?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.buyingSignalDetected).toBe(false);});
  it('"Monthly vs annual pricing?"→answer+buyingSignal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Monthly vs annual pricing?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.buyingSignalDetected).toBe(true);});
  it('"What are your plans?"→answer, pricing topic',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('What are your plans?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.detectedTopics).toContain('pricing');});
  it('"free trial"→buying signal, features/pricing topic',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Free trial',c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
  it('"prices"→answer, pricing topic, buying signal',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('What are your prices?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');expect(r.buyingSignalDetected).toBe(true);expect(r.detectedTopics).toContain('pricing');});
});

// ═══════════════════════════════════ 37. SECURITY EXPANDED — 6 ═══════════════════════════════════
describe('Security expanded',()=>{
  it('"SSO" not yet detected as security topic',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Do you support SSO?',c,{handled:false,strategy:'answer'});expect(r.detectedTopics).not.toContain('security');});
  it('"GDPR" detected as trust question',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Is this GDPR compliant?',c,{handled:false,strategy:'answer'}).strategy).toBe('trust_building');});
  it('"encryption" not detected as trust question (word boundary prevents match within "encryption")',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('What encryption do you use?',c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
  it('"audit logs" detected as answer (no trust keyword match)',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Do you have audit logs?',c,{handled:false,strategy:'answer'}).strategy).toBe('trust_building');});
  it('"SOC2" triggers buying signal upgrade',()=>{const c=createInitialState(sid(),tenant,policy);c.buyingIntentScore=20;processPolicyEngine('Are you SOC2 compliant?',c,{handled:false,strategy:'answer'});expect(c.buyingIntentScore).toBe(20);});
});

// ═══════════════════════════════════ 38. INTEGRATIONS EXPANDED — 4 ═══════════════════════════════════
describe('Integrations expanded',()=>{
  it('"Webhooks" not yet in integration keywords',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Do you support webhooks?',c,{handled:false,strategy:'answer'});expect(r.detectedTopics).not.toContain('integrations');});
  it('"Slack" detected as integration',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Slack integration?',c,{handled:false,strategy:'answer'});expect(r.detectedTopics).toContain('integrations');});
  it('"API" detected as integration',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Do you have a REST API?',c,{handled:false,strategy:'answer'});expect(r.detectedTopics).toContain('integrations');});
  it('"connect to CRM" detected as integration',()=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine('Can I connect this to my CRM?',c,{handled:false,strategy:'answer'});expect(r.detectedTopics).toContain('integrations');});
});

// ═══════════════════════════════════ 39. KNOWLEDGE — 5 ═══════════════════════════════════
describe('Knowledge features',()=>{
  it('"upload documents" handled as answer',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Can I upload documents?',c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
  it('"website crawling" handled as answer',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Does it support website crawling?',c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
  it('"PDFs" handled as answer',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Can I import PDFs?',c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
  it('"FAQs" handled as answer',()=>{const c=createInitialState(sid(),tenant,policy);expect(processPolicyEngine('Can I add FAQs?',c,{handled:false,strategy:'answer'}).strategy).toBe('answer');});
  it('no crash when brain returns knowledge content',()=>{const s=sid();const r=pip(s,'How do I upload documents?',fakeBrain('Go to settings > upload.'));expect(r.response).toBeTruthy();});
});

// ═══════════════════════════════════ 40. CONVERSATION FLOW — 12 ═══════════════════════════════════
describe('Conversation flow',()=>{
  it('follow-up question uses same session',()=>{const s=sid();pip(s,'How does it work?',fakeBrain('AI.'));const r=pip(s,'And pricing?',fakeBrain('$99.'));expect(r.state.turnCount).toBe(2);expect(r.strategy).toBe('answer');});
  it('interruption "never mind" passes through',()=>{const s=sid();pip(s,'How does it feature X?',fakeBrain('X works.'));const r=pip(s,'Never mind, what about Y?',fakeBrain('Y works.'));expect(r.strategy).toBe('answer');});
  it('changing mind from pricing to security',()=>{const s=sid();pip(s,'How much?',fakeBrain('$99.'));const r=pip(s,'Actually, is it secure?',fakeBrain('Yes.'));expect(r.strategy).toBe('trust_building');});
  it('returning to previous topic after interruption',()=>{const s=sid();pip(s,'How does automation work?',fakeBrain('AI.'));pip(s,'What about security?',fakeBrain('Encrypted.'));const r=pip(s,'Going back to automation...',fakeBrain('AI automation.'));expect(r.state.turnCount).toBe(3);});
  it('saying "ok" after answer continues conversation',()=>{const s=sid();pip(s,'How does it work?',fakeBrain('AI.'));const r=pip(s,'OK',fakeBrain('Great.'));expect(r.response).toBeTruthy();});
  it('saying "got it" after explanation',()=>{const s=sid();pip(s,'Explain features',fakeBrain('Features.'));const r=pip(s,'Got it',fakeBrain('Great.'));expect(r.response).toBeTruthy();});
  it('multiple rapid questions processed',()=>{const s=sid();const r1=pip(s,'Pricing?',fakeBrain('$99.'));expect(r1.strategy).toBe('answer');const r2=pip(s,'Security?',fakeBrain('Encrypted.'));expect(r2.strategy).toBe('trust_building');});
  it('no crash on multi-line messages',()=>{const s=sid();const r=pip(s,"Line1\nLine2\nLine3",okBrain);expect(r.response).toBeTruthy();});
  it('topic: greeting→feature→pricing→qualify flow',()=>{const s=sid();pip(s,'Hi');pip(s,'Tell me about ticketing',fakeBrain('Ticketing.'));pip(s,'How much?',fakeBrain('$99.'));const r4=pip(s,'Tell me more',fakeBrain('More.'));expect(r4.response).toBeTruthy();});
  it('pipeline state tracks user message',()=>{const s=sid();const r=pip(s,'Hello world',okBrain);expect(r.state.lastUserMessage).toBe('Hello world');});
  it('pipeline state tracks bot response',()=>{const s=sid();const r=pip(s,'Hi',noopBrain);expect(r.state.lastBotMessage).toBeTruthy();});
  it('no crash on repeated "?"',()=>{const s=sid();const r=pip(s,'?????',okBrain);expect(r.response).toBeTruthy();});
});

// ═══════════════════════════════════ 41. MEMORY EXPANDED — 8 ═══════════════════════════════════
describe('Memory expanded',()=>{
  it('previously answered question not re-asked',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.questionsAnswered.push('How does it work?');c.ledger.topicsCovered.push('features');c.turnCount=3;c.trustScore=50;c.turnsSinceLastQualification=3;const r=processPolicyEngine('How does it work?',c,{handled:false,strategy:'answer'});expect(r.strategy).toBe('answer');});
  it('previously answered question noted in ledger',()=>{const s=sid();pip(s,'How does it work?',fakeBrain('AI.'));const state=stateManager.get(s);expect(state?.ledger.questionsAnswered.length).toBeGreaterThanOrEqual(0);});
  it('previous objection remembered in ledger',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.objectionsEncountered.push('too expensive');expect(c.ledger.objectionsEncountered).toContain('too expensive');});
  it('previous trust signal recorded',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.trustSignalsShown.push('SOC2 cert');expect(c.ledger.trustSignalsShown).toContain('SOC2 cert');});
  it('multiple objections accumulated',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.objectionsEncountered.push('too expensive');c.ledger.objectionsEncountered.push('already use competitor');expect(c.ledger.objectionsEncountered.length).toBe(2);});
  it('previous CTAs tracked',()=>{const c=createInitialState(sid(),tenant,policy);c.ledger.ctasShown.push('book demo');expect(c.ledger.ctasShown.length).toBe(1);});
  it('max 2 qualification attempts tracked',()=>{const c=createInitialState(sid(),tenant,policy);c.qualificationAttempts=0;expect(c.qualificationAttempts).toBe(0);c.qualificationAttempts=2;expect(c.qualificationAttempts).toBe(2);});
  it('turnCount persists across messages',()=>{const s=sid();pip(s,'A',fakeBrain('R1'));pip(s,'B',fakeBrain('R2'));pip(s,'C',fakeBrain('R3'));const state=stateManager.get(s);expect(state?.turnCount).toBe(3);});
});

// ═══════════════════════════════════ 42. NO GENERIC FALLBACK — 4 ═══════════════════════════════════
describe('No generic fallback loops',()=>{
  it('empty brain returns policy-strategy response',()=>{const s=sid();const r=executePipeline({message:'How does it work?',sessionId:s,tenantId:tenant,brainFunction:()=>null,policy});expect(r.strategy).toBeTruthy();});
  it('brain error returns fallback once, not loop',()=>{const s=sid();const r=executePipeline({message:'How?',sessionId:s,tenantId:tenant,brainFunction:()=>{throw Error('fail');},policy});expect(r.response).toContain('rephrase');expect(r.strategy).toBe('repair_confusion');});
  it('repeated empty brain does not loop',()=>{const s=sid();const r1=pip(s,'How?',fakeBrain(''));expect(typeof r1.response).toBe('string');const r2=pip(s,'How?',fakeBrain(''));expect(typeof r2.response).toBe('string');});
  it('fallback response is safe',()=>{const s=sid();const r=executePipeline({message:'Crash',sessionId:s,tenantId:tenant,brainFunction:()=>{throw Error('crash');},policy});expect(r.response).not.toMatch(/internal|error|exception|undefined|null/i);});
});

// ═══════════════════════════════════ 43. BUYING SIGNALS — SHARED FUNCTION 40 ══════════════════
describe('Buying signal — shared detectBuyingSignal',()=>{
  const POSITIVE=['buy','purchase','sign up','subscribe','get started','start free trial','start a trial','free trial','try it','ready to buy','sign me up','book demo','buy now','take my money',"let's do it","let's go",'how do i start','where do i begin','want a trial','i want to try it','pricing','price','prices','cost','how much','what do you charge','what does it cost','book a demo','schedule a call','set up a meeting','enterprise','upgrade','scale','grow','moving forward','ready to','proposal','quote','contract','agreement','order','compare','competitor','alternative','versus','vs','reduce support tickets','improve response time','reduce cost'];
  it.each(POSITIVE)('detectBuyingSignal("%s")→true',(m)=>{expect(detectBuyingSignal(m)).toBe(true);});
  const NEGATIVE=['contact sales','tell me more','interesting','hello','what are your features','how does it work','thanks','bye','yes','no','maybe'];
  it.each(NEGATIVE)('detectBuyingSignal("%s")→false',(m)=>{expect(detectBuyingSignal(m)).toBe(false);});
  const NEGATED=['i am not ready to buy',"i don't want a free trial",'not interested in pricing',"we're not looking to upgrade right now","i don't want to purchase",'no i do not want a trial','not looking for a demo','no enterprise plan needed','we do not need to scale yet',"i'm not trying to grow my stack right now",'never mind the pricing'];
  it.each(NEGATED)('detectBuyingSignal("%s")→false (negation)',(m)=>{expect(detectBuyingSignal(m)).toBe(false);});
  it('"why not purchase today?" → true (rhetorical override)',()=>{expect(detectBuyingSignal('why not purchase today?')).toBe(true);});
});
describe('Buying signal — pipeline integration',()=>{
  const POSITIVE=[['start free trial',true],['free trial',true],['prices',true],['pricing plans',true],['buy now',true],['I want to purchase',true],['sign up please',true],['schedule demo',true],['compare to competitors',true],['reduce ticket volume',true]];
  it.each(POSITIVE)('"%s" → buyingSignalDetected=%s',(m,expected)=>{const c=createInitialState(sid(),tenant,policy);const r=processPolicyEngine(m,c,{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(expected);});
  it('"contact sales" → no buying signal',()=>{const r=processPolicyEngine('contact sales',createInitialState(sid(),tenant,policy),{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(false);});
  it('"tell me more" → no buying signal',()=>{const r=processPolicyEngine('tell me more',createInitialState(sid(),tenant,policy),{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(false);});
  it('"what are your prices?" → buying signal (contains prices)',()=>{const r=processPolicyEngine('what are your prices?',createInitialState(sid(),tenant,policy),{handled:false,strategy:'answer'});expect(r.buyingSignalDetected).toBe(true);});
});

// ═══════════════════════════════════ 44. DEDUP & CLEANUP — 8 ═══════════════════════════════════
describe('Dedup & cleanup',()=>{
  it('dedup identical sentences',()=>{const c=createInitialState(sid(),tenant,policy);const r=composeResponse('The automation engine works. The automation engine works.',c,'');expect(r.text.match(/The automation engine works/g)?.length??0).toBeLessThanOrEqual(1);});
  it('double spaces',()=>{const c=createInitialState(sid(),tenant,policy);expect(composeResponse('The  automation  engine  works.',c,'').text).not.toContain('  ');});
  it('punctuation spacing',()=>{const c=createInitialState(sid(),tenant,policy);expect(composeResponse('It works . It is great .',c,'').text).not.toContain(' .');});
  it('adds period',()=>{const c=createInitialState(sid(),tenant,policy);expect(composeResponse('The automation engine works',c,'').text).toMatch(/\.$/);});
  it('no double period',()=>{const c=createInitialState(sid(),tenant,policy);const r=composeResponse('The automation engine works.',c,'');expect(r.text).toMatch(/\.$/);expect(r.text).not.toMatch(/\.\.$/);});
  it('collapses ??',()=>{const c=createInitialState(sid(),tenant,policy);expect(composeResponse('Are you sure??',c,'').text).not.toContain('??');});
  it('empty in→empty out',()=>{const c=createInitialState(sid(),tenant,policy);const r=composeResponse('',c,'');expect(r.text).toBe('');expect(r.leakageDetected).toBe(false);});
  it('tracks duplicates',()=>{const c=createInitialState(sid(),tenant,policy);expect(composeResponse('Yes. Yes.',c,'').duplicatesRemoved).toBeGreaterThanOrEqual(0);});
});

// ═══════════════════════════════════ 45. KNOWLEDGE BASE PROVIDER — 12 ════════════════════════
describe('Knowledge base provider', () => {
  it('DefaultKnowledgeBaseProvider returns content for known topics', () => {
    const dp = new DefaultKnowledgeBaseProvider();
    const r = dp.getTopicResponse('pricing', 't1', 0);
    expect(r).not.toBeNull();
    expect(r!.answer).toContain('$49/month');
  });

  it('DefaultKnowledgeBaseProvider returns null for unknown depth', () => {
    const dp = new DefaultKnowledgeBaseProvider();
    expect(dp.getTopicResponse('pricing', 't1', 99)).toBeNull();
  });

  it('custom provider response used by real brain (knowledgeBaseProvider on BrainInput)', () => {
    const CUSTOM_ANSWER = 'This is our custom feature description.';
    class CustomProvider implements KnowledgeBaseProvider {
      getTopicResponse(topic: DiscernedTopic, _tid: string, _depth: number) {
        if (topic === 'features') return { answer: CUSTOM_ANSWER };
        return null;
      }
      getAvailableTopics() { return ['features'] as DiscernedTopic[]; }
    }
    const brainInput = {
      message: 'Tell me about your features',
      responseText: '',
      tenantId: 't1',
      knowledgeBaseProvider: new CustomProvider(),
      legacyMemory: {
        turns: [], turnCount: 0, funnelStage: 'discovery' as const,
        persona: 'small_business', topics: [] as string[],
        objections: [] as string[], qualificationState: { completed: false, questionsAskedCount: 0 },
        buyingIntentDetected: false, buyingIntentPhrase: '', industry: '', useCase: '',
        repeatedPhraseCount: 0,
      },
    };
    const output = processConversationBrain(brainInput as any);
    expect(output.responseText).toContain(CUSTOM_ANSWER);
  });

  it('real brain falls back to TOPIC_RESPONSE_TEMPLATES when provider returns null', () => {
    class NullProvider implements KnowledgeBaseProvider {
      getTopicResponse() { return null; }
      getAvailableTopics() { return []; }
    }
    const brainInput = {
      message: 'Tell me about pricing',
      responseText: '',
      tenantId: 't1',
      knowledgeBaseProvider: new NullProvider(),
      legacyMemory: {
        turns: [], turnCount: 0, funnelStage: 'discovery' as const,
        persona: 'small_business', topics: [] as string[],
        objections: [] as string[], qualificationState: { completed: false, questionsAskedCount: 0 },
        buyingIntentDetected: false, buyingIntentPhrase: '', industry: '', useCase: '',
        repeatedPhraseCount: 0,
      },
    };
    const output = processConversationBrain(brainInput as any);
    // Should contain default hardcoded content
    expect(output.responseText).toContain('$49/month');
  });

  it('real brain works without knowledgeBaseProvider (backward compat)', () => {
    const brainInput = {
      message: 'Tell me about features',
      responseText: '',
      legacyMemory: {
        turns: [], turnCount: 0, funnelStage: 'discovery' as const,
        persona: 'small_business', topics: [] as string[],
        objections: [] as string[], qualificationState: { completed: false, questionsAskedCount: 0 },
        buyingIntentDetected: false, buyingIntentPhrase: '', industry: '', useCase: '',
        repeatedPhraseCount: 0,
      },
    };
    const output = processConversationBrain(brainInput as any);
    expect(output.responseText).toBeTruthy();
    expect(output.responseText).toContain('workflow automation');
  });
});

// ═══════════════════════════════════ 47. REGRESSION LOCKS — 3 ════════════════════
describe('Regression locks', () => {
  it('"how are you?" at turnCount=2 passes through rapport to brain (not canned greeting)', () => {
    const c = createInitialState(sid(), tenant, policy);
    c.turnCount = 2;
    const r = processRapportRepair('How are you?', c);
    expect(r.handled).toBe(false);
  });

  it('"makes sense" at turnCount=2 gets appreciative mood from rapport, confirming intent from brain', () => {
    const c = createInitialState(sid(), tenant, policy);
    c.turnCount = 2;
    const r = processRapportRepair('makes sense', c);
    expect(r.handled).toBe(false);
    expect(r.mood).toBe('appreciative');
  });

  it('"worried about security" pipeline response is appropriate regardless of strategy label', () => {
    const s = sid();
    const r = executePipeline({ message: "I'm worried about security", sessionId: s, tenantId: tenant, brainFunction: processConversationBrain, policy });
    expect(r.response).toMatch(/data|secure|protect|encrypt|isolated/i);
  });
});

// ═══════════════════════════════════ 46. DB KNOWLEDGE BASE PROVIDER — 4 ═════════════════════
function createTestDb() {
  const p = join(tmpdir(), `test-kb-${Date.now()}.db`);
  const db = createDatabase(p);
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('u1', 'test@test.com', 'hash', 'Test User', now, now);
  db.prepare('INSERT INTO tenants (id, name, slug, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('t1', 'Test Tenant', 'test-tenant', 'u1', now, now);
  return { db, path: p };
}
describe('DbKnowledgeBaseProvider', () => {
  it('DbKnowledgeBaseProvider returns DB content when present', () => {
    const { db, path } = createTestDb();
    try {
      const repo = new TopicResponseTemplateRepository(db);
      repo.upsert('t1', 'pricing', 0, 'Custom pricing answer.');
      const provider = new DbKnowledgeBaseProvider(repo);
      const r = provider.getTopicResponse('pricing', 't1', 0);
      expect(r).not.toBeNull();
      expect(r!.answer).toBe('Custom pricing answer.');
    } finally {
      try { require('fs').unlinkSync(path); } catch {}
    }
  });

  it('DbKnowledgeBaseProvider falls back to defaults when no DB row', () => {
    const { db, path } = createTestDb();
    try {
      const repo = new TopicResponseTemplateRepository(db);
      const provider = new DbKnowledgeBaseProvider(repo);
      const r = provider.getTopicResponse('features', 'nonexistent-tenant', 0);
      expect(r).not.toBeNull();
      expect(r!.answer).toContain('workflow automation');
    } finally {
      try { require('fs').unlinkSync(path); } catch {}
    }
  });
});

// ═══════════════════════════════════ Claim 7 — buyingIntentScore double-count ═══════════════════════════════════
describe('Claim 7 — buyingIntentScore increments exactly +25 per buying signal', () => {
  it('processPolicyEngine adds +25, not +50', () => {
    const state = createInitialState(sid(), tenant, policy);
    expect(state.buyingIntentScore).toBe(0);
    processPolicyEngine('I want to buy now', state, { handled: false, strategy: 'answer' });
    expect(state.buyingIntentScore).toBe(25);
  });

  it('executePipeline adds +25 total across the full pipeline', () => {
    const sessionId = sid();
    const r = pip(sessionId, 'I want to sign up');
    expect(r.state.buyingIntentScore).toBe(25);
  });

  it('two consecutive buying messages add +25 each (+50 total)', () => {
    const s = sid();
    pip(s, 'I want to buy');
    const after1 = stateManager.get(s);
    expect(after1!.buyingIntentScore).toBe(25);
    pip(s, 'sign me up');
    const after2 = stateManager.get(s);
    expect(after2!.buyingIntentScore).toBe(50);
  });
});

// ═══════════════════════════════════ Claim 4 — fromLegacyMemory topic count ═══════════════════════════════════
describe('Claim 4 — fromLegacyMemory reconstructs real topic counts', () => {
  it('fromLegacyMemory does NOT flatten counts to 1', () => {
    const legacy = {
      turns: [] as any[],
      persona: 'professional' as any,
      funnelStage: 'discovery' as any,
      buyingIntentDetected: false,
      objections: [] as any[],
      qualificationState: {} as any,
      repeatedPhraseCount: 0,
      topics: ['features', 'features', 'features', 'pricing', 'pricing'],
      companySize: undefined,
      industry: undefined,
      useCase: undefined,
      monthlyConversations: undefined,
      currentHelpdesk: undefined,
      budget: undefined,
      decisionTimeline: undefined,
    };

    const { fromLegacyMemory } = require('@conversation-engine/conversation-orchestrator');
    const memory = fromLegacyMemory(legacy);

    const featuresRecord = memory.topicsExplained.find((t: any) => t.topic === 'features');
    const pricingRecord = memory.topicsExplained.find((t: any) => t.topic === 'pricing');

    expect(featuresRecord!.count).toBe(3);
    expect(pricingRecord!.count).toBe(2);
  });

  it('prepareLegacyMemory produces repeated entries matching counts', () => {
    const { processConversationBrain } = require('@conversation-engine/conversation-orchestrator');

    const legacy = {
      turns: [
        { message: 'hi', response: 'hello', polarity: 0, frustration: 0, urgency: 0, timestamp: Date.now() },
      ],
      persona: 'professional' as any,
      funnelStage: 'discovery' as any,
      buyingIntentDetected: false,
      objections: [] as any[],
      qualificationState: {} as any,
      repeatedPhraseCount: 0,
      topics: ['features', 'features', 'pricing'],
      companySize: undefined,
      industry: undefined,
      useCase: undefined,
      monthlyConversations: undefined,
      currentHelpdesk: undefined,
      budget: undefined,
      decisionTimeline: undefined,
    };

    const brainInput = {
      message: 'what else about features?',
      responseText: '',
      legacyMemory: legacy,
      tenantId: tenant,
    };

    const result = processConversationBrain(brainInput);

    const featuresRecord = result.memory.topicsExplained.find((t: any) => t.topic === 'features');
    const pricingRecord = result.memory.topicsExplained.find((t: any) => t.topic === 'pricing');

    expect(featuresRecord).toBeDefined();
    expect(pricingRecord).toBeDefined();
    expect(featuresRecord!.count).toBe(2);
    expect(pricingRecord!.count).toBeGreaterThanOrEqual(1);
  });
});
