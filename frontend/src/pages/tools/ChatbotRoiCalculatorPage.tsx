import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, PiggyBank, Repeat, Wallet } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import LeadCaptureModal from '../../components/LeadCaptureModal';
import { track } from '../../lib/analytics';
import { formatNumber } from '../../utils/formatters';

const tool = getToolBySlug('chatbot-roi-calculator')!;

const trackCalculation = (field: string, value: number) => {
  track('tool_calculated', { tool_id: tool.slug, category: tool.category, field, value });
};

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
        onChange={(e) => {
          onChange(Number(e.target.value));
          trackCalculation(label, Number(e.target.value));
        }}
        aria-label={label}
        className="mt-3 w-full cursor-pointer"
        style={{ accentColor: 'var(--color-accent-600)' }}
      />
      <p className="mt-1.5 text-xs text-[var(--color-neutral-400)]">{hint}</p>
    </div>
  );
}

export default function ChatbotRoiCalculatorPage() {
  const [tickets, setTickets] = useState(1000);
  const [minutesPerTicket, setMinutesPerTicket] = useState(15);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [deflectionRate, setDeflectionRate] = useState(40);
  const [chatbotCost, setChatbotCost] = useState(99);
  const [showLeadModal, setShowLeadModal] = useState(false);

  const results = useMemo(() => {
    const hoursPerMonth = (tickets * minutesPerTicket) / 60;
    const supportCostPerMonth = hoursPerMonth * hourlyRate;
    const deflectedTickets = Math.round(tickets * (deflectionRate / 100));
    const savedHoursPerMonth = (deflectedTickets * minutesPerTicket) / 60;
    const savingsBeforeCost = savedHoursPerMonth * hourlyRate;
    const netMonthly = Math.max(0, savingsBeforeCost - chatbotCost);
    const netAnnual = netMonthly * 12;
    const roiPct = chatbotCost > 0 ? (netMonthly / chatbotCost) * 100 : 0;
    const paybackMonths = netMonthly > 0 ? chatbotCost / netMonthly : 0;
    return { hoursPerMonth, supportCostPerMonth, deflectedTickets, savedHoursPerMonth, savingsBeforeCost, netMonthly, netAnnual, roiPct, paybackMonths };
  }, [tickets, minutesPerTicket, hourlyRate, deflectionRate, chatbotCost]);

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Estimate your company’s potential savings from AI-powered chat — cost reductions across customer service and sales, in minutes."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-8">
          <SliderField
            label="Monthly Support Tickets"
            hint="Total inbound support conversations per month."
            value={tickets}
            min={0}
            max={20000}
            step={100}
            display={formatNumber(tickets)}
            onChange={setTickets}
          />
          <SliderField
            label="Avg. Minutes per Ticket"
            hint="Average agent time spent resolving one ticket."
            value={minutesPerTicket}
            min={1}
            max={120}
            step={1}
            display={`${minutesPerTicket} min`}
            onChange={setMinutesPerTicket}
          />
          <SliderField
            label="Agent Hourly Cost (fully loaded)"
            hint="Salary, benefits, and overhead per support hour."
            value={hourlyRate}
            min={5}
            max={150}
            step={1}
            display={usd(hourlyRate)}
            onChange={setHourlyRate}
          />
          <SliderField
            label="% Tickets Deflectable by AI"
            hint="Share of tickets an AI chatbot can resolve end-to-end."
            value={deflectionRate}
            min={0}
            max={80}
            step={5}
            display={`${deflectionRate}%`}
            onChange={setDeflectionRate}
          />
          <SliderField
            label="Monthly Chatbot Cost"
            hint="Subscription cost of your AI chat solution."
            value={chatbotCost}
            min={0}
            max={2000}
            step={10}
            display={usd(chatbotCost)}
            onChange={setChatbotCost}
          />
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              icon={<Repeat className="h-5 w-5" aria-hidden="true" />}
              tone="neutral"
              label="Current support cost"
              value={`${usd(results.supportCostPerMonth)} / mo`}
              sub={`${results.hoursPerMonth.toFixed(0)} agent hours / mo`}
            />
            <StatCard
              icon={<PiggyBank className="h-5 w-5" aria-hidden="true" />}
              tone="accent"
              label="Deflected tickets"
              value={formatNumber(results.deflectedTickets)}
              sub={`${results.savedHoursPerMonth.toFixed(0)} agent hours saved / mo`}
            />
          </div>

          <StatCard
            icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
            tone="success"
            label="Net savings with AI chat"
            value={`${usd(results.netMonthly)} / mo`}
            sub={`${usd(results.netAnnual)} / year after chatbot cost`}
          />

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<PiggyBank className="h-5 w-5" aria-hidden="true" />}
              tone="accent"
              label="ROI on chatbot cost"
              value={`${results.roiPct.toFixed(0)}%`}
              sub="per month"
            />
            <StatCard
              icon={<Repeat className="h-5 w-5" aria-hidden="true" />}
              tone="accent"
              label="Payback period"
              value={results.paybackMonths === 0 ? '—' : `${results.paybackMonths.toFixed(1)} mo`}
              sub="at current deflection"
            />
          </div>

          <div className="rounded-2xl border border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/10 p-5">
            <p className="text-sm font-semibold text-[var(--color-neutral-900)]">See these savings in production</p>
            <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
              BurFlow resolves support questions and captures sales pipeline automatically. Set up in 5 minutes.
            </p>
            <Link
              to="/signup"
              onClick={() => track('tool_cta_click', { tool_id: tool.slug, location: 'results_card' })}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              Start Free with BurFlow
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              track('tool_cta_click', { tool_id: tool.slug, location: 'lead_capture_button' });
              setShowLeadModal(true);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-6 py-3 text-sm font-semibold text-[var(--color-neutral-700)] shadow-sm transition-all hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email me this calculation
          </button>
        </div>
      </div>
      <LeadCaptureModal
        open={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        toolSlug={tool.slug}
        toolName={tool.name}
        resultType="calculation"
        resultSummary={`Net savings: ${usd(results.netMonthly)}/mo (${usd(results.netAnnual)}/yr) after ${usd(chatbotCost)}/mo chatbot cost. ${results.roiPct.toFixed(0)}% monthly ROI, ${results.paybackMonths === 0 ? 'immediate' : `${results.paybackMonths.toFixed(1)}-month`} payback at ${deflectionRate}% deflection.`}
      />
    </GenericToolWrapper>
  );
}

interface StatCardProps {
  icon: ReactNode;
  tone: 'neutral' | 'accent' | 'success';
  label: string;
  value: string;
  sub: string;
}

const toneStyles: Record<StatCardProps['tone'], string> = {
  neutral: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] border-[var(--color-neutral-200)]',
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