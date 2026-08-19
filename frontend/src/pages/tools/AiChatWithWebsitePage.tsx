import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, ListChecks, MessageSquare, Send, Sparkles } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import { track } from '../../lib/analytics';

const tool = getToolBySlug('ai-chat-with-website')!;

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'on', 'for',
  'with', 'at', 'by', 'from', 'as', 'it', 'this', 'that', 'these', 'those', 'your', 'you', 'our',
  'we', 'they', 'their', 'them', 'what', 'how', 'why', 'when', 'where', 'can', 'do', 'does', 'did',
  'will', 'would', 'should', 'could', 'about', 'there', 'more', 'most', 'than', 'then', 'its', 'not',
]);

const IMPERATIVE_VERBS = ['create', 'set', 'ensure', 'review', 'update', 'add', 'use', 'implement', 'build', 'schedule', 'automate', 'track', 'remove', 'start', 'send', 'draft', 'improve', 'test', 'install', 'configure', 'define', 'plan', 'prepare', 'publish', 'share', 'monitor', 'measure'];

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function summarize(text: string): string {
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

function extractFaqs(text: string): string[] {
  const questions = splitSentences(text).filter((s) => s.endsWith('?'));
  const clean = questions.filter((q) => /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will|would)/i.test(q));
  const picked = clean.length >= 3 ? clean.slice(0, 6) : questions.slice(0, 6);
  return picked.length > 0 ? picked : ['What are the main points of this content?', 'How does this apply to my situation?', 'What should I do next?'];
}

function extractActionItems(text: string): string[] {
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

function answerQuestion(question: string, text: string): string {
  const qWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  if (qWords.length === 0 || text.trim().length === 0) {
    return 'Paste some text or a webpage URL on the left first — then I can answer questions about it.';
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

function extractBodyText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 6000);
}

export default function AiChatWithWebsitePage() {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const pushMessage = (role: ChatMessage['role'], content: string) => {
    setMessages((prev) => [...prev, { role, text: content }]);
  };

  const runAnalysis = async (label: string, buildReply: (content: string) => string) => {
    const content = text.trim();
    const hasUrl = /^https?:\/\/.+\..+/.test(url.trim());
    if (content.length === 0 && !hasUrl) {
      pushMessage('ai', 'Add a webpage URL or paste some text on the left first — then I can analyze it for you.');
      return;
    }
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'chat_analysis', sub_action: label });
    setBusy(true);
    try {
      let body = content;
      if (body.length === 0 && hasUrl) {
        try {
          const res = await fetch(url.trim(), { mode: 'cors' });
          const html = await res.text();
          body = extractBodyText(html);
        } catch {
          pushMessage(
            'ai',
            `${label}: I couldn't fetch ${url.trim()} directly — that site blocks cross-origin requests from the browser. Paste its text on the left and I'll analyze it instantly (works offline, too).`
          );
          return;
        }
      }
      if (body.trim().length < 20) {
        pushMessage('ai', 'The content looks too short to analyze meaningfully. Paste a longer section for better results.');
        return;
      }
      setTimeout(() => {
        pushMessage('ai', buildReply(body));
      }, 350);
    } finally {
      setBusy(false);
    }
  };

  const handleAsk = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length === 0) return;
    pushMessage('user', q);
    setQuestion('');
    runAnalysis(q, (content) => answerQuestion(q, content));
  };

  const quickActions = [
    {
      label: 'Generate Executive Summary',
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
      run: () => runAnalysis('Executive summary', (content) => {
        const wc = wordCount(content);
        const sentences = splitSentences(content).length;
        return `Executive summary\n\n${summarize(content)}\n\nOverview: ${wc.toLocaleString()} words · ${sentences} sentences · ~${Math.max(1, Math.round(wc / 200))} min read.`;
      }),
    },
    {
      label: 'Extract Key FAQs',
      icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
      run: () => runAnalysis('Key FAQs', (content) =>
        `Key FAQs from the content\n\n${extractFaqs(content).map((f) => `- ${f}`).join('\n')}`
      ),
    },
    {
      label: 'List Action Items',
      icon: <ListChecks className="h-4 w-4" aria-hidden="true" />,
      run: () => runAnalysis('Action items', (content) =>
        `Action items identified\n\n${extractActionItems(content).map((a) => `- ${a}`).join('\n')}`
      ),
    },
  ];

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Enter any webpage URL or paste text — then ask questions, generate executive summaries, extract FAQs, or list action items instantly."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Source */}
        <div className="space-y-5">
          <div>
            <label htmlFor="chat-url" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Webpage URL
            </label>
            <input
              id="chat-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com (optional — some sites block fetching)"
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
          </div>
          <div>
            <label htmlFor="chat-text" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              Or paste text (report, article, transcript, policy doc…)
            </label>
            <textarea
              id="chat-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste any plain text here to analyze it locally in your browser…"
              rows={10}
              className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.run}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-accent-600)]/40 bg-[var(--color-accent-600)]/5 px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-700)] transition-all hover:bg-[var(--color-accent-600)]/15 disabled:opacity-50"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-4 text-xs leading-relaxed text-[var(--color-neutral-500)]">
            <p>
              Your text is analyzed locally and never leaves your machine. Want an AI assistant trained on your
              own docs, answering on your website 24/7?{' '}
              <Link
                to="/signup"
                onClick={() => track('tool_cta_click', { tool_id: tool.slug, location: 'sidebar_note' })}
                className="font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
              >
                Try BurFlow Free
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Chat */}
        <div className="flex min-h-[26rem] flex-col">
          <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Chat with your data</h2>
          <div className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-4" style={{ maxHeight: '30rem' }}>
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--color-neutral-400)]">
                Ask anything about the content above — or tap a quick action to get started.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--color-accent-600)] px-4 py-2.5 text-sm text-white'
                        : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-2.5 text-sm text-[var(--color-neutral-800)]'
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleAsk} className="mt-3 flex items-center gap-2">
            <label htmlFor="chat-question" className="sr-only">Ask a question</label>
            <input
              id="chat-question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the content…"
              className="flex-1 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
            />
            <button
              type="submit"
              disabled={busy || question.trim().length === 0}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent-600)] text-white shadow-md transition-all hover:bg-[var(--color-accent-700)] disabled:opacity-50"
              aria-label="Send question"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
            <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
            Instant local analysis — unlimited questions, no sign-up.
          </p>
          <p className="mt-1 text-xs text-[var(--color-neutral-400)]">
            <ArrowRight className="mr-1 inline h-3 w-3" aria-hidden="true" />
            For AI chat on <strong>your website</strong> with your knowledge base, <Link to="/signup" onClick={() => track('tool_cta_click', { tool_id: tool.slug, location: 'chat_footer' })} className="font-semibold text-[var(--color-accent-600)]">deploy BurFlow</Link>.
          </p>
        </div>
      </div>
    </GenericToolWrapper>
  );
}