import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionContainer } from '../../components/ui/SectionContainer';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { Seo } from '../../components/seo/Seo';

const ENDPOINTS = [
  {
    endpoint: '/api/chat',
    method: 'POST',
    description: 'Send a message and receive a grounded AI response with citations.',
    curl: `curl -X POST https://api.conversationengine.com/api/chat \\
  -H "Authorization: Bearer sk_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "conversation_id": "conv_abc123",
    "message": "What plans do you offer?",
    "context": { "user_id": "usr_456" }
  }'`,
  },
  {
    endpoint: '/api/knowledge/upload',
    method: 'POST',
    description: 'Upload a document to be parsed, chunked, embedded, and indexed.',
    curl: `curl -X POST https://api.conversationengine.com/api/knowledge/upload \\
  -H "Authorization: Bearer sk_YOUR_API_KEY" \\
  -F "file=@/path/to/document.pdf" \\
  -F "metadata={\\"title\\":\\"Product Guide\\",\\"category\\":\\"support\\"}"`,
  },
  {
    endpoint: '/api/widget/config',
    method: 'GET',
    description: 'Retrieve the current widget configuration for your workspace.',
    curl: `curl -X GET https://api.conversationengine.com/api/widget/config \\
  -H "Authorization: Bearer sk_YOUR_API_KEY"`,
  },
  {
    endpoint: '/api/conversations',
    method: 'GET',
    description: 'List all conversations with pagination, filters, and status.',
    curl: `curl -X GET "https://api.conversationengine.com/api/conversations?limit=20&status=active" \\
  -H "Authorization: Bearer sk_YOUR_API_KEY"`,
  },
];

export default function ApiPage() {
  return (
    <div className="relative min-h-screen bg-obsidian text-white">
      <Seo title="API Reference" description="Use the BurFlow REST API to send chat requests, upload knowledge, and manage widgets." path="/docs/api" />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-white/50">
          <Link to="/docs" className="hover:text-white transition-colors">Docs Home</Link>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          <span className="text-white/80">API Reference</span>
        </nav>
      </div>

      <PageHeader
        badge="API REFERENCE"
        title="REST endpoints and SDKs."
        description="Integrate directly with the BurFlow API for programmatic access to chat, knowledge, and configuration."
      />

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-4">Authentication</h2>
        <GlassPanel className="p-6 md:p-8 mb-8">
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            All API requests require a Bearer token in the <code className="text-[#E8A0B4] bg-[#16162a] px-1.5 py-0.5 rounded">Authorization</code> header. Generate your API key from the <strong className="text-white">Settings → API Keys</strong> page in the dashboard.
          </p>
          <pre className="text-sm text-[#e4e4f0] bg-[#16162a] p-4 rounded-xl border border-[rgba(255,255,255,0.08)]">Authorization: Bearer sk_YOUR_API_KEY</pre>
          <p className="mt-4 text-sm text-white/60">Keep your API keys secure. Do not expose them in client-side code — use the widget for frontend integration.</p>
        </GlassPanel>

        <h2 className="text-2xl font-bold text-white mb-4">Base URL</h2>
        <GlassPanel className="p-6 md:p-8 mb-8">
          <pre className="text-sm text-[#e4e4f0] bg-[#16162a] p-4 rounded-xl border border-[rgba(255,255,255,0.08)]">https://api.conversationengine.com</pre>
          <p className="mt-3 text-sm text-white/60">All endpoints are served over HTTPS. Requests over plain HTTP will be rejected.</p>
        </GlassPanel>

        <h2 className="text-2xl font-bold text-white mb-8">Endpoints</h2>
        <div className="space-y-8">
          {ENDPOINTS.map((ep, i) => (
            <motion.div
              key={ep.endpoint}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <GlassPanel className="p-6 md:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {ep.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono text-white">{ep.endpoint}</code>
                    <p className="mt-1 text-sm text-white/60">{ep.description}</p>
                  </div>
                </div>
                <pre className="text-sm text-[#e4e4f0] bg-[#16162a] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] overflow-x-auto">{ep.curl}</pre>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-8">Rate limiting</h2>
        <GlassPanel className="p-6 md:p-8">
          <div className="space-y-3 text-sm text-white/70">
            <p>The API enforces rate limits to ensure fair usage across all workspaces:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong className="text-white">Chat:</strong> 60 requests per minute per API key.</li>
              <li><strong className="text-white">Knowledge upload:</strong> 10 requests per minute per workspace.</li>
              <li><strong className="text-white">Read endpoints:</strong> 120 requests per minute per API key.</li>
            </ul>
            <p className="mt-3">Rate limit headers (<code className="text-[#E8A0B4] bg-[#16162a] px-1.5 py-0.5 rounded">X-RateLimit-Remaining</code>, <code className="text-[#E8A0B4] bg-[#16162a] px-1.5 py-0.5 rounded">X-RateLimit-Reset</code>) are included in all responses. Contact sales if you need higher limits.</p>
          </div>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <div className="border-t border-white/10 pt-12">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Related documentation</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/docs/quick-start" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Quick Start →</Link>
            <Link to="/docs/widget" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Widget Integration →</Link>
            <Link to="/docs/knowledge" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Knowledge Management →</Link>
            <Link to="/docs/integrations" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Integrations →</Link>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}