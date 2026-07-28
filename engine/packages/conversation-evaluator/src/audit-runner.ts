import {
  ConversationIntelligenceMemory, PersonaType as CIPersonaType,
  FunnelStage as CIFunnelStage,
} from '@conversation-engine/conversation-orchestrator';
import { processConversationBrain, BrainOutput } from '@conversation-engine/conversation-orchestrator';
import { ConversationScript, ALL_CONVERSATIONS } from './conversation-scripts';
import { analyzeTurn, resetPhraseTracking, TurnAnalysis } from './auto-scorer';
import { turnAnalysisToEvaluation, detectLoops, extractCTAs } from './auto-scorer';
import { evaluateConversation, aggregateReports } from './scorer';
import { formatReport, formatAggregatedSummary } from './report-generator';
import { EvaluationReport } from './types';

function makeLegacyMemory(persona: string): ConversationIntelligenceMemory {
  return {
    turns: [],
    persona: persona as CIPersonaType,
    funnelStage: 'greeting' as CIFunnelStage,
    buyingIntentDetected: false,
    objections: [],
    qualificationState: {
      completed: false,
      questionsAskedCount: 0,
    },
    repeatedPhraseCount: 0,
    topics: [],
  };
}

function getBaseResponse(messages: string[], turnIndex: number, script: ConversationScript): string {
  if (script.baseResponses && script.baseResponses[turnIndex]) {
    return script.baseResponses[turnIndex];
  }
  // Fallback generic response
  return 'Here is some information about that.';
}

export interface ConversationResult {
  script: ConversationScript;
  analyses: TurnAnalysis[];
  report: EvaluationReport;
}

function runConversation(script: ConversationScript): ConversationResult {
  resetPhraseTracking();
  const legacyMemory = makeLegacyMemory(script.persona);

  const analyses: TurnAnalysis[] = [];

  for (let i = 0; i < script.userMessages.length; i++) {
    const message = script.userMessages[i];
    const responseText = getBaseResponse(script.userMessages, i, script);

    const brainOutput = processConversationBrain({
      message,
      responseText,
      legacyMemory,
    });

    const analysis = analyzeTurn(i + 1, message, brainOutput);
    analyses.push(analysis);

    // Update legacy memory for next turn
    Object.assign(legacyMemory, brainOutput.legacyMemory);
  }

  // Build evaluation record
  const turnEvals = analyses.map(a => turnAnalysisToEvaluation(a));
  const ctaHistory = extractCTAs(analyses);
  const loops = detectLoops(analyses);

  const record = {
    evaluator: 'Automated Audit',
    date: new Date().toISOString().slice(0, 10),
    persona: script.persona as any,
    scenario: script.scenario as any,
    userGoal: script.conversationGoal,
    turnCount: analyses.length,
    turns: turnEvals,
    qualificationTimeline: [],
    funnelProgression: [],
    topicsDiscussed: [],
    memoryReferences: [],
    ctaHistory,
    deadEnds: analyses.filter(a => a.deadEnd).map(a => ({
      turnNumber: a.turnNumber,
      responseText: a.responseText,
      reason: 'Dead-end CTA detected',
    })),
    loops,
    finalRecommendation: null,
    reviewerNotes: [analyses.map(a => a.notes).filter(Boolean).join('; ')].filter(Boolean),
    overallImpression: '',
  };

  const report = evaluateConversation(record);
  return { script, analyses, report };
}

export function runAllConversations(): ConversationResult[] {
  const results: ConversationResult[] = [];
  for (const script of ALL_CONVERSATIONS) {
    try {
      const result = runConversation(script);
      results.push(result);
      console.log(`  ✓ ${script.label} (${script.id}) — score: ${result.report.overallScore}`);
    } catch (err: any) {
      console.error(`  ✗ ${script.label} (${script.id}) — ERROR: ${err.message}`);
    }
  }
  return results;
}

function buildHeatmap(results: ConversationResult[]): Record<string, { score: number; occurrences: number }> {
  const stages = ['greeting', 'discovery', 'qualification', 'trust', 'objection', 'recommendation', 'cta', 'closing'];
  const heatmap: Record<string, { score: number; occurrences: number }> = {};
  for (const stage of stages) heatmap[stage] = { score: 0, occurrences: 0 };

  for (const r of results) {
    for (const a of r.analyses) {
      const turn = a.turnNumber;
      const total = r.analyses.length;
      const stageIndex = Math.floor((turn / total) * stages.length);
      const stage = stages[Math.min(stageIndex, stages.length - 1)];

      const baseScore = (a.estimatedNaturalness / 5) * 100;
      const penalty = (a.feltGeneric ? 30 : 0) + (a.deadEnd ? 20 : 0) + (a.repeatedPhrases.length > 0 ? 10 : 0);
      const turnScore = Math.max(0, baseScore - penalty);

      heatmap[stage].score += turnScore;
      heatmap[stage].occurrences++;
    }
  }

  for (const stage of stages) {
    if (heatmap[stage].occurrences > 0) {
      heatmap[stage].score = Math.round(heatmap[stage].score / heatmap[stage].occurrences);
    }
  }
  return heatmap;
}

