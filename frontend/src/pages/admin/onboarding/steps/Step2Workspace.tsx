import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { INDUSTRIES } from '../onboarding-context';

interface Props {
  data: { name: string; website: string; industry: string; tenantId: string | null; slug: string | null };
  onChange: (field: string, value: string) => void;
  onCreateWorkspace: () => Promise<{ tenantId: string; slug: string }>;
}

export function Step2Workspace({ data, onChange, onCreateWorkspace }: Props) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!data.name.trim() || !data.website.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await onCreateWorkspace();
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-4">
      <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Tell BurFlow about your business</h2>
      <p className="text-sm text-[var(--color-neutral-500)] mb-8">These details give the agent its first working profile so it can understand your offer and guide visitors more effectively.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Company Name *</label>
          <Input
            placeholder="Acme Inc."
            value={data.name}
            onChange={e => onChange('name', e.target.value)}
          />
          <p className="text-xs text-[var(--color-neutral-400)] mt-1">Your visitors will see this name on the BurFlow widget.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Website URL *</label>
          <Input
            placeholder="https://example.com"
            value={data.website}
            onChange={e => onChange('website', e.target.value)}
          />
          <p className="text-xs text-[var(--color-neutral-400)] mt-1">This website is the source of product, pricing, and qualification information for your chatbot.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Industry</label>
          <Select
            options={INDUSTRIES.map(i => ({ value: i, label: i }))}
            placeholder="Select your industry"
            value={data.industry}
            onChange={e => onChange('industry', e.target.value)}
          />
          <p className="text-xs text-[var(--color-neutral-400)] mt-1">We'll use this to suggest relevant conversation templates.</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[var(--color-error-50)] border border-[var(--color-error-100)] text-sm text-[var(--color-error-700)]">
            {error}
          </div>
        )}

        {data.tenantId && (
          <div className="p-4 rounded-xl bg-[var(--color-success-50)] border border-[var(--color-success-100)]">
            <p className="text-sm font-medium text-[var(--color-success-700)]">✓ Workspace created</p>
            <p className="text-xs text-[var(--color-success-600)] mt-1">Your workspace is ready. Continue to add knowledge sources.</p>
          </div>
        )}

        <div className="bg-[var(--color-neutral-50)] rounded-xl p-4 border border-[var(--color-neutral-100)]">
          <h4 className="text-sm font-semibold text-[var(--color-neutral-700)] mb-2">Why this matters</h4>
          <ul className="space-y-2 text-xs text-[var(--color-neutral-500)]">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--color-accent-500)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              This creates your workspace and gives the agent a clear identity.
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--color-accent-500)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              The website URL becomes the primary source for products, pricing, and buyer intent.
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--color-accent-500)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              You can update or expand this later as your offer evolves.
            </li>
          </ul>
        </div>
      </div>

      {!data.tenantId && (
        <div className="mt-6">
          <button
            onClick={handleCreate}
            disabled={creating || !data.name.trim() || !data.website.trim()}
            className="w-full py-3 rounded-xl bg-[var(--color-accent-600)] text-white font-semibold hover:bg-[var(--color-accent-700)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {creating ? 'Creating Workspace…' : 'Create Workspace'}
          </button>
        </div>
      )}
    </motion.div>
  );
}
