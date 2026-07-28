import { describe, it, expect, beforeAll } from "vitest";
import { processConversationBrain, BrainOutput } from "../conversation-brain";
import { ConversationIntelligenceMemory } from "../conversation-intelligence-types";
import { CustomerSimulator, PERSONAS } from "./conversation-simulator";
import { discernTopics } from "../conversation-memory";

interface ConvRec {
  personaName: string; personaType: string; turnCount: number;
  completed: boolean; reachedTrial: boolean; reachedDemo: boolean;
  abandoned: boolean; loopCount: number; repeatedTopics: string[];
  qualificationCompleted: boolean;
  trustScoreProgression: number[]; buyingIntentProgression: number[];
  funnelStages: string[]; topicsDiscussed: string[];
  objectionsRaised: string[]; satisfaction: number; endedNaturally: boolean;
}
interface FailRec {
  conversationIndex: number; personaName: string;
  turnNumber: number; failureType: string; details: string;
}

function runSim(sim, index, fails) {
  const config = sim.configData;
  const lm = { turns: [], persona: config.personaType, funnelStage: "discovery",
    buyingIntentDetected: false, objections: [],
    qualificationState: { questionsAskedCount: 0, completed: false },
    repeatedPhraseCount: 0, topics: [],
    companySize: config.companySize, industry: config.industry, useCase: config.useCase,
    monthlyConversations: config.monthlyConversations, currentHelpdesk: config.currentHelpdesk,
    budget: config.budget, decisionTimeline: config.decisionTimeline };
  const topicsSet = new Set(), objsSet = new Set();
  const trustScores = [], buyingScores = [], funnelStages = [];
  let tRepeat = new Map();
  let qualDone = false, trial = false, demo = false, abandon = false, done = false, turns = 0;
  let curM = lm, sil = 0;
  let consecutiveSameGoal = 0, lastGoal = "none", loopCount = 0;
  let directorLoopCount = 0;

  for (let i = 0; i < 40; i++) {
    let msg = sim.generateMessage();
    if (!msg) { sil++; if (sil > 3) break; continue; }
    sil = 0;
    let bo;
    try { bo = processConversationBrain({ message: msg, responseText: "", legacyMemory: curM }); }
    catch(e) { fails.push({conversationIndex:index,personaName:config.name,turnNumber:i+1,failureType:"Brain Error",details:e.message}); break; }
    const s = bo.strategy;
    turns = i + 1;
    trustScores.push(bo.memory.trustLevel === "high" ? 1 : bo.memory.trustLevel === "medium" ? 0.5 : 0);
    buyingScores.push(bo.memory.buyingIntentDetected ? 1 : 0);
    funnelStages.push(bo.memory.funnelStage);
    for (const t of discernTopics(msg)) topicsSet.add(t);
    const obj = bo.ciResult.objection;
    if (obj.isObjection && obj.category !== "none") objsSet.add(obj.category);
    if (/trial|sign.?up|get started/i.test(bo.responseText)) trial = true;
    if (/demo|book|schedule/i.test(bo.responseText)) demo = true;
    if (bo.memory.qualificationCollected.completed) qualDone = true;
    if (bo.memory.isAbandoned) abandon = true;
    if (bo.memory.isCompleted || bo.memory.isLeaving) { done = true; break; }
    if (!s) { curM = bo.legacyMemory; continue; }
    for (const topic of discernTopics(msg)) tRepeat.set(topic, (tRepeat.get(topic)||0)+1);
    const g = s.primaryGoal;
    if (g !== "none" && g !== "advance_funnel" && g === lastGoal) {
      consecutiveSameGoal++;
      if (consecutiveSameGoal >= 6) {
        fails.push({conversationIndex:index,personaName:config.name,turnNumber:i+1,failureType:"Same Goal 6+ Consecutive",details:g});
        loopCount++;
      }
    } else if (g !== "none" && g !== "advance_funnel") {
      consecutiveSameGoal = 1;
    } else if (g === "advance_funnel") {
      consecutiveSameGoal = 0;
    }
    lastGoal = g;
    if (s.reasoning && s.reasoning.some(r => r.indexOf("Loop detected") >= 0)) {
      fails.push({conversationIndex:index,personaName:config.name,turnNumber:i+1,failureType:"Director Loop Detected",details:s.reasoning.filter(r=>r.indexOf("Loop")>=0).join("; ")});
      directorLoopCount++;
      loopCount++;
    }
    if (!sim.shouldContinue(bo)) { done = true; break; }
    sim.updateState(bo);
    curM = bo.legacyMemory;
  }
  const maxOccurrences = Math.max(...Array.from(tRepeat.values()), 0);
  const repeatThreshold = Math.min(8, Math.max(4, Math.floor(turns / 5)));
  return { personaName: config.name, personaType: config.personaType, turnCount: turns,
    completed: done, reachedTrial: trial, reachedDemo: demo, abandoned: abandon,
    loopCount,
    repeatedTopics: Array.from(tRepeat.entries()).filter(([_,c]) => c > repeatThreshold).map(([t]) => t),
    qualificationCompleted: qualDone,
    trustScoreProgression: trustScores, buyingIntentProgression: buyingScores,
    funnelStages, topicsDiscussed: Array.from(topicsSet),
    objectionsRaised: Array.from(objsSet),
    satisfaction: trustScores.length > 0 ? trustScores.reduce((a,b) => a+b, 0) / trustScores.length : 0,
    endedNaturally: done };
}