function findTopIssues(results: ConversationResult[]): Array<{ issue: string; frequency: number; avgImpact: number; example: string }> {
  const issueMap = new Map<string, { frequency: number; totalImpact: number; examples: string[] }>();

  for (const r of results) {
    for (const w of r.report.weaknesses) {
      const entry = issueMap.get(w) || { frequency: 0, totalImpact: 0, examples: [] };
      entry.frequency++;
      entry.totalImpact += (100 - r.report.overallScore);
      if (entry.examples.length < 3) {
        const failingTurn = r.analyses.find(a => a.feltGeneric || a.deadEnd);
        if (failingTurn) {
          entry.examples.push(`[${r.script.id}] Turn ${failingTurn.turnNumber}: "${failingTurn.responseText.slice(0, 80)}"`);
        }
      }
      issueMap.set(w, entry);
    }
    for (const g of r.report.genericResponses) {
      const issue = 'Generic/robotic response';
      const entry = issueMap.get(issue) || { frequency: 0, totalImpact: 0, examples: [] };
      entry.frequency++;
      entry.totalImpact += 15;
      if (entry.examples.length < 3) {
        entry.examples.push(`[${r.script.id}] Turn ${g.turn}: "${g.text.slice(0, 80)}"`);
      }
      issueMap.set(issue, entry);
    }
    for (const rp of r.report.repeatedPhrases) {
      const issue = `Repeated phrase: "${rp.phrase.slice(0, 40)}"`;
      const entry = issueMap.get(issue) || { frequency: 0, totalImpact: 0, examples: [] };
      entry.frequency += rp.count;
      entry.totalImpact += rp.count * 5;
      if (entry.examples.length < 3) {
        entry.examples.push(`[${r.script.id}] ${rp.count}x on turns ${rp.turns.join(',')}`);
      }
      issueMap.set(issue, entry);
    }
  }

  return Array.from(issueMap.entries())
    .map(([issue, data]) => ({
      issue,
      frequency: data.frequency,
      avgImpact: data.totalImpact > 0 ? Math.round(data.totalImpact / data.frequency) : 0,
      example: data.examples[0] || '',
    }))
    .sort((a, b) => b.frequency * b.avgImpact - a.frequency * a.avgImpact)
    .slice(0, 30);
}

function buildTranscripts(results: ConversationResult[], maxPerIssue = 3): Array<{ issue: string; transcripts: Array<{ id: string; turn: number; user: string; assistant: string }> }> {
  const issueTranscripts = new Map<string, Array<{ id: string; turn: number; user: string; assistant: string }>>();

  for (const r of results) {
    for (const a of r.analyses) {
      if (a.feltGeneric || a.deadEnd) {
        const issue = a.deadEnd ? 'Dead-end response' : 'Generic response';
        const list = issueTranscripts.get(issue) || [];
        if (list.length < maxPerIssue) {
          list.push({
            id: r.script.id,
            turn: a.turnNumber,
            user: a.userMessage.slice(0, 100),
            assistant: a.responseText.slice(0, 150),
          });
        }
        issueTranscripts.set(issue, list);
      }
    }
  }

  return Array.from(issueTranscripts.entries()).map(([issue, transcripts]) => ({ issue, transcripts }));
}

