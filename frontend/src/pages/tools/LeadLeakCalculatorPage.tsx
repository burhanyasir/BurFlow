import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, TrendingUp, Wallet } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import { formatNumber } from '../../utils/formatters';

const tool = getToolBySlug('lead-leak-calculator')!;

const BENCHMARK_CONVERSION = 0.02; // B2B SaaS median visitor → qualified lead rate
const LIFT_LOW = 0.15;
const LIFT_HIGH = 0.34;

const usd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(value));

interface SliderFieldProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

function SliderField({ label, hint, value, min, max, step, display, onChange }: SliderFieldProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-sm font-semibold text-[var(--color-neutral-900)]">{label}</label>
        <span className="rounded-lg bg-[var(--color-accent-600)]/10 px-2.5 py-1 text-sm font-bold tabular-nums text-[var(--color-accent-700)]">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-3 w-full cursor-pointer"
        style={{ accentColor: 'var(--color-accent-600)' }}
      />
      <p className="mt-1.5 text-xs text-[var(--color-neutral-400)]">{hint}</p>
    </div>
  );
}

export default function LeadLeakCalculatorPage() {
  const [visitors, setVisitors] = useNumberState(10000);
  const [acv, setAcv] = useNumberState(12000);
  const [qualifiedLeads, setQualifiedLeads] = useNumberState(50);

  const results = useMemo(() => {
    const benchmarkLeads = Math.round(visitors * BENCHMARK_CONVERSION);
    const leak = Math.max(0, benchmarkLeads - qualifiedLeads);
    const captureRate = benchmarkLeads === 0 ? 0 : Math.min(100, (qualifiedLeads / benchmarkLeads) * 100);
    const lostPerMonth = (leak * acv) / 12;
    const lostPerYear = leak * acv;
    const recoveredLow = lostPerMonth * LIFT_LOW;
    const recoveredHigh = lostPerMonth * LIFT_HIGH;
    return { benchmarkLeads, leak, captureRate, lostPerMonth, lostPerYear, recoveredLow, recoveredHigh };
  }, [visitors, acv, qualifiedLeads]);

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="See how much qualified pipeline your website leaks every month — and what BurFlow could recover with real-time AI lead capture."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-8">
          <SliderField
            label="Monthly Website Visitors"
            hint="Total unique visitors to your site each month."
            value={visitors}
            min={0}
            max={200000}
            step={500}
            display={formatNumber(visitors)}
            onChange={setVisitors}
          />
          <SliderField
            label="Average Contract Value (ACV)"
            hint="Average annual revenue per closed customer, in USD."
            value={acv}
            min={0}
            max={50000}
            step={500}
            display={usd(acv)}
            onChange={setAcv}
          />
          <SliderField
            label="Current Monthly Qualified Leads"
            hint="Qualified demos / leads your team captures today."
            value={qualifiedLeads}
            min={0}
            max={2000}
            step={5}
            display={formatNumber(qualifiedLeads)}
            onChange={setQualifiedLeads}
          />

          <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-4 text-xs leading-relaxed text-[var(--color-neutral-500)]">
            <p>
              Based on a <strong className="text-[var(--color-neutral-700)]">2% visitor → qualified lead benchmark</strong> for
              B2B SaaS. Your baseline: <strong className="text-[var(--color-neutral-700)]">{formatNumber(results.benchmarkLeads)} qualified leads / mo</strong> —
              you&apos;re capturing{' '}
              <strong className={results.captureRate >= 100 ? 'text-[var(--color-success-600)]' : 'text-[var(--color-warning-600)]'}>
                {results.captureRate.toFixed(0)}%
              </strong>{' '}
              of it. Recovered revenue assumes a <strong className="text-[var(--color-neutral-700)]">15–34% lift</strong> from AI
              lead capture benchmarks.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
              tone="error"
              label="Leaking per month"
              value={usd(results.lostPerMonth)}
              sub={`${formatNumber(results.leak)} qualified leads / mo`}
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
              tone="error"
              label="Leaking per year"
              value={usd(results.lostPerYear)}
              sub={`${formatNumber(results.leak * 12)} qualified leads / yr`}
            />
          </div>

          <StatCard
            icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
            tone="accent"
            label="Recovered revenue with BurFlow (monthly)"
            value={`${usd(results.recoveredLow)} – ${usd(results.recoveredHigh)}`}
            sub="15–34% pipeline lift benchmarks · deployed in 5 minutes"
          />

          <StatCard
            icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
            tone="success"
            label="Recovered revenue with BurFlow (yearly)"
            value={`${usd(results.recoveredLow * 12)} – ${usd(results.recoveredHigh * 12)}`}
            sub="Annual impact at current traffic and ACV"
          />

          <div className="rounded-2xl border border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/10 p-5">
            <p className="text-sm font-semibold text-[var(--color-neutral-900)]">Stop leaking qualified SaaS pipeline</p>
            <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
              Deploy BurFlow in 5 minutes — no code, no credit card.
            </p>
            <Link
              to="/signup"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              Deploy BurFlow in 5 minutes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </GenericToolWrapper>
  );
}

function useNumberState(initial: number) {
  const [value, setValue] = useState(initial);
  return [value, setValue] as const;
}

interface StatCardProps {
  icon: ReactNode;
  tone: 'error' | 'accent' | 'success';
  label: string;
  value: string;
  sub: string;
}

const toneStyles: Record<StatCardProps['tone'], string> = {
  error: 'bg-[var(--color-error-500)]/10 text-[var(--color-error-600)] border-[var(--color-error-500)]/20',
  accent: 'bg-[var(--color-accent-600)]/10 text-[var(--color-accent-700)] border-[var(--color-accent-600)]/20',
  success: 'bg-[var(--color-success-500)]/10 text-[var(--color-success-600)] border-[var(--color-success-500)]/20',
};

function StatCard({ icon, tone, label, value, sub }: StatCardProps) {
  return (
    <div className={`rounded-2xl border p-5 ${toneStyles[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-90">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-[var(--color-neutral-900)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--color-neutral-500)]">{sub}</div>
    </div>
  );
}