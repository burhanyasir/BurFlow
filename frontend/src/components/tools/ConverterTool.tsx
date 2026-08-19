import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Copy, FileUp, Wand2 } from 'lucide-react';
import type { ToolDefinition } from '../../data/toolsData';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';
import { convertToMarkdown, detectFormat, SAMPLE_INPUTS, type MdSourceFormat } from '../../lib/tools/markdown';
import { extractTextFromFile } from '../../lib/tools/extract';

interface ConverterToolProps {
  tool: ToolDefinition;
  /** Which formats this tool accepts; null = auto-detect all. */
  acceptFormats?: MdSourceFormat[];
  accept?: string;
  /** Show the paste textarea (false = file upload only). */
  allowPaste?: boolean;
  /** Show the "load sample" button (html/csv/json/xml only). */
  allowSample?: boolean;
  placeholder?: string;
  sampleFormat?: keyof typeof SAMPLE_INPUTS;
  /** Extra note shown under the input. */
  note?: ReactNode;
  resultLabel?: string;
}

function highlightLine(line: string, key: number): ReactNode {
  const classes = {
    heading: 'font-bold text-[var(--color-accent-700)]',
    code: 'font-semibold text-[var(--color-warning-600)]',
    link: 'text-[var(--color-accent-600)] underline',
    table: 'text-[var(--color-neutral-600)]',
    quote: 'italic text-[var(--color-neutral-400)]',
    bullet: 'text-[var(--color-accent-600)]',
  };
  if (/^```/.test(line)) return <span key={key} className={classes.code}>{line}</span>;
  if (/^#{1,6}\s/.test(line)) return <span key={key} className={classes.heading}>{line}</span>;
  if (/^\s*([-*]|\d+[.)])\s/.test(line)) {
    const marker = line.match(/^(\s*[-*]|\s*\d+[.)])\s+/)?.[0] ?? '';
    const rest = line.slice(marker.length);
    return <span key={key}><span className={classes.bullet}>{marker}</span>{rest}</span>;
  }
  if (/^\|.*\|$/.test(line)) return <span key={key} className={classes.table}>{line}</span>;
  if (/^>\s?/.test(line)) return <span key={key} className={classes.quote}>{line}</span>;
  const linkSplit = line.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <span key={key}>
      {linkSplit.map((part, i) => {
        const isLink = /^\[[^\]]+\]\([^)]+\)$/.test(part);
        return isLink ? <span key={i} className={classes.link}>{part}</span> : part;
      })}
    </span>
  );
}

export default function ConverterTool({
  tool, acceptFormats, accept = '*', allowPaste = true, allowSample = true,
  placeholder, sampleFormat = 'html', note, resultLabel = 'Markdown',
}: ConverterToolProps) {
  const { addToast } = useToast();
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const [output, setOutput] = useState('');
  const [format, setFormat] = useState<MdSourceFormat | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const allowed = acceptFormats ? new Set(acceptFormats) : null;

  const convertText = (text: string, detected: MdSourceFormat) => {
    setOutput(convertToMarkdown(text, detected));
    setFormat(detected);
    return detected;
  };

  const handleConvert = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = source.trim();
    if (trimmed.length === 0) {
      addToast('Paste a document or upload a file first', 'error');
      return;
    }
    const detected = detectFormat(trimmed);
    if (allowed && !allowed.has(detected)) {
      addToast(`This tool converts ${Array.from(allowed).map((f) => f.toUpperCase()).join(', ')} — detected ${detected.toUpperCase()} instead`, 'error');
      return;
    }
    convertText(trimmed, detected);
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'convert_document', format: detected });
    addToast(`Detected ${detected.toUpperCase()} → converted to Markdown`, 'success');
  };

  const handleFile = async (file: File) => {
    try {
      const { text, format: fileFormat } = await extractTextFromFile(file);
      setFileName(file.name);
      if (fileFormat === 'pdf' || fileFormat === 'docx' || fileFormat === 'rtf') {
        setOutput(convertToMarkdown(text, fileFormat === 'rtf' ? 'rtf' : 'text'));
        setFormat(fileFormat === 'rtf' ? 'rtf' : 'text');
        track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'upload_document', format: fileFormat, file_size: file.size });
        addToast(`Converted ${file.name} to Markdown`, 'success');
        return;
      }
      const detected = detectFormat(text);
      if (allowed && !allowed.has(detected)) {
        addToast(`This tool converts ${Array.from(allowed).map((f) => f.toUpperCase()).join(', ')} — ${file.name} looks like ${detected.toUpperCase()}`, 'error');
        return;
      }
      setSource(text);
      convertText(text, detected);
      track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'upload_document', format: detected, file_size: file.size });
      addToast(`Loaded ${file.name} — detected ${detected.toUpperCase()}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Could not read that file', 'error');
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'markdown' });
      addToast(`${resultLabel} copied to clipboard`, 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  const lineCount = output.length > 0 ? output.split('\n').length : 0;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      {/* Source */}
      <div className="space-y-5">
        <form onSubmit={handleConvert} className="space-y-4">
          {allowPaste && (
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="conv-source" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  Paste your document
                </label>
                {allowSample && (
                  <button
                    type="button"
                    onClick={() => setSource(SAMPLE_INPUTS[sampleFormat ?? 'html'])}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
                  >
                    Load sample
                  </button>
                )}
              </div>
              <textarea
                id="conv-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={placeholder ?? 'Paste HTML, plain text, or CSV here…'}
                rows={10}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {allowPaste && (
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
              >
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                Convert to Markdown
              </button>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] px-5 py-3 text-sm font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)]"
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Upload file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
            />
          </div>
          {fileName && (
            <p className="text-xs text-[var(--color-neutral-500)]">
              Uploaded: <span className="font-semibold">{fileName}</span>
              {format && <span className="text-[var(--color-neutral-400)]"> · converted as {format.toUpperCase()}</span>}
            </p>
          )}
        </form>
        {note ?? (
          <p className="text-xs text-[var(--color-neutral-400)]">
            Conversion runs entirely in your browser — nothing is uploaded to a server.
          </p>
        )}
      </div>

      {/* Output */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">{resultLabel} preview</h2>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!output}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)] disabled:opacity-50"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy {resultLabel}
          </button>
        </div>
        <div className="mt-3 min-h-[20rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
          {output ? (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-neutral-700)]">
              {output.split('\n').map((line, i) => highlightLine(line, i))}
            </pre>
          ) : (
            <p className="text-sm text-[var(--color-neutral-400)]">
              Your {resultLabel.toLowerCase()} will appear here. Paste a document or upload a file, then click “Convert to Markdown”.
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
          {lineCount} lines · {output.length.toLocaleString()} characters
        </p>
      </div>
    </div>
  );
}