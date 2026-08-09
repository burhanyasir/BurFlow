import { Check } from './primitives';

const stats = [
  { label: 'Pages scanned', value: '184+' },
  { label: 'Products found', value: '6' },
  { label: 'Buyer intents', value: '18' },
];

export function ScanCard() {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-lift md:p-8">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Live scan preview</p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
          <span className="size-1.5 rounded-full bg-success" />
          Ready
        </span>
      </div>

      <p className="mt-3 font-display text-lg font-semibold">https://sitegpt.ai/</p>

      <div className="mt-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Sales agent readiness</span>
          <span className="font-display font-bold">97%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-[97%] rounded-full bg-primary" />
        </div>
      </div>

      <dl className="mt-7 grid grid-cols-3 gap-4 border-y border-hairline py-5">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 text-sm font-semibold">What your visitors will experience</p>
      <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
        {[
          'A clear recommendation path, not a dead-end chatbot',
          'Next-step prompts for pricing, demos, and support',
          'An experience that feels like your best sales rep',
        ].map((t) => (
          <li key={t} className="flex gap-2.5">
            <Check className="mt-0.5 text-primary" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}