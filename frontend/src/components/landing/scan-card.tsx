import { Check } from './primitives';

export type ScanStatus = 'idle' | 'scanning' | 'done';

export interface ScanCardProps {
  status: ScanStatus;
  stage: string;
  progress: number;
  url: string;
  onRestart: () => void;
}

const resultStats = [
  { label: 'Pages scanned', value: '26' },
  { label: 'Products found', value: '9' },
  { label: 'Buyer intents', value: '14' },
];

export function ScanCard({ status, stage, progress, url, onRestart }: ScanCardProps) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6 shadow-lift md:p-8">
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          {status === 'idle' ? 'Live scan preview' : status === 'scanning' ? 'Scanning' : 'Scan complete'}
        </p>
        {status === 'idle' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Ready
          </span>
        )}
        {status === 'scanning' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            {Math.round(progress)}%
          </span>
        )}
        {status === 'done' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <Check className="size-3.5" />
            Live in ~10 min
          </span>
        )}
      </div>

      <p className="mt-3 truncate font-display text-lg font-semibold">
        {status === 'idle' ? 'https://yourcompany.com/' : url}
      </p>

      {status === 'scanning' && (
        <div className="mt-6">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            {stage}
          </p>
        </div>
      )}

      {status !== 'scanning' && (
        <>
          <div className="mt-6">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Sales agent readiness</span>
              <span className="font-display font-bold">{status === 'idle' ? '97%' : '97%'}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full w-[97%] rounded-full bg-primary" />
            </div>
          </div>

          <dl className="mt-7 grid grid-cols-3 gap-4 border-y border-hairline py-5">
            {(status === 'idle'
              ? [
                  { label: 'Pages scanned', value: '184+' },
                  { label: 'Products found', value: '6' },
                  { label: 'Buyer intents', value: '18' },
                ]
              : resultStats
            ).map((s) => (
              <div key={s.label}>
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </dt>
                <dd className="mt-1 font-display text-2xl font-bold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {status === 'done' && (
        <div className="mt-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
          <span className="font-semibold">Your agent is ready.</span>{' '}
          <span className="text-muted-foreground">
            Visitors can now ask about products, pricing, and book a demo.
          </span>
        </div>
      )}

      <p className="mt-6 text-sm font-semibold">
        {status === 'done' ? 'What your visitors will experience' : 'What your visitors will experience'}
      </p>
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

      {status === 'done' && (
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 inline-flex h-10 items-center rounded-full border border-hairline px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30"
        >
          Scan another site
        </button>
      )}
    </div>
  );
}
