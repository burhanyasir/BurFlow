import { useState } from 'react';
import type React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';
import type { OnboardingData } from '../onboarding-context';

interface Props {
  data: OnboardingData;
  onComplete: () => Promise<void>;
  onSeedDemo: () => Promise<void>;
  onReset: () => void;
}

function ChecklistItem({ done, label, desc }: { done: boolean; label: string; desc: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${done ? 'bg-[var(--color-success-50)]' : 'bg-[var(--color-neutral-50)]'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${done ? 'bg-[var(--color-success-100)]' : 'bg-[var(--color-neutral-200)]'}`}>
        {done ? (
          <svg className="w-3.5 h-3.5 text-[var(--color-success-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        ) : (
          <div className="w-2 h-2 rounded-full bg-[var(--color-neutral-300)]" />
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${done ? 'text-[var(--color-success-700)]' : 'text-[var(--color-neutral-400)]'}`}>{label}</p>
        <p className={`text-xs ${done ? 'text-[var(--color-success-600)]' : 'text-[var(--color-neutral-400)]'}`}>{desc}</p>
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'grid' },
  { label: 'Knowledge Base', path: '/dashboard/knowledge', icon: 'book' },
  { label: 'Analytics', path: '/dashboard/analytics', icon: 'chart' },
  { label: 'Conversations', path: '/dashboard/conversations', icon: 'message' },
  { label: 'Widget Builder', path: '/dashboard/widget', icon: 'code' },
  { label: 'Billing', path: '/dashboard/billing', icon: 'credit-card' },
];

const ICONS: Record<string, React.ReactNode> = {
  grid: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  book: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
  chart: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  message: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>,
  code: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
  'credit-card': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
};

export function Step9Success({ data, onComplete, onSeedDemo, onReset }: Props) {
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete();
      navigate('/dashboard');
    } catch {}
    setCompleting(false);
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await onSeedDemo();
      setSeedDone(true);
    } catch {}
    setSeeding(false);
  };

  const checklist = [
    { done: !!data.workspace.tenantId, label: 'Workspace Created', desc: `${data.workspace.name} — ${data.workspace.website}` },
    { done: data.knowledge.files.length > 0 || data.knowledge.websites.length > 0 || !!data.knowledge.faqs.trim(), label: 'Knowledge Added', desc: `${data.knowledge.files.length} files, ${data.knowledge.websites.length} websites, ${data.knowledge.faqs ? 'FAQs' : 'no FAQs'}` },
    { done: data.processing.sourceIds.length > 0, label: 'Content Indexed', desc: `${data.processing.completedIds.length} of ${data.processing.sourceIds.length} sources ready` },
    { done: true, label: 'Widget Customized', desc: `${data.custom.primaryColor} · ${data.custom.position === 'right' ? 'Bottom Right' : 'Bottom Left'}` },
    { done: !!data.embed.widgetToken, label: 'Widget Code Generated', desc: 'Embed snippet ready for your website' },
    { done: data.embed.widgetVerified, label: 'Installation Verified', desc: data.embed.widgetVerified ? 'Widget confirmed active on your site' : 'Not yet verified — you can verify later' },
    { done: data.testMessages.length > 0, label: 'Chatbot Tested', desc: `${data.testMessages.filter(m => m.role === 'user').length} test messages sent` },
  ];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[var(--color-success-100)] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-[var(--color-success-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-neutral-900)] mb-2">You're All Set!</h1>
        <p className="text-base text-[var(--color-neutral-500)]">Your AI chatbot is ready to help your customers.</p>
      </div>

      <div className="bg-[var(--color-neutral-50)] rounded-xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-[var(--color-neutral-700)] mb-4">Setup Checklist</h3>
        <div className="space-y-2">
          {checklist.map(item => (
            <ChecklistItem key={item.label} done={item.done} label={item.label} desc={item.desc} />
          ))}
        </div>
      </div>

      {!seedDone && !data.demoDataLoaded && (
        <div className="bg-[var(--color-accent-50)] border border-[var(--color-accent-100)] rounded-xl p-4 mb-8">
          <p className="text-sm font-medium text-[var(--color-accent-800)] mb-2">Load demo data</p>
          <p className="text-xs text-[var(--color-accent-600)] mb-3">Add sample conversations and documents so you can explore the dashboard with pre-populated data.</p>
          <Button size="sm" variant="secondary" onClick={handleSeedDemo} disabled={seeding}>
            {seeding ? 'Loading…' : 'Load Demo Data'}
          </Button>
        </div>
      )}

      <div className="mb-8">
        <p className="text-sm font-semibold text-[var(--color-neutral-700)] mb-3">Quick Links</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map(l => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-neutral-200)] hover:border-[var(--color-accent-300)] hover:bg-[var(--color-accent-50)] transition-colors text-left"
            >
              <span className="text-[var(--color-accent-600)]">{ICONS[l.icon]}</span>
              <span className="text-sm font-medium text-[var(--color-neutral-700)]">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button onClick={handleComplete} disabled={completing} size="lg">
          {completing ? 'Saving…' : 'Complete Setup'}
        </Button>
        <div className="border-t border-[var(--color-neutral-200)] pt-4 w-full text-center">
          <p className="text-xs text-[var(--color-neutral-400)] mb-3">Need to start fresh?</p>
          <Button variant="secondary" size="sm" onClick={onReset}>Reset Onboarding</Button>
        </div>
      </div>
    </motion.div>
  );
}
