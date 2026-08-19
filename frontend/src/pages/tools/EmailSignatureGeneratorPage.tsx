import { useState } from 'react';
import { Copy, Mail } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import LeadCaptureModal from '../../components/LeadCaptureModal';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { buildSignatureHtml, buildSignaturePlain, type SignatureOptions } from '../../lib/tools/names';

const tool = getToolBySlug('email-signature-generator')!;

const COLORS = ['#3B82F6', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#334155'];

export default function EmailSignatureGeneratorPage() {
  const { addToast } = useToast();
  const [form, setForm] = useState<SignatureOptions>({
    name: '',
    role: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    linkedin: '',
    accentColor: COLORS[0],
  });
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [tab, setTab] = useState<'html' | 'plain'>('html');

  const set = (key: keyof SignatureOptions, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const html = buildSignatureHtml(form);
  const plain = buildSignaturePlain(form);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tab === 'html' ? html : plain);
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: `signature_${tab}` });
      addToast(`${tab === 'html' ? 'HTML' : 'Plain text'} signature copied`, 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  const input = (key: keyof SignatureOptions, label: string, placeholder: string, type = 'text') => (
    <div>
      <label htmlFor={`sig-${key}`} className="text-sm font-semibold text-[var(--color-neutral-900)]">{label}</label>
      <input
        id={`sig-${key}`}
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
      />
    </div>
  );

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Create a professional HTML email signature in seconds — pick your colors, preview live, and copy."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {input('name', 'Full name', 'Jane Cooper', 'text')}
            {input('role', 'Job title', 'Head of Growth', 'text')}
            {input('company', 'Company', 'Acme Inc.', 'text')}
            {input('phone', 'Phone', '+1 555 000 1234', 'tel')}
            {input('email', 'Email', 'jane@acme.com', 'email')}
            {input('website', 'Website', 'https://acme.com', 'url')}
          </div>
          {input('linkedin', 'LinkedIn URL', 'https://linkedin.com/in/janecooper', 'url')}

          <div>
            <span className="text-sm font-semibold text-[var(--color-neutral-900)]">Accent color</span>
            <div className="mt-2 flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('accentColor', c)}
                  aria-label={`Accent color ${c}`}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${form.accentColor === c ? 'scale-110 border-[var(--color-neutral-900)]' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                aria-label="Custom accent color"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--color-neutral-400)]">
            The signature is generated locally in your browser. For a branded team-wide signature,{' '}
            <a href="/signup" className="font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]">try BurFlow Free</a>.
          </p>
        </div>

        {/* Output */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-xl border border-[var(--color-neutral-200)] p-1" role="tablist" aria-label="Signature format">
              {(['html', 'plain'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t ? 'bg-[var(--color-accent-600)] text-white' : 'text-[var(--color-neutral-600)] hover:text-[var(--color-accent-700)]'}`}
                >
                  {t === 'html' ? 'HTML preview' : 'Plain text'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  track('tool_cta_click', { tool_id: tool.slug, location: 'lead_capture_button' });
                  setShowLeadModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Email me this signature
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy
              </button>
            </div>
          </div>

          <div className="mt-3 min-h-[18rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
            {tab === 'html' ? (
              <div
                className="overflow-x-auto rounded-xl border border-[var(--color-neutral-200)] bg-white p-5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-neutral-700)]">{plain}</pre>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
            Paste into Gmail: Settings → Signature; Outlook: Settings → Signature. For HTML, paste with formatting
            (Cmd/Ctrl+Shift+V preserves it in some clients).
          </p>
        </div>
      </div>
      <LeadCaptureModal
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        toolSlug={tool.slug}
        toolName={tool.name}
        resultType="signature"
        resultSummary={plain}
      />
    </GenericToolWrapper>
  );
}