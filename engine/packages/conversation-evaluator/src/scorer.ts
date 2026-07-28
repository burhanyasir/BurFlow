import {
  ConversationRecord, TurnEvaluation, EvaluationMetrics,
  EvaluationReport, DeadEnd, LoopEvent, CTAEvent, QualificationEvent,
  FunnelProgression,
} from './types';

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Metric Calculators ───────────────────────────────────────────────

function computeNaturalness(turns: TurnEvaluation[], deadEnds: DeadEnd[]): number {
  const naturalnessScores = turns.map(t => t.naturalness);
  const base = avg(naturalnessScores) * 20;
  const genericPenalty = turns.filter(t => t.feltGeneric).length * 5;
  const deadEndPenalty = deadEnds.length * 3;
  return clamp(base - genericPenalty - deadEndPenalty);
}

function computeRepetitionScore(turns: TurnEvaluation[], loops: LoopEvent[]): number {
  const phraseMap = new Map<string, number>();
  for (const t of turns) {
    for (const p of t.repeatedPhrases) {
      phraseMap.set(p, (phraseMap.get(p) || 0) + 1);
    }
  }
  const repeatedCount = Array.from(phraseMap.values()).filter(c => c >= 2).length;
  const totalRepeatInstances = Array.from(phraseMap.values()).reduce((a, b) => a + b, 0);
  const loopPenalty = loops.reduce((sum, l) => sum + l.count * 5, 0);
  const score = 100 - (repeatedCount * 10) - (totalRepeatInstances * 2) - loopPenalty;
  return clamp(score);
}

function computeTopicProgression(turns: TurnEvaluation[], topicsDiscussed: string[]): number {
  if (topicsDiscussed.length <= 1) return 30;
  const topicContinuityScore = avg(turns.map(t => t.topicContinuityGood ? 100 : 0));
  const uniqueTopics = new Set(turns.flatMap(t => t.topicsDiscussed)).size;
  const coverageScore = Math.min(100, (uniqueTopics / Math.max(1, topicsDiscussed.length)) * 100);
  const repeatedTopics = turns.filter(t => {
    const discussed = t.topicsDiscussed;
    return discussed.length > 0 && discussed.some((topic, i) => i > 0 && topic === discussed[i - 1]);
  }).length;
  const repeatPenalty = repeatedTopics * 5;
  return clamp((topicContinuityScore + coverageScore) / 2 - repeatPenalty);
}

function computeMemoryUtilization(turns: TurnEvaluation[]): number {
  const applicableTurns = turns.filter(t => t.memoryShouldHaveBeenReferenced);
  if (applicableTurns.length === 0) return 100;
  const referenced = applicableTurns.filter(t => t.memoryReferenced).length;
  return clamp((referenced / applicableTurns.length) * 100);
}

function computeQualificationQuality(
  turns: TurnEvaluation[],
  qualifications: QualificationEvent[],
): number {
  if (qualifications.length === 0) return 100;
  const naturalQuestions = qualifications.filter(q => q.natural).length;
  const acknowledged = qualifications.filter(q => q.acknowledged).length;
  const unnecessary = turns.filter(t => t.unnecessaryQualification).length;
  const naturalScore = (naturalQuestions / qualifications.length) * 100;
  const ackScore = qualifications.length > 0 ? (acknowledged / qualifications.length) * 100 : 100;
  const unnecessaryPenalty = unnecessary * 15;
  return clamp((naturalScore + ackScore) / 2 - unnecessaryPenalty);
}

function computeSalesMomentum(
  funnelProgression: FunnelProgression[],
  deadEnds: DeadEnd[],
  loops: LoopEvent[],
  turns: TurnEvaluation[],
): number {
  const advances = funnelProgression.length;
  const stallScore = turns.filter(t => !t.advancedFunnel).length;
  const deadEndPenalty = deadEnds.length * 10;
  const loopPenalty = loops.reduce((sum, l) => sum + l.count * 15, 0);
  const naturalAdvances = funnelProgression.filter(f => f.natural).length;
  const advanceScore = advances > 0 ? (naturalAdvances / advances) * 100 : 50;
  const baseScore = advanceScore - (stallScore * 5) - deadEndPenalty - loopPenalty;
  return clamp(baseScore);
}

