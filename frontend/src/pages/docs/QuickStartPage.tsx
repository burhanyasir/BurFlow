import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionContainer } from '../../components/ui/SectionContainer';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { Seo } from '../../components/seo/Seo';

const STEPS = [
  {
    title: 'Create your workspace',
    body: 'Sign up with a work email and BurFlow creates a workspace and a default widget configuration for you. Your tenant gets a stable agent id that the widget uses to identify itself.',
  },
  {
    title: 'Scan your website',
    body: 'From the Knowledge page, run a scan of your public site. BurFlow crawls your pages, extracts products, pricing, and service details, and turns them into knowledge your agent can answer from.',
  },
  {
    title: 'Add support documents (optional)',
    body: 'Upload PDFs, text, or markdown files for deeper coverage — onboarding guides, FAQ docs, policy pages. Each file is chunked and indexed automatically. Processing status is shown per document.',
  },
  {
    title: 'Customize the widget',
    body: 'Open Widget settings to pick your brand color (presets, hex, or the RGB mixer), choose a launcher position, set the greeting, launcher text, and starter questions, and toggle auto-open.',
  },
  {
    title: 'Install the embed snippet',
    body: 'Copy the HTML snippet from the Widget page and paste it into your site header. React, WordPress, Shopify, and Webflow variants are provided under the Embed tab.',
  },
  {
    title: 'Verify and go live',
    body: 'Open your live site, click the chat bubble, and ask a test question. The response should include grounded answers with citations. Watch the conversation appear in the Conversations tab in real time.',
  },
];

export default function QuickStartPage() {
  return (
    <div className="relative min-h-screen bg-obsidian text-white">
      <Seo title="Quick Start" description="Get BurFlow live on your website in under 10 minutes — scan, learn, customize, and install the widget." path="/docs/quick-start" />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-white/50">
          <Link to="/docs" className="hover:text-white transition-colors">Docs Home</Link>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          <span className="text-white/80">Quick Start</span>
        </nav>
      </div>

      <PageHeader
        badge="Live in under 10 minutes"
        title="Quick Start"
        description="Get a grounded, branded sales agent on your website today — no training data, no spreadsheets, no manual tuning."
      />

      <SectionContainer containerClassName="max-w-4xl">
        <GlassPanel className="p-6 md:p-8">
          <ol className="space-y-8">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C94F72]/20 text-sm font-bold text-[#E8A0B4]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <div className="border-t border-white/10 pt-12">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Related documentation</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/docs/widget" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Widget Integration →</Link>
            <Link to="/docs/knowledge" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Knowledge Management →</Link>
            <Link to="/docs/api" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">API Reference →</Link>
            <Link to="/docs/integrations" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Integrations →</Link>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}
