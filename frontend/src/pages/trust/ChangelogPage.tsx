export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">Changelog</h1>
      <p className="mt-4 text-[var(--color-neutral-500)]">Product updates and release notes.</p>
      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-[var(--color-neutral-200)] p-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--color-accent-600)]">v1.2.0</span>
            <span className="text-xs text-[var(--color-neutral-400)]">August 2026</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-[var(--color-neutral-600)]">
            <li>• Multi-provider LLM fallback (Anthropic, Gemini, Groq)</li>
            <li>• Website crawler for automatic knowledge base ingestion</li>
            <li>• Improved widget quick-replies and suggestion panels</li>
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--color-neutral-200)] p-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--color-accent-600)]">v1.1.0</span>
            <span className="text-xs text-[var(--color-neutral-400)]">July 2026</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-[var(--color-neutral-600)]">
            <li>• Conversation memory and context continuity</li>
            <li>• Buying intent detection and lead scoring</li>
            <li>• Widget design overhaul with modern styling</li>
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--color-neutral-200)] p-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--color-accent-600)]">v1.0.0</span>
            <span className="text-xs text-[var(--color-neutral-400)]">June 2026</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-[var(--color-neutral-600)]">
            <li>• Initial launch — AI website sales agent platform</li>
            <li>• Knowledge base with document upload and chunking</li>
            <li>• Embeddable chat widget with real-time streaming</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
