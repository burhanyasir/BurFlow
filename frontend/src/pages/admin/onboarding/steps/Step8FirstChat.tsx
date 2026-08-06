import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import type { ChatMessage } from '../onboarding-context';
import type { BusinessIntelligenceSnapshot } from '../../../../utils/business-profile';

interface Props {
  agentId: string;
  messages: ChatMessage[];
  businessProfile?: BusinessIntelligenceSnapshot;
  onSend: (message: string) => Promise<ChatMessage>;
}

const SUGGESTIONS = [
  'What products do you offer?',
  'Which plan is best for my team?',
  'Can you tell me the pricing?',
  'Can you help me book a demo?',
];

export function Step8FirstChat({ agentId, messages, businessProfile, onSend }: Props) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (businessProfile?.suggestedQuestions?.length) {
      return businessProfile.suggestedQuestions;
    }
    return SUGGESTIONS;
  }, [businessProfile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    try {
      await onSend(msg);
    } catch {}
    setSending(false);
  };

  if (!agentId) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-4">
        <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Test Your Chatbot</h2>
        <p className="text-sm text-[var(--color-neutral-500)] mb-8">Complete the earlier steps first to enable the chat test.</p>
        <div className="bg-[var(--color-warning-50)] border border-[var(--color-warning-100)] rounded-xl p-6 text-center">
          <p className="text-sm text-[var(--color-warning-700)]">Please set up your workspace and install the widget first, then return here to test.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-4">
      <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Try a real sales conversation</h2>
      <p className="text-sm text-[var(--color-neutral-500)] mb-6">Send a test message and see how the agent recommends products, answers pricing questions, and helps visitors take the next step.</p>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              disabled={sending}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:border-[var(--color-accent-300)] hover:text-[var(--color-accent-600)] hover:bg-[var(--color-accent-50)] transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-neutral-200)] bg-white overflow-hidden shadow-sm">
        <div className="p-4 space-y-4 min-h-[340px] max-h-[420px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto text-[var(--color-neutral-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                <p className="text-sm text-[var(--color-neutral-400)] mt-3">{businessProfile ? businessProfile.welcomeMessage : 'Try asking about products, pricing, or how to book a demo.'}</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.role === 'user' ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-700)]' : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]'}`}>
                {m.role === 'user' ? 'You' : 'AI'}
              </div>
              <div className={`max-w-[80%] ${m.role === 'user' ? 'bg-[var(--color-accent-600)] text-white rounded-2xl rounded-tr-sm px-4 py-2.5' : 'rounded-2xl rounded-tl-sm bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)] p-3'}`}>
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Badge size="sm" variant="primary">Live</Badge>
                  </div>
                )}
                <p className="text-sm">{m.content}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--color-neutral-100)] flex items-center justify-center text-xs text-[var(--color-neutral-500)]">AI</div>
              <div className="bg-[var(--color-neutral-50)] rounded-2xl rounded-tl-sm border border-[var(--color-neutral-100)] p-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-neutral-300)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-neutral-300)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-neutral-300)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-[var(--color-neutral-100)]">
          <div className="flex gap-2">
            <input
              className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-[var(--color-neutral-200)] focus:outline-none focus:border-[var(--color-accent-500)] focus:ring-1 focus:ring-[var(--color-accent-500)]"
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={sending}
            />
            <Button size="sm" onClick={() => handleSend()} disabled={!input.trim() || sending}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </Button>
          </div>
          <p className="text-xs text-[var(--color-neutral-400)] mt-2 text-center">Responses come from your live chatbot using your knowledge sources.</p>
        </div>
      </div>
    </motion.div>
  );
}