function computeTrustBuilding(turns: TurnEvaluation[]): number {
  const objectionTurns = turns.filter(t => t.observedCustomerIntent === 'objection' || t.handledObjection);
  if (objectionTurns.length === 0) return 100;
  const handled = objectionTurns.filter(t => t.handledObjection).length;
  return clamp((handled / objectionTurns.length) * 100);
}

function computeObjectionHandling(turns: TurnEvaluation[]): number {
  const objectionTurns = turns.filter(
    t => t.observedCustomerIntent === 'objection' || t.handledObjection === true,
  );
  if (objectionTurns.length === 0) return 100;
  const good = objectionTurns.filter(t => t.handledObjection && t.naturalness >= 3).length;
  return clamp((good / objectionTurns.length) * 100);
}

function computeCTATiming(ctaHistory: CTAEvent[], turns: TurnEvaluation[]): number {
  const appropriate = ctaHistory.filter(c => c.appropriate).length;
  const inappropriate = ctaHistory.filter(c => !c.appropriate).length;
  const missing = turns.filter(t => t.ctaPresent === false && t.ctaTiming === 'none' && t.expectedGoal !== 'none').length;
  if (ctaHistory.length === 0 && missing === 0) return 100;
  const appropriateScore = ctaHistory.length > 0 ? (appropriate / ctaHistory.length) * 100 : 100;
  const missingPenalty = missing * 10;
  const inappropriatePenalty = inappropriate * 15;
  return clamp(appropriateScore - missingPenalty - inappropriatePenalty);
}

function computeConversationCompletion(
  turns: TurnEvaluation[],
  goal: string,
): number {
  const lastTurns = turns.slice(-3);
  const hasNaturalEnding = lastTurns.some(
    t => t.actualGoal === 'finish_conversation' || t.actualGoal === 'close_trial' || t.actualGoal === 'schedule_demo',
  );
  const hasCta = turns.some(t => t.ctaPresent && t.ctaAppropriate);
  if (hasNaturalEnding && hasCta) return 100;
  if (hasNaturalEnding) return 80;
  if (hasCta) return 60;
  if (turns.some(t => t.actualGoal === 'finish_conversation')) return 70;
  return 30;
}

// ─── Main Scorer ──────────────────────────────────────────────────────

function findDeadEnds(turns: TurnEvaluation[]): DeadEnd[] {
  const ends: DeadEnd[] = [];
  for (const t of turns) {
    const lower = t.assistantResponse.toLowerCase();
    if (/what else can i help|let me know if you have questions|anything else\?|is there anything else/.test(lower)) {
      ends.push({ turnNumber: t.turnNumber, responseText: t.assistantResponse, reason: 'Generic dead-end CTA' });
    } else if (t.assistantResponse.length < 15 && t.turnNumber > 1) {
      ends.push({ turnNumber: t.turnNumber, responseText: t.assistantResponse, reason: 'Response too short' });
    } else if (!/[.?!)]$/.test(t.assistantResponse.trim()) && !t.notes.includes('intentional')) {
      ends.push({ turnNumber: t.turnNumber, responseText: t.assistantResponse, reason: 'Incomplete ending' });
    }
  }
  return ends;
}

function findLoops(turns: TurnEvaluation[]): LoopEvent[] {
  const loops: LoopEvent[] = [];
  const goals = turns.map(t => t.actualGoal).filter(Boolean) as string[];
  for (let i = 0; i < goals.length - 2; i++) {
    for (let len = 2; len <= Math.min(4, goals.length - i); len++) {
      const pattern = goals.slice(i, i + len).join(',');
      let count = 1;
      for (let j = i + len; j <= goals.length - len; j += len) {
        const nextPattern = goals.slice(j, j + len).join(',');
        if (nextPattern === pattern) count++;
        else break;
      }
      if (count >= 2 && len >= 2) {
        loops.push({ startTurn: turns[i].turnNumber, endTurn: turns[i + len * count - 1]?.turnNumber || 0, pattern, count });
      }
    }
  }
  const unique: LoopEvent[] = [];
  const seen = new Set<string>();
  for (const l of loops) {
    const key = `${l.startTurn}-${l.pattern}`;
    if (!seen.has(key)) { seen.add(key); unique.push(l); }
  }
  return unique.slice(0, 5);
}

