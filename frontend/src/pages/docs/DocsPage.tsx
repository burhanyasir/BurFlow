import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PageSection } from '../../components/ui/PageSection';
import { EmptyState } from '../../components/ui/EmptyState';
import { Seo } from '../../components/seo/Seo';

const docLinks = [
  { title: 'Widget integration', description: 'Embed the widget on your website with a single snippet.', href: '/docs/widget' },
  { title: 'API reference', description: 'Explore chat, knowledge, and config endpoints.', href: '/docs/api' },
];

export default function DocsPage() {
  return (
    <>
      <Seo title="Docs" description="Browse the widget integration guide and API reference for Conversation Engine." path="/docs" />
      <PageSection className="pt-20 md:pt-28" containerClassName="max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <EmptyState
            icon={
              <svg className="h-12 w-12 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
            title="Documentation"
            description="Use the guides below to connect the widget or call the API directly."
            size="lg"
          />
          <div className="mt-8 space-y-3">
            {docLinks.map((link) => (
              <Link key={link.href} to={link.href} className="block rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5 shadow-sm transition hover:border-[var(--color-accent-600)] hover:shadow-md">
                <h3 className="text-base font-semibold text-[var(--color-neutral-900)]">{link.title}</h3>
                <p className="mt-1 text-sm text-[var(--color-neutral-500)]">{link.description}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      </PageSection>
    </>
  );
}
