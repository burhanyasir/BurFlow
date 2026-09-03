import { Check } from './primitives';

export type ScanStatus = 'idle' | 'scanning' | 'done';

export interface ScanResult {
  pages: number;
  products: number;
  services: number;
  pricing: number;
  faqs: number;
  intents: number;
}

export interface ScanDetails {
  name: string;
  description: string;
  pages: string[];
  products: string[];
  services: string[];
  headings: string[];
}

export interface ScanCardProps {
  status: ScanStatus;
  stage: string;
  progress: number;
  url: string;
  result: ScanResult | null;
  details: ScanDetails | null;
  onRestart: () => void;
  readiness?: number;
  signupUrl?: string;
}

const idleStats = [
  { label: 'Pages scanned', value: '184+' },
  { label: 'Products found', value: '6' },
  { label: 'Buyer intents', value: '18' },
];

export function ScanCard({ status, stage, progress, url, result, details, onRestart, readiness, signupUrl }: ScanCardProps) {
  const liveStats = result
    ? [
        { label: 'Pages scanned', value: `${result.pages}+` },
        { label: 'Products found', value: `${result.products}` },
        { label: 'Services found', value: `${result.services}` },
        { label: 'Pricing pages', value: `${result.pricing}` },
        { label: 'FAQs detected', value: `${result.faqs}` },
        { label: 'Buyer intents', value: `${result.intents}` },
      ]
    : null;

  const score = readiness ?? 97;

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
              <span className="font-display font-bold">{score}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${score}%` }} />
            </div>
          </div>

          <dl className={`mt-7 grid gap-4 border-y border-hairline py-5 ${liveStats ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3'}`}>
            {(liveStats ?? idleStats).map((s) => (
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

      {status === 'done' && details && (
        <div className="mt-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
          <span className="font-semibold text-foreground">{details.name}</span>{' '}
          <span className="text-muted-foreground">{details.description}</span>
        </div>
      )}

      {status === 'done' && details && details.products.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Products & features</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {details.products.slice(0, 6).map((p, i) => (
              <span key={i} className="inline-block rounded-md bg-primary/8 px-2 py-0.5 text-xs text-primary border border-primary/15">{p.slice(0, 50)}</span>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && details && details.services.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Services found</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {details.services.slice(0, 6).map((s, i) => (
              <span key={i} className="inline-block rounded-md bg-primary/8 px-2 py-0.5 text-xs text-primary border border-primary/15">{s.slice(0, 50)}</span>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && details && details.headings.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Key pages & sections</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {details.headings.slice(0, 8).map((h, i) => (
              <span key={i} className="inline-block rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground border border-hairline">{h.slice(0, 40)}</span>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && details && details.pages.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pages discovered</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {details.pages.slice(0, 8).map((p, i) => (
              <span key={i} className="inline-block max-w-[140px] truncate rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground border border-hairline" title={p}>{p.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean).slice(-2).join('/') || '/'}</span>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-sm font-semibold">
        What your visitors will experience
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
        <div className="mt-6 flex flex-wrap gap-3">
          {signupUrl && (
            <a
              href={signupUrl}
              className="inline-flex h-10 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              Claim your agent →
            </a>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex h-10 items-center rounded-full border border-hairline px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30"
          >
            Scan another site
          </button>
        </div>
      )}
    </div>
  );
}
