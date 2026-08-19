import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PageSection } from '../../components/ui/PageSection';
import { SEO } from '../../components/SEO';
import { blogArticles, type BlogArticle } from '../../config/blog-articles';
import { estimateReadTime, getMarkdownArticles } from '../../lib/blog-content';

const markdownArticles: BlogArticle[] = getMarkdownArticles().map((article) => ({
  slug: article.slug,
  title: article.title,
  excerpt: article.description,
  category: article.category,
  readTime: estimateReadTime(article.content),
  publishDate: article.date,
}));

const allArticles: BlogArticle[] = [
  ...markdownArticles,
  ...blogArticles.filter((article) => !markdownArticles.some((m) => m.slug === article.slug)),
];

const CATEGORY_COLORS: Record<string, string> = {
  Comparison: 'bg-blue-100 text-blue-700',
  Education: 'bg-purple-100 text-purple-700',
  Guide: 'bg-emerald-100 text-emerald-700',
  Engineering: 'bg-amber-100 text-amber-700',
};

export default function BlogPage() {
  const featured = blogArticles[0]!;
  const byCategory = allArticles.reduce<Record<string, BlogArticle[]>>((groups, article) => {
    if (!groups[article.category]) groups[article.category] = [];
    groups[article.category]!.push(article);
    return groups;
  }, {});
  const categories = Object.keys(byCategory);

  return (
    <>
      <SEO
        title="Blog | BurFlow — AI Sales Agent Insights & Guides"
        description="Learn how AI sales agents convert website visitors into qualified pipeline. Guides, comparisons, and engineering deep-dives from the BurFlow team."
        canonicalPath="/blog"
      />
      <PageSection className="pt-20 md:pt-28" containerClassName="max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-neutral-900)] md:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-lg text-[var(--color-neutral-500)]">
            Insights on converting website traffic into qualified pipeline with AI.
          </p>

          {/* Featured article */}
          <Link
            to={`/blog/${featured.slug}`}
            className="mt-10 block rounded-2xl border border-[var(--color-neutral-200)] bg-gradient-to-br from-[var(--color-accent-600)]/5 to-white p-8 shadow-sm transition hover:border-[var(--color-accent-600)] hover:shadow-md"
          >
            <span className="inline-block rounded-full bg-[var(--color-accent-600)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent-600)]">
              {featured.category}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-[var(--color-neutral-900)]">
              {featured.title}
            </h2>
            <p className="mt-2 text-[var(--color-neutral-500)]">{featured.excerpt}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-accent-600)]">
              Read article →
            </span>
          </Link>

          {/* Articles by category */}
          {categories.map((cat) => (
            <div key={cat} className="mt-12">
              <h2 className="text-lg font-semibold text-[var(--color-neutral-900)]">
                {cat}
              </h2>
              <div className="mt-4 space-y-3">
                {byCategory[cat]!
                  .filter((article) => article.slug !== featured.slug)
                  .map((article) => (
                    <Link
                      key={article.slug}
                      to={`/blog/${article.slug}`}
                      className="block rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5 shadow-sm transition hover:border-[var(--color-accent-600)] hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-700'}`}>
                            {cat}
                          </span>
                          <h3 className="mt-2 text-base font-semibold text-[var(--color-neutral-900)]">
                            {article.title}
                          </h3>
                          <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
                            {article.excerpt}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--color-neutral-400)]">
                          {article.readTime}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </motion.div>
      </PageSection>
    </>
  );
}
