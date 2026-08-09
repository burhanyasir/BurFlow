import { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { fetchWithAuth } from '../../../lib/api-client';
import { useToast } from '../../ui/Toast';
import { cn } from '../../../utils/cn';
import { Globe, Loader2 } from 'lucide-react';
import type { WebsiteScan } from './types';

interface WebsiteScannerModalProps {
  open: boolean;
  onClose: () => void;
  onStarted: (scan: WebsiteScan) => void;
}

export function WebsiteScannerModal({ open, onClose, onStarted }: WebsiteScannerModalProps) {
  const { addToast } = useToast();
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(3);
  const [mode, setMode] = useState<'discover' | 'update'>('discover');
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      addToast('Enter a website URL', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/knowledge/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, maxDepth: depth, crawlMode: mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Failed to start scan', 'error');
        return;
      }
      addToast('Website scan started', 'success');
      onStarted(data.scan);
      setUrl('');
      onClose();
    } catch {
      addToast('Network error while starting scan', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Scan a Website" description="Crawl your site and index its pages into the knowledge base" size="lg">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Website URL</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-neutral-400)]" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="https://your-site.com"
              className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-white pl-9 pr-3 py-2 text-sm text-[var(--color-neutral-900)] placeholder:text-[var(--color-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)]"
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--color-neutral-500)]">Local/private network addresses are not allowed.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Crawl depth</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm text-[var(--color-neutral-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30"
            >
              {[1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d} {d === 1 ? 'level' : 'levels'} deep</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1.5">Scan mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'discover' | 'update')}
              className="w-full rounded-lg border border-[var(--color-neutral-200)] bg-white px-3 py-2 text-sm text-[var(--color-neutral-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30"
            >
              <option value="discover">Discover new pages</option>
              <option value="update">Update existing pages only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button onClick={onClose} className="rounded-lg border border-[var(--color-neutral-200)] px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={submitting}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium text-white bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2',
            )}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Start Scan
          </button>
        </div>
      </div>
    </Modal>
  );
}
