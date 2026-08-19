import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Check } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { Badge } from '../../components/ui/Badge';
import { TOOLS, TOOL_CATEGORIES, TOOL_CATEGORY_ORDER, buildBreadcrumbSchema, type ToolCategory } from '../../data/toolsData';
import { ToolIcon } from './toolIcons';
import { cn } from '../../utils/cn';

type Filter = 'all' | ToolCategory;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All Tools' },
  ...TOOL_CATEGORY_ORDER.map((c) => ({ value: c as Filter, label: TOOL_CATEGORIES[c].label })),
];

const BADGE_VARIANT = {
  Interactive: 'info',
  Free: 'success',
  Popular: 'warning',
} as const;

const SITEMAP_SCHEMA = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Free Tools', path: '/tools' },
]);

export default function ToolsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const visibleTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const matchesFilter = filter === 'all' || tool.category === filter;
      const matchesQuery =
        q.length === 0 ||
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        TOOL_CATEGORIES[tool.category].label.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  return (
    <>
      <SEO
        title="Free B2B SaaS Sales & Conversion Tools | BurFlow"
        description="Discover a suite of free, powerful tools tailored for SaaS companies — lead leak calculators, ROI estimators, AI FAQ generators, Markdown converters, and sitemap validators."
        canonicalPath="/tools"
        schema={SITEMAP_SCHEMA}
      />

      <section className="relative overflow-hidden pt-20 pb-10 md:pt-28 md:pb-14">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-600)]/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="info" size="sm" dot className="mb-5">Free forever · No sign-up needed</Badge>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
              Free Tools Hub
            </h1>
            <p className="mt-4 text-lg text-[var(--color-neutral-500)]">
              Discover a suite of free, powerful tools tailored for SaaS companies, designed to streamline
              your workflow and boost your productivity.
            </p>
          </div>

          <div className="mx-auto mt-10 flex max-w-xl flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-400)]" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tools…"
                aria-label="Search tools"
                className="w-full bg-[var(--color-neutral-0)] border border-[var(--color-neutral-200)] rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Filter tools by category">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]',
                    filter === f.value
                      ? 'bg-[var(--color-accent-600)] text-white shadow-sm'
                      : 'bg-[var(--color-neutral-0)] border border-[var(--color-neutral-200)] text-[var(--color-neutral-600)] hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {visibleTools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-0)] px-6 py-16 text-center">
              <p className="text-[var(--color-neutral-500)]">No tools match your search.</p>
              <button
                type="button"
                onClick={() => { setQuery(''); setFilter('all'); }}
                className="mt-3 text-sm font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTools.map((tool, i) => (
                <motion.article
                  key={tool.slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: Math.min(i % 3, 2) * 0.06 }}
                  className={cn(
                    'group relative flex flex-col rounded-2xl border bg-[var(--color-neutral-0)] p-6 transition-all duration-300',
                    tool.status === 'live'
                      ? 'border-[var(--color-neutral-200)] shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-[var(--color-accent-600)]/30'
                      : 'border-dashed border-[var(--color-neutral-300)] opacity-80'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent-600)]/10 text-[var(--color-accent-600)]">
                      <ToolIcon name={tool.icon} className="h-5 w-5" />
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {tool.badges.map((b) => (
                        <Badge key={b} variant={BADGE_VARIANT[b]} size="sm">{b}</Badge>
                      ))}
                    </div>
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-[var(--color-neutral-900)]">
                    {tool.name}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-neutral-500)]">
                    {tool.shortDescription}
                  </p>
                  <div className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--color-neutral-400)]">
                    {TOOL_CATEGORIES[tool.category].label}
                  </div>

                  <div className="mt-5">
                    {tool.status === 'live' && tool.route ? (
                      <Link
                        to={tool.route}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-600)] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-700)]"
                      >
                        Try tool
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-4 py-2 text-sm font-medium text-[var(--color-neutral-400)]">
                        <Check className="h-3.5 w-3.5 opacity-0" aria-hidden="true" />
                        Coming soon
                      </span>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          <div className="mt-16 rounded-3xl border border-[var(--color-accent-600)]/20 bg-gradient-to-br from-[var(--color-accent-600)]/10 via-transparent to-transparent p-8 text-center md:p-12">
            <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] md:text-3xl">
              Want a tool that captures the leads these calculators find?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[var(--color-neutral-500)]">
              BurFlow qualifies and captures your website visitors in real time — so the pipeline you
              just measured stops leaking. Deploy in 5 minutes.
            </p>
            <Link
              to="/signup"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-[var(--color-accent-700)] hover:shadow-xl"
            >
              Try BurFlow Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}