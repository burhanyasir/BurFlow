import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../../components/dashboard';
import type { NavItem } from '../../../components/dashboard';
import { useAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../utils/cn';
import { PageHead, DashButton, Panel, EmptyState } from '../../../components/dash/ui';
import { Palette, Code, Copy, Check, Send, Trash2 } from 'lucide-react';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Conversations', href: '/dashboard/conversations' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Knowledge', href: '/dashboard/knowledge' },
  { label: 'Widget', href: '/dashboard/widget', active: true },
  { label: 'Billing', href: '/dashboard/billing' },
  { label: 'Onboarding', href: '/dashboard/onboarding' },
];

const COLOR_PRESETS = ['#0F6E56', '#12866A', '#5DCAA5', '#0B4F3F', '#1F7A8C', '#B4762C', '#8A3D62', '#2E3A46'];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = (hex || '').replace('#', '').trim();
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return { r: 128, g: 128, b: 128 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}
const TABS = [{ id: 'vanilla', label: 'HTML' }, { id: 'react', label: 'React' }, { id: 'wordpress', label: 'WordPress' }, { id: 'shopify', label: 'Shopify' }, { id: 'webflow', label: 'Webflow' }] as const;
const WIDGET_CDN = import.meta.env.VITE_WIDGET_CDN_URL || (typeof window !== 'undefined' ? `${window.location.origin}/widget/widget.js` : '/widget/widget.js');
// The widget loader reaches the API (config, chat, token bootstrap) at this
// origin. The SPA is served from the same origin as the API, so fall back to it.
const WIDGET_API_URL = import.meta.env.VITE_WIDGET_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
const DEFAULT_SNIPPET = `<!-- BurFlow Chatbot -->\n<script src="${WIDGET_CDN}" data-tenant-id="YOUR_TENANT_ID" data-api-url="${WIDGET_API_URL}"></script>`;

function buildSnippet(tabId: string, tenantId: string, _color: string, position: string): string {
  const attrs = `data-tenant-id="${tenantId}" data-api-url="${WIDGET_API_URL}" data-position="${position}"`;
  switch (tabId) {
    case 'vanilla': return `<!-- BurFlow Chatbot -->\n<script src="${WIDGET_CDN}" ${attrs}></script>`;
    case 'react': return `import { ChatWidget } from '@conversationengine/react';\n<ChatWidget tenantId="${tenantId}" apiUrl="${WIDGET_API_URL}" position="${position}" />`;
    default: return `<!-- BurFlow Chatbot -->\n<script src="${WIDGET_CDN}" ${attrs}></script>`;
  }
}

