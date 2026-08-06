import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../../../../components/ui/Input';
import { Textarea } from '../../../../components/ui/Textarea';
import { Button } from '../../../../components/ui/Button';
import { Progress } from '../../../../components/ui/Progress';
import type { KnowledgeFile } from '../onboarding-context';

interface Props {
  data: { files: KnowledgeFile[]; websites: string[]; faqs: string; uploaded: boolean; knowledgeBaseId: string | null };
  onRemoveFile: (name: string) => void;
  onAddWebsite: (url: string) => void;
  onRemoveWebsite: (url: string) => void;
  onUpdateFaqs: (faqs: string) => void;
  onUploadFile: (file: File) => Promise<void>;
  onSubmitFaqs: () => Promise<void>;
  onCrawlWebsites: () => Promise<Array<{ url: string; pagesCrawled: number; warning?: string | null }>>;
}

export function Step3Knowledge({
  data, onRemoveFile,
  onAddWebsite, onRemoveWebsite, onUpdateFaqs,
  onUploadFile, onSubmitFaqs, onCrawlWebsites,
}: Props) {
  const [websiteInput, setWebsiteInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [crawlSuccess, setCrawlSuccess] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      await onUploadFile(files[i]);
    }
    setUploading(false);
  };

  const handleAddWebsite = () => {
    const url = websiteInput.trim();
    if (url && !data.websites.includes(url)) {
      onAddWebsite(url);
      setWebsiteInput('');
    }
  };

  const handleSubmitFaqs = async () => {
    if (!data.faqs.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitFaqs();
    } catch {}
    setSubmitting(false);
  };

  const handleCrawlWebsites = async () => {
    if (data.websites.length === 0) return;
    setCrawling(true);
    setScanError(null);
    setCrawlSuccess(null);
    try {
      const results = await onCrawlWebsites();
      const totalPages = results.reduce((sum, r) => sum + r.pagesCrawled, 0);
      const warnings = results.filter(r => r.warning).map(r => r.warning);
      if (totalPages > 0) {
        setCrawlSuccess(`Successfully imported ${totalPages} page(s) from ${results.length} website(s). Your chatbot is now learning from your content.`);
      } else if (warnings.length > 0) {
        setScanError(`Import completed but no readable content was found: ${warnings[0]}. You can still proceed — your chatbot will use basic setup.`);
      } else {
        setCrawlSuccess('Website import complete. Your chatbot will use basic setup for now.');
      }
    } catch (error: any) {
      console.error('Website crawl failed:', error);
      const msg = error?.message || 'Website scan failed. Please try again or contact support if the issue persists.';
      setScanError(msg);
    } finally {
      setCrawling(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-4">
      <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Start with your website</h2>
      <p className="text-sm text-[var(--color-neutral-500)] mb-8">Your website is the strongest source of truth. Use it as the main foundation, then add documents only when you want richer support context.</p>

      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-neutral-700)] mb-3">Supporting documents (optional)</h3>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-50)]' : 'border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-8 h-8 mx-auto mb-3 text-[var(--color-neutral-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-[var(--color-neutral-600)] mb-1">Optional: add supporting documents</p>
            <p className="text-xs text-[var(--color-neutral-400)]">Helpful for pricing sheets, service notes, or extra FAQ context (PDF, DOCX, TXT, Markdown)</p>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc,.txt,.md,.markdown" className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>

          {data.files.length > 0 && (
            <div className="mt-4 space-y-2">
              {data.files.map((f) => (
                <div key={f.id || f.name} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)]">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${f.status === 'error' ? 'bg-[var(--color-error-500)]' : f.status === 'ready' ? 'bg-[var(--color-success-500)]' : 'bg-[var(--color-accent-500)]'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--color-neutral-800)] truncate">{f.name}</p>
                      <p className="text-xs text-[var(--color-neutral-400)]">{(f.size / 1024).toFixed(0)} KB</p>
                    </div>
                    {f.status === 'uploading' && (
                      <div className="w-20">
                        <Progress value={f.progress} size="sm" />
                      </div>
                    )}
                    {f.status === 'error' && (
                      <span className="text-xs text-[var(--color-error-500)]">{f.error || 'Failed'}</span>
                    )}
                  </div>
                  {(f.status === 'pending' || f.status === 'error') && (
                    <button onClick={() => onRemoveFile(f.name)} className="text-xs text-[var(--color-neutral-400)] hover:text-[var(--color-error-500)] shrink-0 ml-2">Remove</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="mt-3">
              <Progress value={-1} size="sm" />
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--color-neutral-700)] mb-3">Primary website scan</h3>
          <div className="flex gap-2">
            <Input placeholder="https://example.com/page" value={websiteInput} onChange={e => setWebsiteInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddWebsite(); }} className="flex-1" />
            <Button size="sm" onClick={handleAddWebsite} disabled={!websiteInput.trim()}>Add</Button>
          </div>
          {data.websites.length > 0 && (
            <div className="mt-3 space-y-1">
              {data.websites.map((url) => (
                <div key={url} className="flex items-center justify-between text-sm py-1.5">
                  <span className="text-[var(--color-neutral-700)] truncate">{url}</span>
                  <button onClick={() => onRemoveWebsite(url)} className="text-xs text-[var(--color-neutral-400)] hover:text-[var(--color-error-500)] shrink-0 ml-2">Remove</button>
                </div>
              ))}
              <Button size="sm" variant="secondary" onClick={handleCrawlWebsites} disabled={crawling} className="mt-2">
                {crawling ? 'Importing…' : 'Import Websites Now'}
              </Button>
            </div>
          )}
          {scanError && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {scanError}
            </div>
          )}
          {crawlSuccess && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              {crawlSuccess}
            </div>
          )}
          <p className="text-xs text-[var(--color-neutral-400)] mt-1">This is the fastest way to teach BurFlow about your products, services, pricing, and common buyer questions.</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--color-neutral-700)] mb-3">Optional FAQs</h3>
          <Textarea
            placeholder="Q: What are your business hours?\nA: We're open Mon-Fri 9am-5pm EST.\n\nQ: Do you offer refunds?\nA: Yes, we offer a 30-day money-back guarantee."
            rows={6}
            value={data.faqs}
            onChange={e => onUpdateFaqs(e.target.value)}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-[var(--color-neutral-400)]">One Q&A pair per paragraph. Format: Q: ... A: ...</p>
            <Button size="sm" variant="secondary" onClick={handleSubmitFaqs} disabled={submitting || !data.faqs.trim()}>
              {submitting ? 'Saving…' : 'Save FAQs'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
