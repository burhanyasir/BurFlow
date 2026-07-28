import { EvaluationReport, EvaluationMetrics, AggregatedSummary } from './types';

function bar(value: number, width = 20): string {
  const filled = Math.round((value / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function scoreLabel(value: number): string {
  if (value >= 90) return 'Excellent';
  if (value >= 75) return 'Good';
  if (value >= 60) return 'Fair';
  if (value >= 40) return 'Poor';
  return 'Critical';
}

const SCORE_COLORS: Record<string, string> = {
  Excellent: '🟢',
  Good: '🟡',
  Fair: '🟠',
  Poor: '🔴',
  Critical: '⛔',
};

export function formatReport(report: EvaluationReport): string {
  const lines: string[] = [];
  const sep = '─'.repeat(60);

  lines.push('');
  lines.push(`  ${SCORE_COLORS[scoreLabel(report.overallScore)]}  CONVERSATION EVALUATION REPORT`);
  lines.push(sep);
  lines.push(`  Persona:        ${report.persona.replace(/_/g, ' ')}`);
  lines.push(`  Scenario:       ${report.scenario.replace(/_/g, ' ')}`);
  lines.push(`  User Goal:      ${report.userGoal}`);
  lines.push(`  Turns:          ${report.turnCount}`);
  lines.push(`  Overall Score:  ${report.overallScore}/100  (${scoreLabel(report.overallScore)})`);
  lines.push(sep);
  lines.push('');

  // Metric Breakdown
  lines.push('  📊  METRICS BREAKDOWN');
  lines.push('  ' + '─'.repeat(58));

  const metricLabels: Array<{ key: keyof EvaluationMetrics; label: string; unit?: string; max?: number }> = [
    { key: 'naturalness', label: 'Naturalness' },
    { key: 'repetitionScore', label: 'Repetition (lower is better)', max: 100 },
    { key: 'topicProgression', label: 'Topic Progression' },
    { key: 'memoryUtilization', label: 'Memory Utilization' },
    { key: 'qualificationQuality', label: 'Qualification Quality' },
    { key: 'salesMomentum', label: 'Sales Momentum' },
    { key: 'trustBuilding', label: 'Trust Building' },
    { key: 'objectionHandling', label: 'Objection Handling' },
    { key: 'ctaTiming', label: 'CTA Timing' },
    { key: 'conversationCompletion', label: 'Conversation Completion' },
    { key: 'deadEndCount', label: 'Dead-Ends', unit: ' count', max: 100 },
    { key: 'loopCount', label: 'Loops', unit: ' count', max: 100 },
  ];

  for (const m of metricLabels) {
    const value = report.metrics[m.key] as number;
    if (m.max === undefined) {
      lines.push(`  ${bar(value)}  ${value.toString().padStart(3)}  ${m.label}`);
    } else {
      lines.push(`  ${value.toString().padStart(2)}x     ${m.label}`);
    }
  }
  lines.push('');

  // Strengths
  if (report.strengths.length > 0) {
    lines.push('  ✅  STRENGTHS');
    for (const s of report.strengths) lines.push(`    • ${s}`);
    lines.push('');
  }

  // Weaknesses
  if (report.weaknesses.length > 0) {
    lines.push('  ❌  WEAKNESSES');
    for (const w of report.weaknesses) lines.push(`    • ${w}`);
    lines.push('');
  }

  // Suggested Improvements
  if (report.suggestedImprovements.length > 0) {
    lines.push('  💡  SUGGESTED IMPROVEMENTS');
    for (const s of report.suggestedImprovements) lines.push(`    • ${s}`);
    lines.push('');
  }

  // Generic Responses
  if (report.genericResponses.length > 0) {
    lines.push('  ⚠️  GENERIC / ROBOTIC RESPONSES');
    for (const g of report.genericResponses) {
      const excerpt = g.text.length > 80 ? g.text.slice(0, 80) + '…' : g.text;
      lines.push(`    Turn ${g.turn}: "${excerpt}"`);
    }
    lines.push('');
  }

  // Unnecessary Qualifications
  if (report.unnecessaryQualifications.length > 0) {
    lines.push('  ❓  UNNECESSARY QUALIFICATION');
    for (const u of report.unnecessaryQualifications) {
      const excerpt = u.question.length > 80 ? u.question.slice(0, 80) + '…' : u.question;
      lines.push(`    Turn ${u.turn}: "${excerpt}"`);
    }
    lines.push('');
  }

  // Repeated Phrases
  if (report.repeatedPhrases.length > 0) {
    lines.push('  🔁  REPEATED PHRASES');
    for (const r of report.repeatedPhrases) {
      lines.push(`    "${r.phrase}" — ${r.count}x (turns: ${r.turns.join(', ')})`);
    }
    lines.push('');
  }

  // Missed Opportunities
  if (report.missedOpportunities.length > 0) {
    lines.push('  🎯  MISSED OPPORTUNITIES (better follow-ups)');
    for (const m of report.missedOpportunities) {
      lines.push(`    Turn ${m.turn}: ${m.context}`);
      lines.push(`              → ${m.suggestion}`);
    }
    lines.push('');
  }

  // CTA Issues
  if (report.ctaIssues.length > 0) {
    lines.push('  📢  CTA ISSUES');
    for (const c of report.ctaIssues) {
      lines.push(`    Turn ${c.turn}: ${c.issue}`);
    }
    lines.push('');
  }

  // Qualification Issues
  if (report.qualificationIssues.length > 0) {
    lines.push('  📋  QUALIFICATION ISSUES');
    for (const q of report.qualificationIssues) {
      lines.push(`    Turn ${q.turn}: ${q.issue}`);
    }
    lines.push('');
  }

  // Funnel Stalls & Momentum Breaks
  if (report.funnelStallPoints.length > 0) {
    lines.push(`  ⏸️  FUNNEL STALL POINTS: turns ${report.funnelStallPoints.join(', ')}`);
    lines.push('');
  }
  if (report.momentumBreaks.length > 0) {
    lines.push(`  🔄  MOMENTUM BREAKS: turns ${report.momentumBreaks.join(', ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function formatAggregatedSummary(summary: AggregatedSummary): string {
  const lines: string[] = [];
  const sep = '═'.repeat(60);

  lines.push('');
  lines.push(`  📊  AGGREGATED EVALUATION SUMMARY`);
  lines.push(sep);
  lines.push(`  Total Conversations:  ${summary.totalConversations}`);
  lines.push(`  Average Score:        ${summary.averageScore}/100`);
  lines.push(sep);
  lines.push('');

  lines.push('  📈  PER-PERSONA SCORES');
  for (const [persona, data] of Object.entries(summary.personaScores)) {
    const label = persona.replace(/_/g, ' ');
    const chunks = [];
    for (let i = 0; i < label.length; i += 30) {
      chunks.push(label.slice(i, i + 30));
    }
    lines.push(`    ${chunks[0].padEnd(30)} ${data.avg}/100 (${data.count} conversations)`);
  }
  lines.push('');

  lines.push('  📊  AVERAGE METRICS');
  const metricLabels: Array<{ key: keyof EvaluationMetrics; label: string }> = [
    { key: 'naturalness', label: 'Naturalness' },
    { key: 'repetitionScore', label: 'Repetition' },
    { key: 'topicProgression', label: 'Topic Progression' },
    { key: 'memoryUtilization', label: 'Memory Utilization' },
    { key: 'qualificationQuality', label: 'Qualification Quality' },
    { key: 'salesMomentum', label: 'Sales Momentum' },
    { key: 'trustBuilding', label: 'Trust Building' },
    { key: 'objectionHandling', label: 'Objection Handling' },
    { key: 'ctaTiming', label: 'CTA Timing' },
    { key: 'conversationCompletion', label: 'Conversation Completion' },
  ];
  for (const m of metricLabels) {
    const value = summary.metricAverages[m.key] as number;
    lines.push(`  ${bar(value)}  ${value.toString().padStart(3)}  ${m.label}`);
  }
  lines.push('');

  if (summary.topWeaknesses.length > 0) {
    lines.push('  🔴  TOP 10 WEAKNESSES (by frequency)');
    summary.topWeaknesses.forEach((w, i) => {
      const freq = summary.frequencyMap[w] || 0;
      lines.push(`  ${(i + 1).toString().padStart(2)}. ${w} (${freq}x)`);
    });
    lines.push('');
  }

  if (summary.topImprovements.length > 0) {
    lines.push('  💡  TOP 10 SUGGESTED IMPROVEMENTS');
    summary.topImprovements.forEach((imp, i) => {
      lines.push(`  ${(i + 1).toString().padStart(2)}. ${imp}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

export function formatTurnByTurn(turns: EvaluationReport['genericResponses'] extends never ? any : any, record: any): string {
  // Reserved for future turn-by-turn transcript formatting
  return '';
}
