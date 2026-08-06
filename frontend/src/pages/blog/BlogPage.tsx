import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PageSection } from '../../components/ui/PageSection';
import { EmptyState } from '../../components/ui/EmptyState';
import { Seo } from '../../components/seo/Seo';

const posts = [
  { slug: 'confidence-guarded-ai-responses', title: 'Confidence-Guarded AI Responses', excerpt: 'How we built token-by-token confidence scoring that prevents low-quality answers from reaching your customers.' },
  { slug: 'grounding-eliminates-hallucinations', title: 'How Grounding Eliminates Hallucinations', excerpt: 'A deep dive into the grounding architecture that ties every response to verifiable sources.' },
];

export default function BlogPage() {
  return (
    <>
      <Seo title="Blog" description="Read the latest product updates and engineering insights from Conversation Engine." path="/blog" />
      <PageSection className="pt-20 md:pt-28" containerClassName="max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <EmptyState
            icon={
              <svg className="h-12 w-12 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            }
            title="Latest articles"
            description="Explore our latest product and engineering stories."
            size="lg"
          />
          <div className="mt-8 space-y-3">
            {posts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="block rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5 shadow-sm transition hover:border-[var(--color-accent-600)] hover:shadow-md">
                <h3 className="text-base font-semibold text-[var(--color-neutral-900)]">{post.title}</h3>
                <p className="mt-1 text-sm text-[var(--color-neutral-500)]">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      </PageSection>
    </>
  );
}
