import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout, DashboardContent, DashboardSection, DashboardChartCard, DashboardEmptyState, DashboardLoadingState, Badge } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../utils/cn';
import { Palette, Monitor, Code, Copy, Check, Send } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget', active: true },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

const COLOR_PRESETS = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#C94F72'];
const TABS = [{ id: 'vanilla', label: 'HTML' }, { id: 'react', label: 'React/Next.js' }, { id: 'wordpress', label: 'WordPress' }, { id: 'shopify', label: 'Shopify' }, { id: 'webflow', label: 'Webflow' }] as const;
const WIDGET_CDN = import.meta.env.VITE_WIDGET_CDN_URL || 'https://widget.conversationengine.ai/chatbot.js';

function buildSnippet(tabId: string, agentId: string, color: string, position: string, token: string): string {
  const attrs = `data-agent-id="${agentId}" data-primary-color="${color}" data-position="${position}" data-token="${token}"`;
  switch (tabId) {
    case 'vanilla': return `<!-- Conversation Engine Chatbot -->\n<script src="${WIDGET_CDN}" ${attrs}></script>`;
    case 'react': return `import { ChatWidget } from '@conversationengine/react';\n<ChatWidget agentId="${agentId}" primaryColor="${color}" position="${position}" token="${token}" />`;
    default: return `<!-- Conversation Engine Chatbot -->\n<script src="${WIDGET_CDN}" ${attrs}></script>`;
  }
}

