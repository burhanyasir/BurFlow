import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionContainer } from '../../components/ui/SectionContainer';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { Seo } from '../../components/seo/Seo';

const WEBHOOK_EVENTS = [
  { event: 'conversation.created', description: 'A visitor started a conversation with the widget.' },
  { event: 'conversation.completed', description: 'A conversation reached a terminal state (resolved, closed, or handed off).' },
  { event: 'escalation.created', description: 'A visitor requested a human handoff.' },
  { event: 'unanswered.created', description: 'The agent could not answer a question from the knowledge base.' },
  { event: 'feedback.received', description: 'A visitor submitted rating or feedback on a response.' },
  { event: 'lead.captured', description: 'A lead was captured from a conversation or form.' },
  { event: 'lead.qualified', description: 'A lead crossed the qualification threshold (intent score, stage, or lead score).' },
];

export default function IntegrationsPage() {
  return (
    <div className="relative min-h-screen bg-obsidian text-white">
      <Seo title="Integrations" description="Connect BurFlow to your stack — webhooks, the REST API, team access, and embed platforms." path="/docs/integrations" />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-white/50">
          <Link to="/docs" className="hover:text-white transition-colors">Docs Home</Link>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          <span className="text-white/80">Integrations</span>
        </nav>
      </div>

      <PageHeader
        badge="Connect your stack"
        title="Integrations"
        description="Push events to your own systems with webhooks, drive conversations and knowledge through the REST API, and invite your team to collaborate."
      />

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-6">Webhooks</h2>
        <GlassPanel className="p-6 md:p-8">
          <p className="text-sm leading-relaxed text-white/70 mb-6">
            Configure webhooks from <span className="font-mono text-[#E8A0B4]">Settings → Webhooks</span> with a payload URL and the events you care about. BurFlow signs every delivery with an HMAC secret so your endpoint can verify authenticity. Each delivery is retried with backoff; delivery history is shown on the webhook row.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-white/40">
                  <th className="py-3 pr-4 font-medium">Event</th>
                  <th className="py-3 font-medium">Fires when</th>
                </tr>
              </thead>
              <tbody>
                {WEBHOOK_EVENTS.map((row) => (
                  <tr key={row.event} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-mono text-[#E8A0B4]">{row.event}</td>
                    <td className="py-3 text-white/70">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-6">API keys</h2>
        <GlassPanel className="p-6 md:p-8">
          <p className="text-sm leading-relaxed text-white/70">
            Create scoped API keys from <span className="font-mono text-[#E8A0B4]">Settings → API Keys</span> with Read, Write, or Admin permissions. The key is shown once at creation — treat it like a password. See the <Link to="/docs/api" className="text-[#C94F72] hover:text-[#E8A0B4] transition-colors">API Reference</Link> for endpoint details.
          </p>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-6">Team access</h2>
        <GlassPanel className="p-6 md:p-8">
          <p className="text-sm leading-relaxed text-white/70">
            Invite teammates from <span className="font-mono text-[#E8A0B4]">Settings → Team Members</span> with Admin, Member, or Viewer roles. Invitations are sent by email and accept via a token link — the invitee does not need an account beforehand.
          </p>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <div className="border-t border-white/10 pt-12">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Related documentation</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/docs/quick-start" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Quick Start →</Link>
            <Link to="/docs/widget" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Widget Integration →</Link>
            <Link to="/docs/knowledge" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Knowledge Management →</Link>
            <Link to="/docs/api" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">API Reference →</Link>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}
