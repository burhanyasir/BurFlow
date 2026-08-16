import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionContainer } from '../../components/ui/SectionContainer';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { Seo } from '../../components/seo/Seo';

const SOURCES = [
  { name: 'Website crawl', body: 'BurFlow scans your public pages and extracts products, pricing, services, and buyer paths automatically.' },
  { name: 'Document uploads', body: 'PDF, text, and markdown files. Each upload is chunked, embedded, and indexed for retrieval.' },
  { name: 'Manual entries', body: 'Add short FAQ-style entries directly when you need a single grounded answer without a full document.' },
];

const STATUSES = [
  { status: 'processing', description: 'The document was uploaded or re-scanned and is being chunked and embedded.' },
  { status: 'completed', description: 'The document is indexed and available for grounding answers.' },
  { status: 'failed', description: 'The document could not be processed. Check the error on the Knowledge page and retry.' },
];

export default function KnowledgePage() {
  return (
    <div className="relative min-h-screen bg-obsidian text-white">
      <Seo title="Knowledge Management" description="Manage the documents and sources your chatbot learns from — uploads, website crawls, chunking, and retrieval." path="/docs/knowledge" />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-white/50">
          <Link to="/docs" className="hover:text-white transition-colors">Docs Home</Link>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          <span className="text-white/80">Knowledge Management</span>
        </nav>
      </div>

      <PageHeader
        badge="Ground everything"
        title="Knowledge Management"
        description="Answers are only as good as the sources behind them. BurFlow grounds every response in your verified knowledge — uploads, crawls, and manual entries."
      />

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-6">Knowledge sources</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {SOURCES.map((s) => (
            <GlassPanel key={s.name} className="p-6">
              <h3 className="font-semibold text-white">{s.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{s.body}</p>
            </GlassPanel>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-6">Document processing</h2>
        <GlassPanel className="p-6 md:p-8">
          <p className="text-sm leading-relaxed text-white/70 mb-6">
            When you upload a file or run a scan, BurFlow splits the content into chunks, computes an embedding for each chunk, and stores them in the knowledge base used for retrieval. The Knowledge page shows live counts for indexed documents, failed documents, and knowledge chunks.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {STATUSES.map((row) => (
                  <tr key={row.status} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-mono text-[#E8A0B4]">{row.status}</td>
                    <td className="py-3 text-white/70">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-6">Coverage gaps</h2>
        <GlassPanel className="p-6 md:p-8">
          <p className="text-sm leading-relaxed text-white/70">
            Visitor queries your agent cannot answer from the knowledge base are recorded as unanswered questions. Review them on the Knowledge page (or the Unanswered dashboard) and close the gap by adding a document or manual entry — the agent will start answering from it once processed.
          </p>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <div className="border-t border-white/10 pt-12">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Related documentation</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/docs/quick-start" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Quick Start →</Link>
            <Link to="/docs/widget" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Widget Integration →</Link>
            <Link to="/docs/api" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">API Reference →</Link>
            <Link to="/docs/integrations" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Integrations →</Link>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}
