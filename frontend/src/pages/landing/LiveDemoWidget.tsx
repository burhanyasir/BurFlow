import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  sources?: string[];
  isFallback?: boolean;
}

const SCRIPTED_QA: Record<string, { answer: string; sources: string[] }> = {
  'what is your return policy': {
    answer: 'Items must be returned within 30 days of delivery in original condition. Refunds are processed within 5\u20137 business days after we receive the return.',
    sources: ['Refund Policy \u2014 p.2']
  },
  'how do i integrate the widget': {
    answer: 'Copy the embed snippet from your dashboard and paste it into your site\'s <head> tag. The widget goes live in under 10 minutes with zero complex engineering.',
    sources: ['Integration Guide \u2014 Quick Start']
  },
  'what are your pricing tiers': {
    answer: 'We offer Free (100 messages/mo), Starter ($49/mo), Professional ($99/mo), and Enterprise (custom). All paid tiers include a 14-day free trial.',
    sources: ['Pricing Overview']
  },
  'do you support sso': {
    answer: 'Enterprise plans include full SSO/SAML support. Configure it in your Team Settings under the Admin panel.',
    sources: ['Enterprise Features \u2014 SSO']
  }
};

const FALLBACK_RESPONSE = {
  answer: 'I don\'t want to guess. I can help you discover the right product, plan, or next step based on your website content.',
  sources: [] as string[]
};

const SUGGESTED_QUESTIONS = [
  'What products do you offer?',
  'Which plan is best for my team?',
  'How does onboarding work?'
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-400)] animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-400)] animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-400)] animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

function SourcePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--color-success-300)]/25 text-[var(--color-success-500)] border border-[var(--color-success-300)]/50 shadow-sm">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {label}
    </span>
  );
}

export function LiveDemoWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const findAnswer = (query: string): { answer: string; sources: string[] } | null => {
    const lower = query.toLowerCase();
    for (const [key, value] of Object.entries(SCRIPTED_QA)) {
      if (lower.includes(key) || key.split(' ').some(w => lower.includes(w) && w.length > 3)) {
        return value;
      }
    }
    return null;
  };

  const getTypingDelay = (answer: string): number => {
    const len = answer.length;
    if (len < 60) return 1000 + Math.random() * 400;
    if (len < 120) return 1400 + Math.random() * 500;
    return 1800 + Math.random() * 600;
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setShowSuggestions(false);
    setIsTyping(true);

    const matched = findAnswer(text);
    const response = matched || FALLBACK_RESPONSE;
    const delay = getTypingDelay(response.answer);

    setTimeout(() => {
      setIsTyping(false);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: response.answer,
        sources: response.sources,
        isFallback: !matched
      };
      setMessages(prev => [...prev, assistantMsg]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }, delay);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-neutral-200)] bg-white">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent-600)] flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5z"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-neutral-900)]">BurFlow</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success-500)]" />
              <span className="text-[10px] text-[var(--color-neutral-400)]">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[300px] overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          <AnimatePresence mode="wait">
            {messages.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-200)]/30 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--color-neutral-500)] mb-1">Ask a real sales question to see BurFlow in action</p>
                <p className="text-xs text-[var(--color-neutral-400)]">Try a suggested product, pricing, or demo question below.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div className={cn(
                'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[var(--color-accent-600)] text-white rounded-br-md'
                  : msg.isFallback
                    ? 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)] border border-[var(--color-neutral-200)] rounded-bl-md'
                    : 'bg-white text-[var(--color-neutral-900)] border border-[var(--color-neutral-200)] shadow-sm rounded-bl-md'
              )}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-[var(--color-neutral-200)]">
                    {msg.sources.map(s => <SourcePill key={s} label={s} />)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl rounded-bl-md border border-[var(--color-neutral-200)] shadow-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pb-1.5 flex flex-wrap gap-1.5 overflow-hidden"
            >
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:border-[var(--color-accent-600)] hover:text-[var(--color-accent-600)] hover:bg-[var(--color-accent-200)]/10 transition-all duration-200"
                >
                  {q}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {messages.length > 0 && (
          <div className="px-4 pb-1.5">
            <button
              type="button"
              onClick={() => sendMessage('What is quantum computing?')}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-dashed border-[var(--color-neutral-300)] text-[var(--color-neutral-400)] hover:border-[var(--color-accent-400)] hover:text-[var(--color-accent-600)] hover:bg-[var(--color-accent-200)]/10 transition-all duration-200"
            >
              Ask about something off-topic
            </button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-2.5 border-t border-[var(--color-neutral-200)] bg-white">
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(inputValue); }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Type a question..."
              className="flex-1 h-10 px-3.5 text-sm rounded-lg border border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition-all duration-200"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="h-10 px-5 text-sm font-semibold rounded-lg bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)] active:bg-[var(--color-accent-800)] active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 shadow-sm hover:shadow-lg"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
