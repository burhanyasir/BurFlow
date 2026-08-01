import { processConversationBrain } from "./packages/conversation-orchestrator/src/conversation-brain";
import { CustomerSimulator, PERSONAS } from "./packages/conversation-orchestrator/src/__tests__/conversation-simulator";
import { discernTopics } from "./packages/conversation-orchestrator/src/conversation-memory";

function runSim(sim, index) {
  const config = sim.configData;
  const lm = { turns: [], persona: config.personaType, funnelStage: "discovery",
    buyingIntentDetected: false, objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0, topics: [],
    companySize: config.companySize, industry: config.industry, useCase: config.useCase,
    monthlyConversations: config.monthlyConversations, currentHelpdesk: config.currentHelpdesk,
    budget: config.budget, decisionTimeline: config.decisionTimeline };
  let curM = lm;
  let lastGoal = "none";
  let consecutiveSameGoal = 0;
  const recentGoals = [] as string[];
  const goals = [] as string[];
  let loopDetected = false;
  for (let i = 0; i < 40; i++) {
    const msg = sim.generateMessage();
    if (!msg) continue;
    const bo = processConversationBrain({ message: msg, responseText: "", legacyMemory: curM });
    const g = bo.strategy?.primaryGoal || "none";
    goals.push(g);
    if (g === lastGoal && g !== "none" && g !== "advance_funnel") {
      consecutiveSameGoal++;
    } else if (g !== "none" && g !== "advance_funnel") {
      consecutiveSameGoal = 1;
    }
    if (consecutiveSameGoal >= 6) {
      loopDetected = true;
      break;
    }
    lastGoal = g;
    curM = bo.legacyMemory;
    if (bo.memory.isCompleted || bo.memory.isLeaving) break;
  }
  return { personaName: config.name, goals, loopDetected };
}

async function main() {
  const sims = [];
  for (let i = 0; i < 50; i++) {
    const base = PERSONAS[i % PERSONAS.length];
    const v = { ...base, traits: { patience: 0.5, technicalKnowledge: 0.5, budgetSensitivity: 0.5, urgency: 0.5, buyingIntent: 0.5, skepticism: 0.5, qualificationWillingness: 0.5, conversationLength: 16, objectionProbability: 0.3, topicChangeProbability: 0.2, shortReplyProbability: 0.1, offTopicProbability: 0.05, competitorComparisonProbability: 0.1, humanRequestProbability: 0.05 } };
    sims.push(new CustomerSimulator(v));
  }
  const loops = [];
  for (let i = 0; i < sims.length; i++) {
    const result = runSim(sims[i], i);
    if (result.loopDetected) {
      loops.push(result);
    }
  }
  console.log(`loops=${loops.length}`);
  for (const l of loops.slice(0,10)) {
    console.log(`persona=${l.personaName} goals=${l.goals.join(",")}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
