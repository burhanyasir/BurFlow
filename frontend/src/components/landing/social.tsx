import { useEffect, useState } from 'react';

export function RatingProof() {
  const initials = ['M', 'J', 'A', 'S', 'R'];
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex -space-x-2.5">
        {initials.map((i, idx) => (
          <span
            key={i}
            style={{ zIndex: initials.length - idx }}
            className="grid size-9 place-items-center rounded-full border-2 border-background bg-accent font-display text-sm font-bold text-accent-foreground"
          >
            {i}
          </span>
        ))}
      </div>
      <div className="text-sm">
        <span className="inline-flex items-center gap-0.5 align-middle text-primary">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} viewBox="0 0 20 20" aria-hidden className="size-4">
              <path
                d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.8 4.9 17.4l1-5.6-4.1-4 5.7-.8z"
                fill="currentColor"
              />
            </svg>
          ))}
        </span>{' '}
        <span className="font-semibold">4.9/5</span>{' '}
        <span className="text-muted-foreground">from 380+ revenue teams</span>
      </div>
    </div>
  );
}

const brands = [
  'NORTHWIND',
  'Acme Cloud',
  'Lumen',
  'Fieldstone',
  'Harborly',
  'Vector Labs',
  'Tidewell',
];

export function TrustMarquee() {
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="marquee-track flex w-max gap-14 py-1">
        {[...brands, ...brands].map((b, i) => (
          <span
            key={`${b}-${i}`}
            className="font-display text-lg font-semibold tracking-tight text-muted-foreground/70"
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

const activity = [
  { who: 'A SaaS team in Berlin', what: 'scanned their pricing pages', when: '2 min ago' },
  { who: 'An agency in Austin', what: 'launched their sales agent', when: '6 min ago' },
  { who: 'A fintech in London', what: 'booked 3 demos overnight', when: '11 min ago' },
  { who: 'A B2B shop in Toronto', what: 'started a free scan', when: 'just now' },
];

export function LiveActivity() {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const start = setTimeout(() => setShown(true), 4500);
    const cycle = setInterval(() => setI((v) => (v + 1) % activity.length), 7000);
    return () => {
      clearTimeout(start);
      clearInterval(cycle);
    };
  }, []);

  if (closed) return null;
  const a = activity[i]!;

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed bottom-24 left-4 z-40 hidden max-w-xs transition-all duration-500 md:bottom-6 md:block ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-hairline bg-surface/95 p-4 shadow-lift backdrop-blur">
        <span className="live-dot mt-1.5 size-2 shrink-0 rounded-full bg-success" />
        <p className="min-w-0 text-sm leading-snug">
          <span className="font-semibold">{a.who}</span>{' '}
          <span className="text-muted-foreground">{a.what}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground/80">{a.when}</span>
        </p>
        <button
          onClick={() => setClosed(true)}
          aria-label="Dismiss activity"
          className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}