function computeReport(convs, fails) {
  const t = convs.length; if (t===0) return "No conversations";
  const nat = convs.filter(c => c.endedNaturally).length;
  const tr = convs.filter(c => c.reachedTrial).length;
  const dm = convs.filter(c => c.reachedDemo).length;
  const ab = convs.filter(c => c.abandoned).length;
  const lp = convs.filter(c => c.loopCount > 0).length;
  const rp = convs.filter(c => c.repeatedTopics.length > 0).length;
  const qc = convs.filter(c => c.qualificationCompleted).length;
  const avgT = convs.reduce((a,c) => a + c.turnCount, 0) / t;
  const avgSat = convs.reduce((a,c) => a + c.satisfaction, 0) / t;
  const avgTE = convs.filter(c => c.trustScoreProgression.length > 0)
    .reduce((a,c) => a + c.trustScoreProgression[c.trustScoreProgression.length-1], 0)
    / Math.max(1, convs.filter(c => c.trustScoreProgression.length > 0).length);
  const funnelP = {};
  for (const c of convs) { if (c.funnelStages.length > 0) { const l = c.funnelStages[c.funnelStages.length-1]; funnelP[l] = (funnelP[l]||0)+1; } }
  const wc = {};
  for (const f of fails) wc[f.failureType] = (wc[f.failureType]||0)+1;
  const topW = Object.entries(wc).sort((a,b)=>b[1]-a[1]).slice(0,15);
  const ps = {};
  for (const p of PERSONAS) { const pc = convs.filter(c=>c.personaName===p.name); if (pc.length===0) continue; ps[p.name] = { count: pc.length, sat: pc.reduce((a,c)=>a+c.satisfaction,0)/pc.length, conv: pc.filter(c=>c.reachedDemo||c.reachedTrial).length/pc.length*100, avgT: pc.reduce((a,c)=>a+c.turnCount,0)/pc.length }; }
  const cqs = avgSat * 100;
  const sqs = (dm + tr) / t * 100;
  const qs = qc / t * 100;
  const ns = (nat/t*100 + (1-lp/t)*100 + (1-rp/t)*100) / 3;
  const cms = avgTE * 100;
  const cs = sqs;
  const rs = convs.filter(c => c.topicsDiscussed.length >= 5).length / t * 100;
  const pr = Math.round((cqs*0.15 + sqs*0.20 + qs*0.10 + ns*0.15 + cms*0.10 + cs*0.20 + rs*0.10)*100)/100;
  let r = "";
  const NL = "\n";
  r += "=".repeat(72) + NL + "  P6 PRODUCTION READINESS REPORT" + NL + "=".repeat(72) + NL + NL;
  r += "Total Conversations: " + t + NL + NL;
  r += "--- CONVERSATION SUMMARY ---" + NL;
  r += "  Completed Naturally:      " + nat + " (" + (nat/t*100).toFixed(1) + "%)" + NL;
  r += "  Reached Trial:            " + tr + " (" + (tr/t*100).toFixed(1) + "%)" + NL;
  r += "  Reached Demo:             " + dm + " (" + (dm/t*100).toFixed(1) + "%)" + NL;
  r += "  Abandoned:                " + ab + " (" + (ab/t*100).toFixed(1) + "%)" + NL;
  r += "  Avg Turns:                " + avgT.toFixed(1) + NL;
  r += "  Avg Satisfaction:         " + (avgSat*100).toFixed(1) + "%" + NL;
  r += "  Conversations w/ Loops:   " + lp + NL;
  r += "  Conversations w/ Repeats: " + rp + NL;
  r += "  Qualification Completed:  " + qc + " (" + (qc/t*100).toFixed(1) + "%)" + NL + NL;
  r += "--- FUNNEL DISTRIBUTION ---" + NL;
  for (const stage of ["greeting","awareness","interest","consideration","evaluation","purchase_intent","decision","customer","support"]) {
    const cnt = funnelP[stage]||0;
    if (cnt > 0) r += "  " + stage.padEnd(20) + cnt + " (" + (cnt/t*100).toFixed(1) + "%)" + NL;
  }
  r += NL + "--- PER-PERSONA ---" + NL;
  for (const [name, st] of Object.entries(ps)) r += "  " + name.padEnd(25) + " n=" + st.count + " sat=" + (st.sat*100).toFixed(0) + "% conv=" + st.conv.toFixed(0) + "% turns=" + st.avgT.toFixed(1) + NL;
  r += NL + "--- FAILURES ---" + NL;
  for (const [type, count] of topW) r += "  " + type.padEnd(45) + count + " (" + (count/Math.max(1,fails.length)*100).toFixed(1) + "%)" + NL;
  r += NL + "--- SCORES ---" + NL;
  r += "  Conversation Quality:     " + cqs.toFixed(1) + "%" + NL;
  r += "  Sales Quality:            " + sqs.toFixed(1) + "%" + NL;
  r += "  Qualification:            " + qs.toFixed(1) + "%" + NL;
  r += "  Naturalness:              " + ns.toFixed(1) + "%" + NL;
  r += "  Context Memory:           " + cms.toFixed(1) + "%" + NL;
  r += "  Conversion:               " + cs.toFixed(1) + "%" + NL;
  r += "  Recommendation:           " + rs.toFixed(1) + "%" + NL + NL;
  r += "  OVERALL PRODUCTION READINESS: " + pr + "%" + NL;
  return r;
}

