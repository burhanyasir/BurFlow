export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">How Grounding Works</h1>
      <p className="mt-4 text-lg text-[var(--color-neutral-500)]">Why BurFlow gives accurate answers instead of hallucinations.</p>
      <div className="mt-10 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-neutral-900)]">1. Ingest your website</h2>
          <p className="mt-2 text-[var(--color-neutral-600)] leading-relaxed">
            BurFlow crawls your public pages, extracts product details, pricing, FAQs, and service descriptions,
            then chunks and embeds them into a searchable knowledge base.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-neutral-900)]">2. Retrieve before responding</h2>
          <p className="mt-2 text-[var(--color-neutral-600)] leading-relaxed">
            Every visitor question is matched against your knowledge base using hybrid vector + keyword search.
            Only relevant, verified facts are passed to the LLM as context.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-neutral-900)]">3. Generate with evidence</h2>
          <p className="mt-2 text-[var(--color-neutral-600)] leading-relaxed">
            The LLM generates a response grounded in the retrieved facts. Every answer can be traced back to
            a specific source document, section, and snippet — no guessing, no invented pricing.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[var(--color-neutral-900)]">4. Score confidence</h2>
          <p className="mt-2 text-[var(--color-neutral-600)] leading-relaxed">
            Each response receives a confidence score based on retrieval quality and source strength.
            Low-confidence answers are flagged so your team can review and improve the knowledge base.
          </p>
        </section>
      </div>
    </div>
  );
}
