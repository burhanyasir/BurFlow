import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { authClient } from '../../lib/auth-client';
import { cn } from '../../utils/cn';

interface WorkspaceEntry {
  id: string;
  name: string;
  slug: string;
  kind: 'current' | 'parent' | 'child';
}

export function WorkspaceSwitcher() {
  const { user, tenant, switchWorkspace } = useAuth();
  const [entries, setEntries] = useState<WorkspaceEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.role || !['admin', 'owner'].includes(user.role)) return;
    let cancelled = false;
    authClient.listAgencyWorkspaces()
      .then((data) => {
        if (cancelled) return;
        const list: WorkspaceEntry[] = [];
        if (data.parent) list.push({ ...data.parent, kind: 'parent' });
        if (tenant) list.push({ id: tenant.id, name: tenant.name, slug: tenant.slug, kind: 'current' });
        for (const w of data.workspaces) {
          if (!tenant || w.id !== tenant.id) list.push({ ...w, kind: 'child' });
        }
        setEntries(list);
      })
      .catch(() => { if (!cancelled) setEntries([]); });
    return () => { cancelled = true; };
  }, [user?.role, tenant]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!tenant || !entries || entries.length <= 1) return null;

  const handleSelect = async (id: string) => {
    if (id === tenant.id) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setError(null);
    try {
      await switchWorkspace(id);
      window.location.reload();
    } catch {
      setError('Failed to switch workspace');
      setSwitching(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={switching}
        aria-label="Switch workspace"
        className="flex h-9 items-center gap-2 rounded-xl border border-hairline bg-white/[0.03] px-3 text-sm text-foreground transition hover:border-border-strong hover:bg-white/[0.06] disabled:opacity-60"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[150px] truncate font-medium">{tenant.name}</span>
        {switching
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          : <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition', open && 'rotate-180')} />}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border border-hairline bg-background/95 p-1.5 shadow-xl backdrop-blur-xl">
          {error && <p className="px-2 py-1.5 text-xs text-red-500">{error}</p>}
          <div className="max-h-72 overflow-y-auto">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleSelect(entry.id)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-white/[0.05]"
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span className={cn('truncate font-medium', entry.kind === 'current' ? 'text-foreground' : 'text-muted-foreground')}>
                    {entry.name}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    {entry.kind === 'parent' ? 'Agency workspace' : entry.kind === 'child' ? 'Client workspace' : entry.slug}
                  </span>
                </span>
                {entry.kind === 'current' && <Check className="h-4 w-4 shrink-0 text-wine" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