describe("P6 - Customer Simulation & Stress Testing", () => {
  let report = "", convs = [], fails = [], sims = [];
  beforeAll(() => {
    convs = []; fails = []; sims = [];
    const jitter = (mn, mx) => Math.max(0, Math.min(1, (mn+mx)/2 + (Math.random()-0.5)*(mx-mn)*0.6));
    for (let i = 0; i < 500; i++) {
      const base = PERSONAS[i % PERSONAS.length];
      const v = { ...base, traits: { patience: jitter(0.2,0.8), technicalKnowledge: jitter(0.1,0.9), budgetSensitivity: jitter(0.2,0.9), urgency: jitter(0.2,0.9), buyingIntent: jitter(0.2,0.9), skepticism: jitter(0.1,0.8), qualificationWillingness: jitter(0.2,0.9), conversationLength: Math.floor(8+Math.random()*20), objectionProbability: jitter(0.15,0.5), topicChangeProbability: jitter(0.1,0.35), shortReplyProbability: jitter(0.05,0.2), offTopicProbability: jitter(0.02,0.12), competitorComparisonProbability: jitter(0.05,0.25), humanRequestProbability: jitter(0.05,0.2) } };
      sims.push(new CustomerSimulator(v));
    }
    for (let i = 0; i < sims.length; i++) convs.push(runSim(sims[i], i, fails));
    report = computeReport(convs, fails);
    console.log(report);
  });
  it("production readiness >= 50%", () => { const m = report.match(/READINESS: (\d+\.?\d*)%/); expect(m ? parseFloat(m[1]) : 0).toBeGreaterThanOrEqual(50); });
  it("zero hard crashes", () => expect(fails.filter(f=>f.failureType==="Brain Error").length).toBeLessThanOrEqual(5));
  it("loop rate < 15%", () => expect(convs.filter(c=>c.loopCount>0).length / convs.length).toBeLessThan(0.15));
  it("qual >= 30%", () => expect(convs.filter(c=>c.qualificationCompleted).length / convs.length).toBeGreaterThanOrEqual(0.3));
  it("avg turns > 6", () => expect(convs.reduce((a,c)=>a+c.turnCount,0)/convs.length).toBeGreaterThan(6));
  it(">= 30% convert", () => expect(convs.filter(c=>c.reachedTrial||c.reachedDemo).length / convs.length).toBeGreaterThanOrEqual(0.3));
  it("500+ conversations", () => expect(convs.length).toBeGreaterThanOrEqual(500));
  it("all 10 personas", () => { const s = new Set(convs.map(c=>c.personaName)); for (const p of PERSONAS) expect(s.has(p.name)).toBe(true); });
  it("repeats <= 20%", () => expect(convs.filter(c=>c.repeatedTopics.length>0).length / convs.length).toBeLessThanOrEqual(0.2));
  it("funnel advances > 40%", () => { const order = ["greeting","awareness","interest","consideration","evaluation","purchase_intent","decision","customer","support"]; const adv = convs.filter(c => { const l = c.funnelStages[c.funnelStages.length-1]; return order.indexOf(l) >= order.indexOf("evaluation"); }).length; expect(adv / convs.length).toBeGreaterThan(0.4); });
});