export default function WidgetDashboard() {
  const navigate = useNavigate(); const { user, tenant, logout } = useAuth(); const { addToast } = useToast();
  const workspaceName = tenant?.name || 'Conversation Engine';
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi there! How can I help you today?');
  const [placeholder, setPlaceholder] = useState('Type your message here\u2026');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [activeTab, setActiveTab] = useState('vanilla');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [widgetToken, setWidgetToken] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const snippet = agentId && widgetToken ? buildSnippet(activeTab, agentId, primaryColor, position, widgetToken) : '';

  const loadConfig = useCallback(async () => {
    try {
      const tenantRes = await apiClient.get<{ tenants: Array<{ id: string; slug: string }> }>('/tenants');
      const ts = tenantRes.tenants || [];
      if (ts.length > 0) {
        const slug = ts[0].slug; setAgentId(slug);
        const tokenRes = await apiClient.post<{ token: string }>('/widget/token', { agentId: slug });
        if (tokenRes.token) {
          setWidgetToken(tokenRes.token);
          const widgetRes = await apiClient.get<{ theme?: any; position?: string; primaryColor?: string; welcomeMessage?: string; placeholder?: string; suggestedQuestions?: string[] }>(`/widget/config?token=${tokenRes.token}`);
          if (widgetRes.primaryColor) setPrimaryColor(widgetRes.primaryColor);
          if (widgetRes.position) setPosition(widgetRes.position as 'right' | 'left');
          if (widgetRes.welcomeMessage) setWelcomeMessage(widgetRes.welcomeMessage);
          if (widgetRes.placeholder) setPlaceholder(widgetRes.placeholder);
          if (widgetRes.suggestedQuestions) setSuggestedQuestions(widgetRes.suggestedQuestions);
        }
      }
    } catch { addToast('Failed to load widget config', 'error'); } finally { setConfigLoaded(true); }
  }, [addToast]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true); try {
      await apiClient.put('/widget/config', { agentId, primaryColor, position, welcomeMessage, placeholder, suggestedQuestions });
      addToast('Widget settings saved', 'success');
    } catch { addToast('Failed to save widget settings', 'error'); } finally { setSaving(false); }
  };

  const addQuestion = () => { const q = questionInput.trim(); if (q && !suggestedQuestions.includes(q)) { setSuggestedQuestions([...suggestedQuestions, q]); setQuestionInput(''); } };

  return (
    <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
      <DashboardContent>
        {!agentId && configLoaded ? (
          <DashboardEmptyState icon={<Palette className="h-6 w-6" />} title="No workspace configured" description="Create a workspace first to set up your chatbot widget." primaryAction={{ label: 'Go to Onboarding', onClick: () => navigate('/dashboard/onboarding') }} />
        ) : !configLoaded ? (
          <DashboardLoadingState variant="skeleton" />
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-[15px] font-medium text-foreground">Widget Manager</h1>
                <p className="text-sm text-muted-foreground">Customize, preview, and manage your chatbot widget</p>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-wine rounded-xl px-4 py-2 text-sm">{saving ? 'Saving\u2026' : 'Save Changes'}</button>
            </div>

            {/* Status bar */}
            <div className="glass rounded-2xl px-4 py-3">
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Badge variant="success" size="sm" dot>Active</Badge> Widget Status</span>
                <span className="text-hairline">|</span>
                <span>Agent: <span className="font-medium text-foreground">{agentId}</span></span>
                <span className="text-hairline">|</span>
                <span>Theme: <span className="font-medium" style={{ color: primaryColor }}>{primaryColor}</span></span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Customize */}
              <DashboardChartCard title="Customize Widget" variant="glass-strong">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Primary Color</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {COLOR_PRESETS.map(c => (
                        <button key={c} onClick={() => setPrimaryColor(c)} className={cn('h-7 w-7 rounded-full border-2 transition-all', primaryColor === c ? 'border-foreground scale-110 shadow-[0_0_12px_rgba(201,79,114,0.3)]' : 'border-transparent')} style={{ backgroundColor: c }} aria-label={`Set color ${c}`} />
                      ))}
                    </div>
                    <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-full rounded-xl border border-hairline bg-white/[0.03] px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-ring" aria-label="Hex color" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Position</label>
                    <select value={position} onChange={e => setPosition(e.target.value as 'right' | 'left')} className="h-9 w-full rounded-xl border border-hairline bg-white/[0.03] px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-ring" aria-label="Widget position">
                      <option value="right">Right</option><option value="left">Left</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Welcome Message</label>
                    <textarea rows={2} value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} className="w-full rounded-xl border border-hairline bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Input Placeholder</label>
                    <input value={placeholder} onChange={e => setPlaceholder(e.target.value)} className="h-9 w-full rounded-xl border border-hairline bg-white/[0.03] px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Suggested Questions</label>
                    <div className="flex gap-2 mb-2">
                      <input placeholder="Type a question" value={questionInput} onChange={e => setQuestionInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addQuestion(); }} className="h-9 flex-1 rounded-xl border border-hairline bg-white/[0.03] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-ring" aria-label="New question" />
                      <button onClick={addQuestion} disabled={!questionInput.trim()} className="rounded-xl border border-hairline px-3 py-1.5 text-xs text-foreground transition hover:bg-white/[0.04] disabled:opacity-40">Add</button>
                    </div>
                    {suggestedQuestions.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {suggestedQuestions.map((q, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border border-hairline bg-white/[0.02] px-3 py-1.5 text-sm">
                            <span className="text-foreground/70 truncate">{q}</span>
                            <button onClick={() => setSuggestedQuestions(suggestedQuestions.filter((_, idx) => idx !== i))} className="text-xs text-muted-foreground hover:text-destructive transition ml-2 shrink-0">Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DashboardChartCard>

              {/* Live Preview */}
              <DashboardChartCard title="Live Preview" variant="glass-strong">
                <div className="relative rounded-xl border border-hairline bg-black/40 h-[420px] overflow-hidden">
                  <div className={cn('absolute bottom-4 transition-all z-10', position === 'right' ? 'right-4' : 'left-4')}>
                    <div className="w-[260px] overflow-hidden rounded-2xl border border-hairline bg-background shadow-2xl">
                      <div className="flex items-center gap-3 p-3" style={{ backgroundColor: primaryColor }}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">A</div>
                        <div><p className="text-sm font-semibold text-white">Chatbot</p><p className="text-xs text-white/70">Online</p></div>
                      </div>
                      <div className="space-y-3 p-3 min-h-[140px]">
                        <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white/[0.06] p-2.5"><p className="text-xs text-foreground/80">{welcomeMessage}</p></div>
                        {suggestedQuestions.slice(0, 2).map((q, i) => (
                          <div key={i} className="cursor-pointer rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-white/[0.04]">{q}</div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 border-t border-hairline p-3">
                        <div className="flex-1 h-8 rounded-lg border border-hairline bg-white/[0.03]" />
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColor }} aria-label="Send"><Send className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </DashboardChartCard>
            </div>

            {/* Embed Code */}
            <DashboardChartCard title="Embed Code" variant="glass-strong">
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition', activeTab === tab.id ? 'wine-gradient text-white' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]')}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-xl border border-hairline">
                <div className="flex items-center justify-between border-b border-hairline bg-white/[0.02] px-4 py-2.5">
                  <span className="text-xs text-muted-foreground font-mono">{TABS.find(t => t.id === activeTab)?.label || 'HTML'}</span>
                  <button onClick={async () => { if (snippet) { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); } }} disabled={!snippet} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-foreground transition hover:bg-white/[0.04]">
                    {copied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </button>
                </div>
                <pre className="overflow-x-auto bg-[#0A0A0F] p-4 text-sm text-[#e4e4f0]"><code>{snippet || 'Generate widget token first'}</code></pre>
              </div>
            </DashboardChartCard>
          </div>
        )}
      </DashboardContent>
    </DashboardLayout>
  );
}
