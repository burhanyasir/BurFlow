export default function StatusPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-neutral-900)]">System Status</h1>
      <p className="mt-4 text-[var(--color-neutral-500)]">Current operational status of all BurFlow services.</p>
      <div className="mt-8 space-y-3">
        {[
          { name: 'API Server', status: 'Operational', ok: true },
          { name: 'Chat Widget', status: 'Operational', ok: true },
          { name: 'Knowledge Pipeline', status: 'Operational', ok: true },
          { name: 'Embedding Service', status: 'Operational', ok: true },
          { name: 'Dashboard', status: 'Operational', ok: true },
        ].map(s => (
          <div key={s.name} className="flex items-center justify-between rounded-xl border border-[var(--color-neutral-200)] p-4">
            <span className="text-sm font-medium text-[var(--color-neutral-900)]">{s.name}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.ok ? 'text-emerald-600' : 'text-red-600'}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {s.status}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-[var(--color-neutral-400)]">Last updated: {new Date().toLocaleDateString()}</p>
    </div>
  );
}
