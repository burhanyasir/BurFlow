import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardPaste, ShieldAlert, XCircle } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const tool = getToolBySlug('sitemap-validator')!;

interface Issue {
  level: 'error' | 'warning';
  message: string;
}

interface ValidationResult {
  valid: boolean;
  score: number;
  urlCount: number;
  issues: Issue[];
}

function validateSitemap(xml: string): ValidationResult {
  const issues: Issue[] = [];

  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return {
      valid: false,
      score: 0,
      urlCount: 0,
      issues: [{ level: 'error', message: `XML is not well-formed: ${(parseError.textContent ?? '').trim().slice(0, 200)}` }],
    };
  }

  const root = doc.documentElement;
  if (!root || root.nodeName !== 'urlset') {
    issues.push({ level: 'error', message: 'Root element must be <urlset>. Did you paste a sitemap index or an HTML page?' });
    return { valid: false, score: 0, urlCount: 0, issues };
  }

  if (!root.getAttribute('xmlns')?.includes('sitemaps.org/schemas/sitemap')) {
    issues.push({ level: 'error', message: 'Missing or invalid xmlns namespace declaration (sitemaps.org/schemas/sitemap/0.9).' });
  }

  const urls = Array.from(root.children).filter((el) => el.nodeName === 'url');
  const urlCount = urls.length;

  if (urlCount === 0) {
    issues.push({ level: 'error', message: 'No <url> entries found inside <urlset>.' });
  }
  if (urlCount > 50000) {
    issues.push({ level: 'error', message: `Sitemap has ${urlCount} URLs — exceeds the 50,000 URL limit. Split it into multiple sitemaps.` });
  }

  let missingLoc = 0;
  let badProtocol = 0;
  let httpUrls = 0;
  let httpsUrls = 0;
  let withLastmod = 0;

  for (const url of urls.slice(0, 1000)) {
    const loc = url.querySelector('loc');
    if (!loc || !loc.textContent?.trim()) {
      missingLoc += 1;
      continue;
    }
    const href = loc.textContent.trim();
    if (href.startsWith('http://')) httpUrls += 1;
    if (href.startsWith('https://')) httpsUrls += 1;
    if (url.querySelector('lastmod')?.textContent) withLastmod += 1;
    if (href !== href.trim() || /\s/.test(href)) {
      issues.push({ level: 'error', message: `URL contains whitespace or invalid characters: ${href.slice(0, 120)}` });
    }
    if (!/^https?:\/\//.test(href)) badProtocol += 1;
  }

  if (missingLoc > 0) issues.push({ level: 'error', message: `${missingLoc} <url> entr${missingLoc === 1 ? 'y is' : 'ies are'} missing a <loc> tag.` });
  if (badProtocol > 0) issues.push({ level: 'error', message: `${badProtocol} URL${badProtocol === 1 ? '' : 's'} do not start with http(s):// — they will be rejected by crawlers.` });
  if (httpUrls > 0 && httpsUrls > 0) issues.push({ level: 'warning', message: 'Mixed http and https URLs detected. Prefer a single protocol (https) for consistency.' });
  if (urlCount > 0 && withLastmod === 0) issues.push({ level: 'warning', message: 'No <lastmod> values found. Adding last modification dates helps crawlers prioritize re-crawls.' });

  const deductions = issues.filter((i) => i.level === 'error').length * 15 + issues.filter((i) => i.level === 'warning').length * 5;
  const score = Math.max(0, Math.min(100, 100 - deductions));
  const valid = issues.every((i) => i.level === 'warning');

  return { valid, score, urlCount, issues };
}

const SAMPLE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://burflow.vercel.app/</loc>
    <lastmod>2026-08-18</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://burflow.vercel.app/tools</loc>
    <lastmod>2026-08-18</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

export default function SitemapValidatorPage() {
  const { addToast } = useToast();
  const [xml, setXml] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleValidate = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = xml.trim();
    if (trimmed.length === 0) {
      addToast('Paste a sitemap XML first', 'error');
      return;
    }
    setResult(validateSitemap(trimmed));
  };

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-[var(--color-success-600)]' : score >= 50 ? 'text-[var(--color-warning-600)]' : 'text-[var(--color-error-600)]';

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Validate your XML sitemap for errors, compliance, and SEO optimization — with a detailed report and performance score, right in your browser."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Input */}
        <div>
          <form onSubmit={handleValidate} className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="sitemap-xml" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  Paste your sitemap XML
                </label>
                <button
                  type="button"
                  onClick={() => setXml(SAMPLE_SITEMAP)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                  Load sample
                </button>
              </div>
              <textarea
                id="sitemap-xml"
                value={xml}
                onChange={(e) => setXml(e.target.value)}
                placeholder={'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://example.com/</loc>\n  </url>\n</urlset>'}
                rows={14}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Validate sitemap
            </button>
          </form>
          <p className="mt-4 text-xs text-[var(--color-neutral-400)]">
            Your XML never leaves your browser — validation runs 100% locally.
          </p>
        </div>

        {/* Results */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Validation report</h2>
          <div className="mt-3 min-h-[18rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
            {result === null ? (
              <p className="text-sm text-[var(--color-neutral-400)]">
                Paste your sitemap XML on the left and click “Validate sitemap” to see your report.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <div className={cn('text-4xl font-bold tabular-nums', scoreColor(result.score))}>{result.score}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-neutral-400)]">SEO score</div>
                  </div>
                  <div>
                    <div className="text-4xl font-bold tabular-nums text-[var(--color-neutral-900)]">{result.urlCount}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-neutral-400)]">URLs found</div>
                  </div>
                  <div>
                    <div className={cn('flex items-center gap-1.5 text-sm font-bold', result.valid ? 'text-[var(--color-success-600)]' : 'text-[var(--color-error-600)]')}>
                      {result.valid ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}
                      {result.valid ? 'Valid' : 'Needs fixes'}
                    </div>
                  </div>
                </div>

                {result.issues.length === 0 ? (
                  <p className="text-sm text-[var(--color-neutral-500)]">
                    No issues found. Your sitemap follows sitemap protocol best practices. Submit it in Google
                    Search Console and Bing Webmaster Tools.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {result.issues.map((issue, i) => (
                      <li
                        key={i}
                        className={cn(
                          'flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed',
                          issue.level === 'error'
                            ? 'border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 text-[var(--color-error-600)]'
                            : 'border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/10 text-[var(--color-warning-600)]'
                        )}
                      >
                        {issue.level === 'error'
                          ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                        <span>{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {result.issues.some((i) => i.level === 'error') && (
                  <div className="rounded-xl border border-[var(--color-accent-600)]/25 bg-[var(--color-accent-600)]/10 p-4">
                    <p className="text-sm font-semibold text-[var(--color-neutral-900)]">Need a sitemap that just works?</p>
                    <p className="mt-1 text-xs text-[var(--color-neutral-500)]">
                      BurFlow scans your site, generates protocol-compliant sitemaps, and keeps them updated automatically.
                    </p>
                    <Link
                      to="/signup"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-600)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-accent-700)]"
                    >
                      Try BurFlow Free
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </GenericToolWrapper>
  );
}