export default function WidgetDashboard() {
  const navigate = useNavigate(); const { user, tenant, logout } = useAuth(); const { addToast } = useToast();
  const workspaceName = tenant?.name || 'Conversation Engine';
  const [primaryColor, setPrimaryColor] = useState('#006248');
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! What brings you here today?');
  const [placeholder, setPlaceholder] = useState('Type your message here\u2026');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoOpenDelay, setAutoOpenDelay] = useState(3);
  const [activeTab, setActiveTab] = useState('vanilla');
  const [agentId, setAgentId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<Record<string, unknown> | null>(null);
  const snippet = agentId ? buildSnippet(activeTab, agentId, primaryColor, position) : DEFAULT_SNIPPET;

  const loadConfig = useCallback(async () => {
    try {
      const tenantRes = await apiClient.get<{ tenants: Array<{ id: string; slug: string }> }>('/tenants');
      const ts = tenantRes.tenants || [];
      if (ts.length > 0) {
        setTenantId(ts[0].id);
        const slug = ts[0].slug;
        setAgentId(slug);
        const tokenRes = await apiClient.post<{ token: string }>('/widget/token');
        if (tokenRes.token) {
          const widgetRes = await apiClient.get<{ theme?: any; position?: string; primaryColor?: string; greeting?: string; launcherText?: string; starterOptions?: string[]; autoOpen?: boolean; autoOpenDelay?: number; businessProfile?: Record<string, unknown> }>(`/widget/config?token=${tokenRes.token}`);
          if (widgetRes.primaryColor) setPrimaryColor(widgetRes.primaryColor);
          if (widgetRes.position) {
            const normalized = widgetRes.position === 'bottom-right' ? 'right' : widgetRes.position === 'bottom-left' ? 'left' : widgetRes.position;
            setPosition(normalized as 'right' | 'left');
          }
          if (widgetRes.greeting) setWelcomeMessage(widgetRes.greeting);
          if (widgetRes.launcherText) setPlaceholder(widgetRes.launcherText);
          if (Array.isArray(widgetRes.starterOptions)) setSuggestedQuestions(widgetRes.starterOptions);
          if (typeof widgetRes.autoOpen === 'boolean') setAutoOpen(widgetRes.autoOpen);
          if (typeof widgetRes.autoOpenDelay === 'number') setAutoOpenDelay(widgetRes.autoOpenDelay);
          if (widgetRes.businessProfile) setBusinessProfile(widgetRes.businessProfile);
        }
      }
    } catch { addToast('Failed to load widget config', 'error'); } finally { setConfigLoaded(true); }
  }, [addToast]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    setSaving(true); try {
      await apiClient.put('/widget/config', {
        tenantId: tenantId || undefined,
        primaryColor,
        position,
        greeting: welcomeMessage,
        launcherText: placeholder,
        starterOptions: suggestedQuestions,
        autoOpen,
        autoOpenDelay,
        companyName: workspaceName,
        businessProfile: businessProfile || undefined,
      });
      addToast('Widget settings saved', 'success');
    } catch { addToast('Failed to save widget settings', 'error'); } finally { setSaving(false); }
  };

  const addQuestion = () => { const q = questionInput.trim(); if (q && !suggestedQuestions.includes(q)) { setSuggestedQuestions([...suggestedQuestions, q]); setQuestionInput(''); } };

  return (
    <DashboardLayout sidebarItems={NAV_ITEMS} onNavigate={(item) => item.href && navigate(item.href)} workspaceName={workspaceName} userName={user?.name} userEmail={user?.email} onLogout={logout} onSettings={() => navigate('/dashboard/settings')}>
      {!agentId && configLoaded ? (
        <EmptyState
          icon={<Palette className="size-6" />}
          title="No workspace configured"
          body="Create a workspace first to set up your chatbot widget."
          actions={<DashButton onClick={() => navigate('/dashboard/onboarding')}>Go to Onboarding</DashButton>}
        />
      ) : !configLoaded ? (
        <div className="space-y-6">
          <div className="h-28 animate-pulse rounded-3xl border border-hairline bg-surface" />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="h-[420px] animate-pulse rounded-3xl border border-hairline bg-surface" />
            <div className="h-[420px] animate-pulse rounded-3xl border border-hairline bg-surface" />
          </div>
          <div className="h-64 animate-pulse rounded-3xl border border-hairline bg-surface" />
          <div className="h-80 animate-pulse rounded-3xl border border-hairline bg-surface" />
        </div>
      ) : (
        <div className="space-y-6">
          <PageHead
            title="Widget settings"
            sub="Customize the look and behavior of your chat widget, then embed it on your site."
            actions={<DashButton onClick={handleSave}>{saving ? 'Saving\u2026' : 'Save changes'}</DashButton>}
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold">
              <span className="size-2 rounded-full bg-success" /> Widget active
            </span>
            <span className="text-sm text-muted-foreground">Agent: <span className="font-medium text-foreground">{agentId}</span></span>
            <span className="text-sm text-muted-foreground">Theme: <span className="font-medium" style={{ color: primaryColor }}>{primaryColor}</span></span>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel>
              <h2 className="text-lg font-bold tracking-tight">Widget appearance</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pick a brand color and position for the launcher.</p>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Primary color</label>
                  <div className="flex flex-wrap gap-2.5">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        onClick={() => setPrimaryColor(c)}
                        className={cn('size-9 rounded-full transition-all', primaryColor.toLowerCase() === c.toLowerCase() ? 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-surface' : 'ring-1 ring-hairline')}
                        style={{ backgroundColor: c }}
                        aria-label={`Set color ${c}`}
                      />
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <input
                      type="color"
                      value={rgbToHex(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b)}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="h-10 w-14 shrink-0 cursor-pointer rounded-full border border-hairline bg-transparent p-1"
                      aria-label="Pick any color"
                      title="Pick any color"
                    />
                    <input
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="h-10 flex-1 rounded-full border border-hairline bg-surface px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40"
                      aria-label="Hex color"
                    />
                  </div>
                  <div className="mt-4 rounded-2xl border border-hairline bg-surface-2/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Mix your own color</p>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 font-mono text-[11px] tabular-nums" style={{ color: primaryColor }}>{rgbToHex(hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b)}</span>
                    </div>
                    {(['R', 'G', 'B'] as const).map((channel, i) => {
                      const value = [hexToRgb(primaryColor).r, hexToRgb(primaryColor).g, hexToRgb(primaryColor).b][i];
                      const set = (v: number) => {
                        const rgb = hexToRgb(primaryColor);
                        setPrimaryColor(i === 0 ? rgbToHex(v, rgb.g, rgb.b) : i === 1 ? rgbToHex(rgb.r, v, rgb.b) : rgbToHex(rgb.r, rgb.g, v));
                      };
                      return (
                        <label key={channel} className="mt-3 flex items-center gap-3">
                          <span className="w-3 shrink-0 text-xs font-bold" style={{ color: channel === 'R' ? '#ef4444' : channel === 'G' ? '#22c55e' : '#3b82f6' }}>{channel}</span>
                          <input
                            type="range"
                            min={0}
                            max={255}
                            value={value}
                            onChange={e => set(Number(e.target.value))}
                            className="flex-1 accent-[var(--color-primary)]"
                            aria-label={`${channel} channel`}
                          />
                          <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{value}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Launcher position</label>
                  <select value={position} onChange={e => setPosition(e.target.value as 'right' | 'left')} className="h-10 w-full rounded-full border border-hairline bg-surface px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40" aria-label="Widget position">
                    <option value="right">Right</option><option value="left">Left</option>
                  </select>
                </div>
              </div>
            </Panel>

            <Panel>
              <h2 className="text-lg font-bold tracking-tight">Widget preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">A live preview of how the widget will look on your site.</p>
              <div className="relative mt-6 h-[380px] overflow-hidden rounded-2xl border border-hairline bg-surface-2/60">
                <div className={cn('absolute bottom-4 transition-all z-10', position === 'right' ? 'right-4' : 'left-4')}>
                  <div className="w-[260px] overflow-hidden rounded-2xl border border-hairline bg-surface shadow-soft">
                    <div className="flex items-center gap-3 p-3" style={{ backgroundColor: primaryColor }}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">A</div>
                      <div>
                        <p className="text-sm font-semibold text-white">Chatbot</p>
                        <p className="text-xs text-white/70">Online</p>
                      </div>
                    </div>
                    <div className="space-y-3 p-3">
                      <div className="max-w-[85%] rounded-xl rounded-tl-none p-2.5 text-xs text-white" style={{ backgroundColor: primaryColor }}>
                        {welcomeMessage}
                      </div>
                      {suggestedQuestions.slice(0, 2).map((q, i) => (
                        <div key={i} className="cursor-pointer rounded-lg border border-hairline bg-surface-2/60 px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-surface-2">{q}</div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 border-t border-hairline p-3">
                      <div className="h-8 flex-1 rounded-lg border border-hairline bg-surface-2/60" />
                      <button className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90" style={{ backgroundColor: primaryColor }} aria-label="Send"><Send className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Embed</h2>
                <p className="mt-1 text-sm text-muted-foreground">Copy the snippet for your platform to add the widget to your site.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-ember-soft px-3 py-1 text-xs font-semibold"><Code className="size-3" /> {TABS.find(t => t.id === activeTab)?.label || 'HTML'}</span>
            </div>
            <div className="mt-6 flex gap-1 overflow-x-auto pb-1">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition', activeTab === tab.id ? 'bg-ember-soft text-foreground' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground')}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs text-muted-foreground">{TABS.find(t => t.id === activeTab)?.label || 'HTML'}</span>
                <DashButton
                  variant="ghost"
                  onClick={async () => {
                    if (!snippet) return;
                    try {
                      await navigator.clipboard.writeText(snippet);
                    } catch {
                      const ta = document.createElement('textarea');
                      ta.value = snippet;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.select();
                      try { document.execCommand('copy'); } catch { /* clipboard unavailable */ }
                      document.body.removeChild(ta);
                    }
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="h-9 shrink-0 px-4 text-xs"
                >
                  {copied ? <><Check className="size-3.5" /> Copied!</> : <><Copy className="size-3.5" /> Copy</>}
                </DashButton>
              </div>
              <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-foreground/80"><code>{snippet || 'Generate widget token first'}</code></pre>
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-bold tracking-tight">Configuration</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tune the greeting, launcher text, and starter questions shown to visitors.</p>
            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Greeting message</label>
                <textarea rows={2} value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} className="w-full rounded-2xl border border-hairline bg-surface px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40" />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Launcher text</label>
                <input value={placeholder} onChange={e => setPlaceholder(e.target.value)} className="h-10 w-full rounded-full border border-hairline bg-surface px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface-2/60 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Auto-open chat</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Open the chat window automatically after visitors land on your site.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={autoOpen}
                  aria-label="Auto-open chat"
                  onClick={() => setAutoOpen(v => !v)}
                  className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', autoOpen ? 'bg-primary' : 'bg-surface-2 border border-hairline')}
                >
                  <span className={cn('absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-white shadow-soft transition-all', autoOpen ? 'left-[calc(100%-1.375rem)]' : 'left-0.5')} />
                </button>
              </div>
              {autoOpen && (
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Auto-open delay (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={autoOpenDelay}
                    onChange={e => setAutoOpenDelay(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                    className="h-10 w-full rounded-full border border-hairline bg-surface px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40"
                    aria-label="Auto-open delay seconds"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">Between 0 and 60 seconds after page load.</p>
                </div>
              )}
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">Starter questions</label>
                <div className="flex gap-2">
                  <input placeholder="Type a question" value={questionInput} onChange={e => setQuestionInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addQuestion(); }} className="h-10 flex-1 rounded-full border border-hairline bg-surface px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40" aria-label="New question" />
                  <DashButton variant="ghost" onClick={addQuestion} className="h-10 shrink-0 px-4 text-xs">Add</DashButton>
                </div>
                {suggestedQuestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {suggestedQuestions.map((q, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-2/60 p-3">
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{q}</span>
                        <button onClick={() => setSuggestedQuestions(suggestedQuestions.filter((_, idx) => idx !== i))} className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-error-500" aria-label={`Remove ${q}`}>
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
}