export function generateConsolidatedReport(results: ConversationResult[]): string {
  const reports = results.map(r => r.report);
  const summary = aggregateReports(reports);
  const heatmap = buildHeatmap(results);
  const topIssues = findTopIssues(results);
  const transcripts = buildTranscripts(results);

  const lines: string[] = [];
  const sep = '='.repeat(70);

  lines.push('');
  lines.push(sep);
  lines.push('  CONVERSATION ENGINE AUDIT — CONSOLIDATED REPORT');
  lines.push(sep);
  lines.push(`  Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`  Conversations: ${results.length}/${ALL_CONVERSATIONS.length}`);
  lines.push(`  Total Turns: ${results.reduce((a, r) => a + r.analyses.length, 0)}`);
  const completed = results.filter(r => r.report.overallScore > 0).length;
  lines.push(`  Completed: ${completed}`);
  const errors = ALL_CONVERSATIONS.length - results.length;
  if (errors > 0) lines.push(`  Errors: ${errors}`);
  lines.push(sep);
  lines.push('');

  // Overall scores
  lines.push('  📊  OVERALL PERFORMANCE');
  lines.push('  ' + '─'.repeat(50));
  lines.push(`  Average Score:       ${summary.averageScore}/100`);
  lines.push('');
  const avg = summary.metricAverages;
  const metrics = [
    ['Naturalness', avg.naturalness],
    ['Repetition', avg.repetitionScore],
    ['Topic Progression', avg.topicProgression],
    ['Memory Utilization', avg.memoryUtilization],
    ['Qualification Quality', avg.qualificationQuality],
    ['Sales Momentum', avg.salesMomentum],
    ['Trust Building', avg.trustBuilding],
    ['Objection Handling', avg.objectionHandling],
    ['CTA Timing', avg.ctaTiming],
    ['Conversation Completion', avg.conversationCompletion],
  ];
  for (const [label, score] of metrics) {
    const bar = '█'.repeat(Math.round((score as number) / 5)) + '░'.repeat(Math.max(0, 20 - Math.round((score as number) / 5)));
    lines.push(`  ${bar}  ${String(score).padStart(3)}  ${label}`);
  }
  lines.push(`  ${String(avg.deadEndCount).padStart(3)}  Dead-End Count (avg)`);
  lines.push(`  ${String(avg.loopCount).padStart(3)}  Loop Count (avg)`);
  lines.push('');

  // Scores by persona
  lines.push('  👤  SCORES BY PERSONA');
  lines.push('  ' + '─'.repeat(50));
  const personaOrder = ['shopify_merchant', 'saas_founder', 'enterprise_it_manager', 'healthcare_clinic', 'law_firm', 'restaurant_owner', 'marketing_agency', 'ecommerce_store', 'internal_kb_buyer', 'api_developer'];
  for (const persona of personaOrder) {
    if (summary.personaScores[persona]) {
      const { avg: score, count } = summary.personaScores[persona];
      const label = persona.replace(/_/g, ' ').padEnd(25);
      lines.push(`  ${label} ${String(score).padStart(3)}/100 (${count} conversations)`);
    }
  }
  lines.push('');

  // Scores by scenario
  lines.push('  🎭  SCORES BY SCENARIO TYPE');
  lines.push('  ' + '─'.repeat(50));
  const scenarioMap = new Map<string, number[]>();
  for (const r of results) {
    const list = scenarioMap.get(r.script.scenario) || [];
    list.push(r.report.overallScore);
    scenarioMap.set(r.script.scenario, list);
  }
  for (const [scenario, scores] of scenarioMap) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    lines.push(`  ${scenario.replace(/_/g, ' ').padEnd(25)} ${String(avg).padStart(3)}/100`);
  }
  lines.push('');

  // Heatmap
  lines.push('  🔥  HEATMAP — WEAK CONVERSATION STAGES');
  lines.push('  ' + '─'.repeat(50));
  const stageLabels = ['Greeting', 'Discovery', 'Qualification', 'Trust', 'Objection', 'Recommendation', 'CTA', 'Closing'];
  for (const stage of stageLabels) {
    const key = stage.toLowerCase();
    const data = heatmap[key];
    if (data && data.occurrences > 0) {
      const bar = '█'.repeat(Math.round(data.score / 5)) + '░'.repeat(Math.max(0, 20 - Math.round(data.score / 5)));
      const status = data.score >= 70 ? '✅' : data.score >= 50 ? '⚠️' : '❌';
      lines.push(`  ${status} ${bar}  ${String(data.score).padStart(3)}  ${stage.padEnd(16)} (${data.occurrences} turns)`);
    }
  }
  lines.push('');

  // Top 20 issues
  lines.push('  🔴  TOP 20 RECURRING ISSUES');
  lines.push('  ' + '─'.repeat(70));
  topIssues.slice(0, 20).forEach((issue, i) => {
    const impact = issue.avgImpact >= 20 ? 'HIGH' : issue.avgImpact >= 10 ? 'MED' : 'LOW';
    lines.push(`  ${String(i + 1).padStart(2)}. [${impact.padEnd(4)}] ${issue.issue}`);
    lines.push(`       freq: ${issue.frequency}x | impact: ${issue.avgImpact}`);
    if (issue.example) {
      lines.push(`       eg: ${issue.example.slice(0, 100)}`);
    }
  });
  lines.push('');

  // Failure transcripts
  if (transcripts.length > 0) {
    lines.push('  📝  FAILURE TRANSCRIPTS');
    lines.push('  ' + '─'.repeat(70));
    for (const t of transcripts) {
      lines.push(`  ❌ ${t.issue} (${t.transcripts.length} examples)`);
      for (const ex of t.transcripts) {
        lines.push(`    [${ex.id}:${ex.turn}]`);
        lines.push(`    User:      "${ex.user}"`);
        lines.push(`    Assistant: "${ex.assistant}"`);
        lines.push('');
      }
    }
  }

  // Prioritized fixes
  lines.push('');
  lines.push('  🎯  PRIORITIZED FIXES (BY EXPECTED CUSTOMER IMPACT)');
  lines.push('  ' + '─'.repeat(70));

  // Derive prioritized fixes from top issues
  const fixMap: Record<string, { impact: string; issues: string[] }> = {
    'Eliminate dead-end responses': { impact: 'HIGH — directly causes conversation abandonment', issues: [] },
    'Increase response variety to reduce repetition': { impact: 'HIGH — repetitive wording erodes professionalism', issues: [] },
    'Fix generic opening patterns': { impact: 'MED-HIGH — formulaic openings feel robotic', issues: [] },
    'Improve topic continuity on user-driven changes': { impact: 'MED — affects conversational flow', issues: [] },
    'Better qualification timing': { impact: 'MED — premature qualification interrupts exploration', issues: [] },
    'Add memory references in follow-up responses': { impact: 'MED — customers notice when context is lost', issues: [] },
    'Improve CTA placement and relevance': { impact: 'MED — wrong CTA timing reduces conversion', issues: [] },
    'Reduce unnecessary qualification loops': { impact: 'LOW-MED — mainly affects skeptical personas', issues: [] },
  };

  for (const issue of topIssues.slice(0, 15)) {
    if (issue.issue.includes('dead') || issue.issue.includes('Dead')) {
      fixMap['Eliminate dead-end responses'].issues.push(issue.issue);
    } else if (issue.issue.includes('Repeated') || issue.issue.includes('repetition')) {
      fixMap['Increase response variety to reduce repetition'].issues.push(issue.issue);
    } else if (issue.issue.includes('Generic') || issue.issue.includes('robotic')) {
      fixMap['Fix generic opening patterns'].issues.push(issue.issue);
    } else if (issue.issue.includes('Topic') || issue.issue.includes('continuity')) {
      fixMap['Improve topic continuity on user-driven changes'].issues.push(issue.issue);
    } else if (issue.issue.includes('Qualification') || issue.issue.includes('qualification')) {
      fixMap['Better qualification timing'].issues.push(issue.issue);
    } else if (issue.issue.includes('Memory') || issue.issue.includes('memory')) {
      fixMap['Add memory references in follow-up responses'].issues.push(issue.issue);
    } else if (issue.issue.includes('CTA') || issue.issue.includes('cta')) {
      fixMap['Improve CTA placement and relevance'].issues.push(issue.issue);
    } else if (issue.issue.includes('Loop') || issue.issue.includes('loop')) {
      fixMap['Reduce unnecessary qualification loops'].issues.push(issue.issue);
    }
  }

  let fixRank = 1;
  const fixOrder = [
    'Eliminate dead-end responses',
    'Increase response variety to reduce repetition',
    'Fix generic opening patterns',
    'Improve topic continuity on user-driven changes',
    'Better qualification timing',
    'Add memory references in follow-up responses',
    'Improve CTA placement and relevance',
    'Reduce unnecessary qualification loops',
  ];

  for (const fix of fixOrder) {
    const data = fixMap[fix];
    if (!data || data.issues.length === 0) continue;
    lines.push(`  ${fixRank}. ${fix}`);
    lines.push(`     Impact: ${data.impact}`);
    lines.push(`     Evidence: ${data.issues.length} related issues found`);
    if (data.issues.length > 0) {
      lines.push(`     Includes: ${data.issues.slice(0, 3).join('; ')}`);
    }
    lines.push('');
    fixRank++;
  }

  lines.push(sep);
  lines.push('  END OF AUDIT REPORT');
  lines.push(sep);
  lines.push('');

  return lines.join('\n');
}

// Entry point
if (require.main === module) {
  console.log('\nStarting 50-conversation audit...\n');
  const results = runAllConversations();
  console.log(`\nCompleted ${results.length} conversations. Generating report...\n`);
  const report = generateConsolidatedReport(results);
  console.log(report);
}
