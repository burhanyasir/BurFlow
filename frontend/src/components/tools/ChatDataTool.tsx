import { useRef, useState, type FormEvent } from 'react';
import { FileText, ListChecks, MessageSquare, Send, Sparkles, FileUp } from 'lucide-react';
import type { ToolDefinition } from '../../data/toolsData';
import { track } from '../../lib/analytics';
import { answerQuestion, extractActionItems, extractFaqs, summarize, wordCount } from '../../lib/tools/chat';
import { extractTextFromFile } from '../../lib/tools/extract';

interface ChatDataToolProps {
  tool: ToolDefinition;
  accept?: string;
  fileLabel?: string;
  pasteLabel?: string;
  placeholder?: string;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export default function ChatDataTool({ tool, accept = '*', fileLabel = 'or upload a file (TXT, MD, CSV, JSON…)', pasteLabel = 'Or paste your text', placeholder = 'Paste your text here to analyze it locally in your browser…' }: ChatDataToolProps) {
  const [text, setText] = useState('');
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const pushMessage = (role: ChatMessage['role'], content: string) => {
    setMessages((prev) => [...prev, { role, text: content }]);
  };

  const runAnalysis = (label: string, buildReply: (content: string) => string) => {
    const content = text.trim();
    if (content.length === 0) {
      pushMessage('ai', 'Add some text on the left first — then I can analyze it for you.');
      return;
    }
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'chat_analysis', sub_action: label });
    setBusy(true);
    setTimeout(() => {
      pushMessage('ai', buildReply(content));
      setBusy(false);
    }, 350);
  };

  const handleAsk = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length === 0) return;
    pushMessage('user', q);
    setQuestion('');
    runAnalysis(q, (content) => answerQuestion(q, content));
  };

  const handleFile = async (file: File) => {
    try {
      const { text: extracted } = await extractTextFromFile(file);
      setText(extracted);
      setFileName(file.name);
      track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'load_file', file_size: file.size });
      pushMessage('ai', `Loaded ${file.name} — ${wordCount(extracted).toLocaleString()} words. Ask me anything about it, or tap a quick action below.`);
    } catch (err) {
      pushMessage('ai', err instanceof Error ? err.message : 'Could not read that file.');
    }
  };

  const quickActions = [
    {
      label: 'Generate Executive Summary',
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
      run: () => runAnalysis('Executive summary', (content) => {
        const wc = wordCount(content);
        return `Executive summary\n\n${summarize(content)}\n\nOverview: ${wc.toLocaleString()} words · ~${Math.max(1, Math.round(wc / 200))} min read.`;
      }),
    },
    {
      label: 'Extract Key FAQs',
      icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
      run: () => runAnalysis('Key FAQs', (content) => `Key FAQs from the content\n\n${extractFaqs(content).map((f) => `- ${f}`).join('\n')}`),
    },
    {
      label: 'List Action Items',
      icon: <ListChecks className="h-4 w-4" aria-hidden="true" />,
      run: () => runAnalysis('Action items', (content) => `Action items identified\n\n${extractActionItems(content).map((a) => `- ${a}`).join('\n')}`),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      {/* Source */}
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="chatd-text" className="text-sm font-semibold text-[var(--color-neutral-900)]">
              {pasteLabel}
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
              {fileLabel}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </div>
          <textarea
            id="chatd-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={12}
            className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
          />
          {fileName && <p className="text-xs text-[var(--color-neutral-500)]">Loaded: <span className="font-semibold">{fileName}</span></p>}
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
        <p className="text-xs text-[var(--color-neutral-400)]">
          Your text is analyzed locally and never leaves your machine. Want an AI assistant trained on your own docs,
          answering on your website 24/7? <a href="/signup" className="font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]">Try BurFlow Free</a>.
        </p>
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
        </div>
        <form onSubmit={handleAsk} className="mt-3 flex items-center gap-2">
          <label htmlFor="chatd-question" className="sr-only">Ask a question</label>
          <input
            id="chatd-question"
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
      </div>
    </div>
  );
}