export const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'on', 'for',
  'with', 'at', 'by', 'from', 'as', 'it', 'this', 'that', 'these', 'those', 'your', 'you', 'our',
  'we', 'they', 'their', 'them', 'what', 'how', 'why', 'when', 'where', 'can', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'about', 'there', 'more', 'most', 'than', 'then', 'its', 'not',
]);

export const IMPERATIVE_VERBS = ['create', 'set', 'ensure', 'review', 'update', 'add', 'use', 'implement', 'build', 'schedule', 'automate', 'track', 'remove', 'start', 'send', 'draft', 'improve', 'test', 'install', 'configure', 'define', 'plan', 'prepare', 'publish', 'share', 'monitor', 'measure'];

export function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function summarize(text: string): string {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return 'No content available to summarize yet.';
  const scored = sentences
    .map((s, i) => {
      const length = s.split(/\s+/).length;
      let score = 0;
      if (length >= 8 && length <= 45) score += 2;
      if (i === 0) score += 2;
      if (i < Math.ceil(sentences.length / 3)) score += 1;
      if (/because|therefore|as a result|key|important|primary|main|most/.test(s.toLowerCase())) score += 1;
      return { s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, sentences.length))
    .sort((a, b) => sentences.indexOf(a.s) - sentences.indexOf(b.s))
    .map((x) => x.s);
  return scored.join('\n');
}

export function extractFaqs(text: string): string[] {
  const questions = splitSentences(text).filter((s) => s.endsWith('?'));
  const clean = questions.filter((q) => /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will|would)/i.test(q));
  const picked = clean.length >= 3 ? clean.slice(0, 6) : questions.slice(0, 6);
  return picked.length > 0 ? picked : ['What are the main points of this content?', 'How does this apply to my situation?', 'What should I do next?'];
}

export function extractActionItems(text: string): string[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const fromLines = lines
    .filter((l) => /^[-*]\s+/i.test(l) || /^\d+[.)]\s+/i.test(l))
    .map((l) => l.replace(/^[-*]\s+/i, '').replace(/^\d+[.)]\s+/, ''));
  const fromSentences = splitSentences(text).filter((s) => {
    const first = s.toLowerCase().split(/\s+/)[0] ?? '';
    return IMPERATIVE_VERBS.includes(first);
  });
  const items = [...fromLines, ...fromSentences].filter((s) => s.length > 0 && s.length < 160);
  const unique = Array.from(new Set(items)).slice(0, 8);
  return unique.length > 0 ? unique : ['Review the source text and identify follow-up tasks to plan next steps.'];
}

export function answerQuestion(question: string, text: string): string {
  const qWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  if (qWords.length === 0 || text.trim().length === 0) {
    return 'Paste some text first — then I can answer questions about it.';
  }
  const sentences = splitSentences(text);
  const scored = sentences
    .map((s) => {
      const words = s.toLowerCase().split(/\s+/);
      const hits = qWords.filter((w) => words.includes(w)).length;
      return { s, hits, ratio: words.length > 0 ? hits / words.length : 0 };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || b.ratio - a.ratio);
  if (scored.length === 0) {
    return `I couldn't find a direct match for that question in the provided content. Try rephrasing, or paste the relevant section so I can give a precise answer.`;
  }
  const top = scored.slice(0, Math.min(2, scored.length)).map((x) => `- ${x.s}`).join('\n');
  return `Based on the content you provided:\n${top}`;
}

export function extractTopics(text: string, limit = 6): string[] {
  const freq = new Map<string, number>();
  for (const word of text.toLowerCase().split(/\W+/)) {
    if (word.length > 4 && !STOP_WORDS.has(word)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}