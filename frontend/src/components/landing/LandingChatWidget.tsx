import { useState, useRef, useEffect, useCallback } from 'react';
import { X, MessagesSquare, Send, Sparkles, FileText, ChevronUp, ShieldCheck, Lock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function generateSessionId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2, 15);
}

function getApiKey(): string | null {
  return import.meta.env.VITE_DEMO_API_KEY || null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  isGreeting?: boolean;
  strategy?: string;
  trustScore?: number;
  buyingIntentScore?: number;
  stage?: string;
}

interface QuickReply {
  id: string;
  label: string;
  payload: string;
}

const GREETING_QUICK_REPLIES: QuickReply[] = [
  { id: 'qr_what', label: 'What is BurFlow?', payload: 'What is BurFlow?' },
  { id: 'qr_widget', label: 'How does the widget work?', payload: 'How does the widget work?' },
  { id: 'qr_pricing', label: 'What are your pricing plans?', payload: 'What are your pricing plans?' },
  { id: 'qr_trial', label: 'Can I try it for free?', payload: 'Can I try it for free?' },
];

export function LandingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [hasOpened, setHasOpened] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const apiKey = getApiKey();
      if (apiKey) headers['x-api-key'] = apiKey;

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text.trim(), sessionId }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        data = { response: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment." };
      }

      setIsTyping(false);

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.response || data.generatedResponse || data.error || "I couldn't process that request.",
        sources: data.sources || [],
        strategy: data.strategy,
        trustScore: data.trustScore,
        buyingIntentScore: data.buyingIntentScore,
        stage: data.stage,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[LandingChatWidget] Fetch exception:', err);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: "I'm sorry, I'm having trouble connecting. Please check your connection and try again.",
      }]);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!hasOpened) {
      setHasOpened(true);
      const greeting: Message = {
        id: `g-${Date.now()}`,
        role: 'assistant',
        text: "Hi! I'm BurFlow, your AI website sales agent. I can help visitors discover the right product, plan, or next step. What would you like to know?",
        isGreeting: true,
      };
      setMessages([greeting]);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  function getStageLabel(stage?: string): string {
    const labels: Record<string, string> = {
      greeting: 'Greeting',
      rapport: 'Building Rapport',
      discovery: 'Discovery',
      education: 'Education',
      evaluation: 'Evaluation',
      qualification: 'Qualification',
      buying_discussion: 'Buying Discussion',
      objection_handling: 'Objection Handling',
      closing: 'Closing',
      booking: 'Booking',
      human_handoff: 'Human Handoff',
      finished: 'Finished',
    };
    return stage ? labels[stage] || stage : '';
  }

  function getTrustLabel(score?: number): string {
    if (score === undefined) return '';
    if (score >= 80) return 'High Trust';
    if (score >= 50) return 'Moderate Trust';
    if (score >= 20) return 'Low Trust';
    return 'Building Trust';
  }

  function getBuyingLabel(score?: number): string {
    if (score === undefined) return '';
    if (score >= 80) return 'Strong Intent';
    if (score >= 50) return 'Moderate Intent';
    if (score >= 20) return 'Early Interest';
    return 'Exploring';
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      {/* Chat panel */}
      <div
        className={`mb-3 flex origin-bottom-right flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'
        }`}
        style={{
          width: 'clamp(320px, calc(100vw - 2rem), 380px)',
          height: isOpen ? 'clamp(480px, 70vh, 560px)' : '0px',
          borderRadius: '20px',
        }}
      >
        <div className="glass-strong flex h-full flex-col overflow-hidden" style={{ boxShadow: 'var(--shadow-glass), var(--shadow-wine)' }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl wine-gradient" style={{ boxShadow: 'var(--shadow-wine)' }}>
                <div className="absolute inset-0.5 rounded-[11px] border border-white/15" />
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium">BurFlow</div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                  AI assistant &middot; Grounded mode
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg wine-gradient">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[82%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-white/[0.06] text-foreground/90 hairline'
                      : msg.isGreeting
                        ? 'rounded-tl-sm glass text-foreground/90'
                        : 'rounded-tl-sm glass text-foreground/90'
                  }`}>
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map(s => (
                        <span key={s} className="glass inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] text-muted-foreground">
                          <FileText className="h-3 w-3 text-gold" /> {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="mr-2.5 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg wine-gradient">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="glass inline-flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '120ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            )}

            {/* Suggested replies on greeting */}
            {messages.length === 1 && messages[0]?.isGreeting && !isTyping && (
              <div className="flex flex-wrap gap-2 pt-1">
                {GREETING_QUICK_REPLIES.map(qr => (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => sendMessage(qr.payload)}
                    className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all duration-200 border border-hairline"
                  >
                    <Sparkles className="h-3 w-3 text-gold" /> {qr.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Pipeline info (collapsible) */}
          {messages.length > 1 && (
            <div className="border-t border-hairline px-4 py-1.5">
              <button
                onClick={() => setShowPipeline(p => !p)}
                className="flex w-full items-center justify-between text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <span>BurFlow</span>
                <ChevronUp className={`h-3 w-3 transition-transform ${showPipeline ? '' : 'rotate-180'}`} />
              </button>
              {showPipeline && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10px] text-muted-foreground/70">
                  {messages[messages.length - 1]?.strategy && (
                    <span>Strategy: <span className="text-foreground/80 font-medium">{messages[messages.length - 1].strategy}</span></span>
                  )}
                  {messages[messages.length - 1]?.stage && (
                    <span>Stage: <span className="text-foreground/80 font-medium">{getStageLabel(messages[messages.length - 1].stage)}</span></span>
                  )}
                  {messages[messages.length - 1]?.trustScore !== undefined && (
                    <span>Trust: <span className="text-foreground/80 font-medium">{getTrustLabel(messages[messages.length - 1].trustScore)} ({messages[messages.length - 1].trustScore})</span></span>
                  )}
                  {messages[messages.length - 1]?.buyingIntentScore !== undefined && (
                    <span>Intent: <span className="text-foreground/80 font-medium">{getBuyingLabel(messages[messages.length - 1].buyingIntentScore)} ({messages[messages.length - 1].buyingIntentScore})</span></span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Security footer */}
          <div className="flex items-center justify-between border-t border-hairline px-4 py-2 text-[10px] text-muted-foreground/70">
            <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Encrypted</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-400" /> Source-grounded</span>
          </div>

          {/* Input */}
          <div className="border-t border-hairline p-3 shrink-0">
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(inputValue); }}
              className="flex items-center gap-2 rounded-full border border-hairline bg-white/[0.03] px-3 py-2 focus-within:ring-1 focus-within:ring-ring"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40 disabled:hover:scale-100 hover:scale-105 wine-gradient"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
            <div className="mt-1.5 text-center text-[9px] text-muted-foreground/50">Powered by BurFlow</div>
          </div>
        </div>
      </div>

      {/* Floating button */}
      <button
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className="group relative flex h-12 w-12 items-center justify-center rounded-full transition duration-300 hover:scale-105 active:scale-95 wine-gradient"
        style={{ boxShadow: 'var(--shadow-wine)' }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <div className="absolute inset-0 rounded-full border border-white/15" />
        <div className="relative">
          {isOpen ? <X className="h-5 w-5 text-white" /> : <MessagesSquare className="h-5 w-5 text-white" />}
        </div>
        {!isOpen && !hasOpened && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-semibold text-obsidian">1</span>
        )}
      </button>
    </div>
  );
}
