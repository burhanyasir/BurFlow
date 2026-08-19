import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Home, Sparkles, ChevronRight } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { Badge } from '../../components/ui/Badge';
import { track } from '../../lib/analytics';
import {
  TOOL_CATEGORIES,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildWebApplicationSchema,
  getRelatedTools,
  type ToolDefinition,
} from '../../data/toolsData';
import { ToolIcon } from './toolIcons';
import { cn } from '../../utils/cn';

export interface GenericToolWrapperProps {
  tool: ToolDefinition;
  subtitle: string;
  children: ReactNode;
  showFaqs?: boolean;
}

const SITE_URL = 'https://burflow.vercel.app';

export function GenericToolWrapper({ tool, subtitle, children, showFaqs = true }: GenericToolWrapperProps) {
  const route = tool.route ?? `/tools/${tool.slug}`;
  const related = getRelatedTools(tool, 3);
  const faqs = tool.faqs ?? [];

  useEffect(() => {
    track('tool_viewed', {
      tool_id: tool.slug,
      tool_name: tool.name,
      category: tool.category,
      path: route,
    });
  }, [tool.slug, tool.name, tool.category, route]);

  const trackCta = (location: string) => {
    track('tool_cta_click', { tool_id: tool.slug, location });
  };

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/free-tools' },
    { name: tool.name, path: route },
  ]);

  const schemas = [breadcrumbSchema, buildWebApplicationSchema(tool)];
  if (showFaqs && faqs.length > 0) schemas.push(buildFaqSchema(faqs));

  return (
    <>
      <SEO
        title={tool.seo?.title ?? `${tool.name} | BurFlow`}
        description={tool.seo?.description ?? tool.shortDescription}
        canonicalPath={route}
        schema={schemas}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-8 md:pt-24 md:pb-10">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-600)]/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--color-neutral-400)]">
              <li>
                <Link to="/" className="inline-flex items-center gap-1 hover:text-[var(--color-accent-600)]">
                  <Home className="h-3.5 w-3.5" aria-hidden="true" />
                  Home
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li>
                <Link to="/free-tools" className="hover:text-[var(--color-accent-600)]">Free Tools</Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li aria-current="page" className="font-medium text-[var(--color-neutral-700)]">{tool.name}</li>
            </ol>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-600)]/10 text-[var(--color-accent-600)]">
              <ToolIcon name={tool.icon} className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-4xl">{tool.name}</h1>
                <Badge variant="info" size="sm">Free</Badge>
              </div>
              <p className="mt-2 max-w-2xl text-[var(--color-neutral-500)]">{subtitle}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace */}
      <section className="pb-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-6 shadow-sm md:p-10">
            {children}
          </div>
        </div>
      </section>

      {/* Powered by BurFlow banner */}
      <section className="pb-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--color-accent-600)]/25 bg-gradient-to-br from-[var(--color-accent-600)] via-[var(--color-accent-600)]/90 to-[var(--color-accent-700)] p-8 text-center md:p-10">
            <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <Sparkles className="mx-auto h-8 w-8 text-white/90" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">
              Automate your SaaS sales with AI
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-white/85">
              BurFlow answers questions, qualifies visitors, and captures pipeline in real time — on your
              website, in minutes. Powered by BurFlow.
            </p>
            <Link
              to="/signup"
              onClick={() => trackCta('powered_by_banner')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-[var(--color-accent-700)] shadow-lg transition-all hover:bg-[var(--color-neutral-100)] hover:shadow-xl"
            >
              Try BurFlow Free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {showFaqs && faqs.length > 0 && (
        <section className="pb-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">Frequently asked questions</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-2xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--color-neutral-900)]">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-neutral-500)]">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related tools */}
      {related.length > 0 && (
        <section className="pb-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">Related tools</h2>
              <Link to="/free-tools" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]">
                View all tools
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  to={item.route ?? '/free-tools'}
                  className={cn(
                    'group flex flex-col rounded-2xl border bg-[var(--color-neutral-0)] p-5 transition-all duration-300',
                    item.status === 'active'
                      ? 'border-[var(--color-neutral-200)] shadow-sm hover:-translate-y-1 hover:shadow-md hover:border-[var(--color-accent-600)]/30'
                      : 'border-dashed border-[var(--color-neutral-300)]'
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-600)]/10 text-[var(--color-accent-600)]">
                    <ToolIcon name={item.icon} className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-[var(--color-neutral-900)]">{item.name}</h3>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-[var(--color-neutral-500)]">
                    {item.shortDescription}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent-600)]">
                    {item.status === 'active' ? 'Try tool' : `Coming soon · ${TOOL_CATEGORIES[item.category].label}`}
                    {item.status === 'active' && <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
                  </span>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-xs text-[var(--color-neutral-400)]">
              {SITE_URL}{route} · Free to use · No sign-up required
            </p>
          </div>
        </section>
      )}
    </>
  );
}