function groupRepeatedPhrases(turns: TurnEvaluation[]): Array<{ phrase: string; count: number; turns: number[] }> {
  const map = new Map<string, { count: number; turns: number[] }>();
  for (const t of turns) {
    for (const p of t.repeatedPhrases) {
      const entry = map.get(p) || { count: 0, turns: [] };
      entry.count++;
      if (!entry.turns.includes(t.turnNumber)) entry.turns.push(t.turnNumber);
      map.set(p, entry);
    }
  }
  return Array.from(map.entries())
    .filter(([_, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([phrase, data]) => ({ phrase, count: data.count, turns: data.turns }));
}

function findMissedOpportunities(turns: TurnEvaluation[]): Array<{ turn: number; suggestion: string; context: string }> {
  return turns
    .filter(t => t.betterFollowUpAvailable && t.betterFollowUpText)
    .map(t => ({
      turn: t.turnNumber,
      suggestion: t.betterFollowUpText!,
      context: `User said: "${t.userMessage.slice(0, 80)}"`,
    }));
}

function findCTAIssues(ctaHistory: CTAEvent[], turns: TurnEvaluation[]): Array<{ turn: number; cta: string; issue: string }> {
  const issues: Array<{ turn: number; cta: string; issue: string }> = [];
  for (const c of ctaHistory) {
    if (!c.appropriate) {
      issues.push({ turn: c.turnNumber, cta: c.label, issue: `CTA at turn ${c.turnNumber} was inappropriate for the stage` });
    }
  }
  for (const t of turns) {
    if (t.ctaTiming === 'too_early') {
      issues.push({ turn: t.turnNumber, cta: 'present', issue: 'CTA presented too early in conversation' });
    }
    if (t.ctaTiming === 'too_late') {
      issues.push({ turn: t.turnNumber, cta: 'present', issue: 'CTA presented too late — missed window' });
    }
  }
  return issues;
}

function findQualificationIssues(qualifications: QualificationEvent[], turns: TurnEvaluation[]): Array<{ turn: number; issue: string }> {
  const issues: Array<{ turn: number; issue: string }> = [];
  for (const q of qualifications) {
    if (!q.natural) issues.push({ turn: q.turnNumber, issue: `Qualification question felt mechanical: "${q.question}"` });
    if (!q.acknowledged) issues.push({ turn: q.turnNumber, issue: `User answer not acknowledged before next question` });
  }
  for (const t of turns) {
    if (t.unnecessaryQualification) {
      issues.push({ turn: t.turnNumber, issue: 'Unnecessary qualification question asked' });
    }
  }
  return issues;
}

function findFunnelStallPoints(turns: TurnEvaluation[]): number[] {
  return turns.filter(t => !t.advancedFunnel && t.turnNumber > 1).map(t => t.turnNumber);
}

function findMomentumBreaks(turns: TurnEvaluation[]): number[] {
  const breaks: number[] = [];
  for (let i = 1; i < turns.length; i++) {
    if (turns[i - 1].advancedFunnel && !turns[i].advancedFunnel) {
      breaks.push(turns[i].turnNumber);
    }
  }
  return breaks;
}

// ─── Public API ───────────────────────────────────────────────────────

export function computeOverallScore(metrics: EvaluationMetrics): number {
  const weights: Record<string, number> = {
    naturalness: 0.15,
    repetitionScore: 0.10,
    topicProgression: 0.10,
    memoryUtilization: 0.05,
    qualificationQuality: 0.10,
    salesMomentum: 0.15,
    trustBuilding: 0.05,
    objectionHandling: 0.05,
    ctaTiming: 0.10,
    conversationCompletion: 0.15,
  };
  let score = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const value = (metrics as any)[key] ?? 0;
    if (typeof value === 'number') {
      score += value * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? Math.round(score / totalWeight) : 0;
}

function identifyStrengths(metrics: EvaluationMetrics): string[] {
  const s: string[] = [];
  if (metrics.naturalness >= 75) s.push('Natural conversational flow');
  if (metrics.repetitionScore >= 80) s.push('Low repetition — good variety in responses');
  if (metrics.topicProgression >= 75) s.push('Strong topic progression and continuity');
  if (metrics.memoryUtilization >= 80) s.push('Excellent memory utilization and context awareness');
  if (metrics.qualificationQuality >= 75) s.push('Natural, conversational qualification flow');
  if (metrics.salesMomentum >= 75) s.push('Good sales momentum with natural funnel progression');
  if (metrics.trustBuilding >= 80) s.push('Effective trust building and objection handling');
  if (metrics.objectionHandling >= 75) s.push('Objections addressed appropriately');
  if (metrics.ctaTiming >= 75) s.push('Well-timed CTAs');
  if (metrics.conversationCompletion >= 75) s.push('Natural conversation completion');
  return s;
}

function identifyWeaknesses(metrics: EvaluationMetrics): string[] {
  const w: string[] = [];
  if (metrics.naturalness < 60) w.push('Responses feel robotic or formulaic');
  if (metrics.repetitionScore < 60) w.push('Excessive repetition of phrases or patterns');
  if (metrics.topicProgression < 60) w.push('Poor topic flow — premature or stalled transitions');
  if (metrics.memoryUtilization < 50) w.push('Weak memory use — facts not being referenced');
  if (metrics.qualificationQuality < 60) w.push('Qualification feels mechanical or unnecessary');
  if (metrics.salesMomentum < 60) w.push('Conversation stalls or loses momentum');
  if (metrics.trustBuilding < 60) w.push('Trust not rebuilt after objections');
  if (metrics.objectionHandling < 60) w.push('Objections not addressed adequately');
  if (metrics.ctaTiming < 60) w.push('CTA timing issues — too early, too late, or missing');
  if (metrics.conversationCompletion < 60) w.push('Conversation ends abruptly without clear resolution');
  if (metrics.deadEndCount > 2) w.push(`${metrics.deadEndCount} dead-end responses — conversation stalls`);
  if (metrics.loopCount > 0) w.push(`${metrics.loopCount} loop(s) detected — repetitive goal cycling`);
  return w;
}

function suggestImprovements(
  metrics: EvaluationMetrics,
  repPhrases: Array<{ phrase: string; count: number }>,
  genericResponses: Array<{ turn: number; text: string }>,
): string[] {
  const s: string[] = [];
  if (metrics.naturalness < 70) s.push('Vary sentence structures and openings to reduce formulaic feel');
  if (metrics.repetitionScore < 70 && repPhrases.length > 0) {
    const top = repPhrases.slice(0, 3).map(r => `"${r.phrase}"`).join(', ');
    s.push(`Reduce overuse of: ${top}`);
  }
  if (metrics.topicProgression < 70) s.push('Ensure topics reach depth ≥2 before agenda-driven transitions');
  if (metrics.memoryUtilization < 60) s.push('Surface previously collected facts (industry, company size) at natural points');
  if (metrics.qualificationQuality < 70) s.push('Add answer acknowledgments between successive qualification questions');
  if (metrics.salesMomentum < 70) s.push('Reduce dead-end responses — always suggest a next step');
  if (metrics.objectionHandling < 70) s.push('Acknowledge concerns before addressing them directly');
  if (metrics.ctaTiming < 70) s.push('Align CTA timing with funnel stage — avoid early pushes');
  if (metrics.conversationCompletion < 70) s.push('Ensure conversations end with clear action (trial, demo, or graceful exit)');
  if (genericResponses.length > 0) {
    s.push(`Review ${genericResponses.length} generic response(s) for more context-aware alternatives`);
  }
  return s;
}

export function evaluateConversation(record: ConversationRecord): EvaluationReport {
  const deadEnds = findDeadEnds(record.turns);
  const loops = findLoops(record.turns);
  const repPhrases = groupRepeatedPhrases(record.turns);
  const missedOpps = findMissedOpportunities(record.turns);
  const ctaIssues = findCTAIssues(record.ctaHistory, record.turns);
  const qualIssues = findQualificationIssues(record.qualificationTimeline, record.turns);
  const funnelStalls = findFunnelStallPoints(record.turns);
  const momentumBreaks = findMomentumBreaks(record.turns);

  const metrics: EvaluationMetrics = {
    naturalness: computeNaturalness(record.turns, deadEnds),
    repetitionScore: computeRepetitionScore(record.turns, loops),
    topicProgression: computeTopicProgression(record.turns, record.topicsDiscussed.map(t => t.topic)),
    memoryUtilization: computeMemoryUtilization(record.turns),
    qualificationQuality: computeQualificationQuality(record.turns, record.qualificationTimeline),
    salesMomentum: computeSalesMomentum(record.funnelProgression, deadEnds, loops, record.turns),
    trustBuilding: computeTrustBuilding(record.turns),
    objectionHandling: computeObjectionHandling(record.turns),
    ctaTiming: computeCTATiming(record.ctaHistory, record.turns),
    conversationCompletion: computeConversationCompletion(record.turns, record.persona),
    deadEndCount: deadEnds.length,
    loopCount: loops.length,
  };

  const overallScore = computeOverallScore(metrics);

  return {
    persona: record.persona,
    scenario: record.scenario,
    userGoal: record.userGoal,
    turnCount: record.turnCount,
    overallScore,
    metrics,
    strengths: identifyStrengths(metrics),
    weaknesses: identifyWeaknesses(metrics),
    suggestedImprovements: suggestImprovements(metrics, repPhrases, record.turns.filter(t => t.feltGeneric).map(t => ({ turn: t.turnNumber, text: t.assistantResponse }))),
    genericResponses: record.turns.filter(t => t.feltGeneric).map(t => ({ turn: t.turnNumber, text: t.assistantResponse })),
    unnecessaryQualifications: record.turns.filter(t => t.unnecessaryQualification).map(t => ({ turn: t.turnNumber, question: t.assistantResponse })),
    repeatedPhrases: repPhrases,
    missedOpportunities: missedOpps,
    ctaIssues,
    qualificationIssues: qualIssues,
    funnelStallPoints: funnelStalls,
    momentumBreaks,
  };
}

export function aggregateReports(reports: EvaluationReport[]): {
  totalConversations: number;
  averageScore: number;
  personaScores: Record<string, { avg: number; count: number }>;
  metricAverages: EvaluationMetrics;
  topWeaknesses: string[];
  topImprovements: string[];
  frequencyMap: Record<string, number>;
} {
  const metricKeys: (keyof EvaluationMetrics)[] = [
    'naturalness', 'repetitionScore', 'topicProgression', 'memoryUtilization',
    'qualificationQuality', 'salesMomentum', 'trustBuilding', 'objectionHandling',
    'ctaTiming', 'conversationCompletion', 'deadEndCount', 'loopCount',
  ];

  const sums: Record<string, number> = {};
  const personaScores: Record<string, { total: number; count: number }> = {};
  const weaknessCount: Record<string, number> = {};
  const improvementCount: Record<string, number> = {};

  for (const r of reports) {
    for (const key of metricKeys) {
      sums[key] = (sums[key] || 0) + (r.metrics[key] as number);
    }
    const pKey = r.persona;
    if (!personaScores[pKey]) personaScores[pKey] = { total: 0, count: 0 };
    personaScores[pKey].total += r.overallScore;
    personaScores[pKey].count++;

    for (const w of r.weaknesses) weaknessCount[w] = (weaknessCount[w] || 0) + 1;
    for (const imp of r.suggestedImprovements) improvementCount[imp] = (improvementCount[imp] || 0) + 1;
  }

  const n = reports.length;
  const metricAverages: EvaluationMetrics = {} as EvaluationMetrics;
  for (const key of metricKeys) {
    (metricAverages as any)[key] = Math.round((sums[key] || 0) / n);
  }

  const avgScore = Math.round(reports.reduce((a, r) => a + r.overallScore, 0) / n);

  return {
    totalConversations: n,
    averageScore: avgScore,
    personaScores: Object.fromEntries(
      Object.entries(personaScores).map(([k, v]) => [k, { avg: Math.round(v.total / v.count), count: v.count }]),
    ),
    metricAverages,
    topWeaknesses: Object.entries(weaknessCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w),
    topImprovements: Object.entries(improvementCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([i]) => i),
    frequencyMap: Object.fromEntries(
      Object.entries(weaknessCount).sort((a, b) => b[1] - a[1]).slice(0, 10),
    ),
  };
}
