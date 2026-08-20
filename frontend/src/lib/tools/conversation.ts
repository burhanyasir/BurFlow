export interface ConversationTurn {
  role: 'user' | 'agent' | 'unknown';
  text: string;
}

export function parseConversationLog(text: string): ConversationTurn[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const turns: ConversationTurn[] = [];
  let current: ConversationTurn | null = null;
  for (const line of lines) {
    const userMatch = line.match(/^(user|customer|visitor|lead|prospect)\s*:\s*(.*)$/i);
    const agentMatch = line.match(/^(agent|bot|assistant|ai|support)\s*:\s*(.*)$/i);
    if (userMatch) {
      current = { role: 'user', text: userMatch[2] };
      turns.push(current);
    } else if (agentMatch) {
      current = { role: 'agent', text: agentMatch[2] };
      turns.push(current);
    } else if (current) {
      current.text += ` ${line}`;
    } else {
      turns.push({ role: 'unknown', text: line });
    }
  }
  return turns;
}

export interface ConversationStats {
  totalTurns: number;
  userTurns: number;
  agentTurns: number;
  avgUserLength: number;
  avgAgentLength: number;
  questionsAsked: string[];
  unansweredQuestions: string[];
  repeatedTopics: string[];
  greetingDetected: boolean;
  closingDetected: boolean;
  lastUserMessage: string;
}

const QUESTION_RE = /\?$/;
const GREETINGS = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'hola', 'yo'];
const CLOSINGS = ['bye', 'goodbye', 'thanks', 'thank you', 'great, thanks', 'have a great day'];

export function analyzeConversation(turns: ConversationTurn[]): ConversationStats {
  const user = turns.filter((t) => t.role === 'user');
  const agent = turns.filter((t) => t.role === 'agent');
  const questionsAsked = user.map((t) => t.text).filter((s) => QUESTION_RE.test(s));
  const freq = new Map<string, number>();
  for (const t of turns) {
    for (const word of t.text.toLowerCase().split(/\W+/)) {
      if (word.length > 4) freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  const repeatedTopics = Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
  const lastUser = user[user.length - 1]?.text ?? '';
  const unansweredQuestions = questionsAsked.filter((q) => {
    const idx = turns.findIndex((t) => t.role === 'user' && t.text === q);
    const next = turns[idx + 1];
    return !next || next.role !== 'agent';
  });
  const firstTurn = turns[0]?.text.toLowerCase() ?? '';
  const lastTurn = turns[turns.length - 1]?.text.toLowerCase() ?? '';
  return {
    totalTurns: turns.length,
    userTurns: user.length,
    agentTurns: agent.length,
    avgUserLength: user.length > 0 ? Math.round(user.reduce((sum, t) => sum + t.text.split(/\s+/).length, 0) / user.length) : 0,
    avgAgentLength: agent.length > 0 ? Math.round(agent.reduce((sum, t) => sum + t.text.split(/\s+/).length, 0) / agent.length) : 0,
    questionsAsked,
    unansweredQuestions,
    repeatedTopics,
    greetingDetected: GREETINGS.some((g) => firstTurn.startsWith(g)),
    closingDetected: CLOSINGS.some((c) => lastTurn.includes(c)),
    lastUserMessage: lastUser,
  };
}

export function buildConversationReport(stats: ConversationStats): string {
  const lines = [
    '# Conversation analysis report',
    '',
    `**Overview:** ${stats.totalTurns} turns (${stats.userTurns} visitor · ${stats.agentTurns} agent). Average visitor message: ${stats.avgUserLength} words. Average agent reply: ${stats.avgAgentLength} words.`,
    '',
    '## Quality signals',
    `- Greeting handled: ${stats.greetingDetected ? 'Yes' : 'No explicit greeting detected'}`,
    `- Closing handled: ${stats.closingDetected ? 'Yes' : 'No closing detected — consider adding a goodbye fallback'}`,
    `- Unanswered questions: ${stats.unansweredQuestions.length > 0 ? stats.unansweredQuestions.length : 'None'}`,
    '',
  ];
  if (stats.unansweredQuestions.length > 0) {
    lines.push('## Knowledge gaps', '', ...stats.unansweredQuestions.map((q) => `- ${q}`), '');
  }
  if (stats.repeatedTopics.length > 0) {
    lines.push('## Repeated topics (likely high-intent keywords)', '', ...stats.repeatedTopics.map((t) => `- ${t}`), '');
  }
  if (stats.questionsAsked.length > 0) {
    lines.push('## Questions visitors asked', '', ...stats.questionsAsked.map((q) => `- ${q}`), '');
  }
  lines.push('## Recommendations', '', '- Add knowledge-base answers for any unanswered question above.', '- Consider a CTA after repeated topics (pricing, demo, trial).', '- Shorten agent replies if the average exceeds ~60 words.');
  return lines.join('\n');
}