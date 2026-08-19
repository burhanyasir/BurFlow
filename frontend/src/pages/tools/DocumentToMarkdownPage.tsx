import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Copy, FileUp, Wand2 } from 'lucide-react';
import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import { track } from '../../lib/analytics';
import { useToast } from '../../components/ui/Toast';

const tool = getToolBySlug('document-to-markdown')!;

/* ── Converters ───────────────────────────────────────────── */

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function collectText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  const el = node as HTMLElement;
  if (el.nodeName === 'BR') return '\n';
  if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.nodeName)) return '';
  let out = '';
  if (el.nodeName === 'A') {
    const href = el.getAttribute('href');
    const label = collectTextNodes(el).trim();
    if (href && label) return `[${label}](${href})`;
    return label;
  }
  if (['STRONG', 'B'].includes(el.nodeName)) return `**${collectTextNodes(el)}**`;
  if (['EM', 'I'].includes(el.nodeName)) return `*${collectTextNodes(el)}*`;
  if (el.nodeName === 'CODE' && !el.parentElement?.matches('pre')) return `\`${collectTextNodes(el)}\``;
  if (el.nodeName === 'IMG') {
    const alt = el.getAttribute('alt') ?? '';
    const src = el.getAttribute('src') ?? '';
    return src ? `![${alt}](${src})` : '';
  }
  for (const child of Array.from(el.childNodes)) {
    out += collectText(child);
  }
  return out;
}

function collectTextNodes(node: Node): string {
  const el = node as HTMLElement;
  let out = '';
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? '';
    else if (child.nodeType === Node.ELEMENT_NODE) {
      const name = (child as HTMLElement).nodeName;
      if (['SCRIPT', 'STYLE'].includes(name)) continue;
      if (name === 'BR') { out += '\n'; continue; }
      out += collectText(child);
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function tableToMarkdown(table: Element, depth: number): string {
  const rows: string[][] = [];
  table.querySelectorAll('tr').forEach((tr) => {
    const cells: string[] = [];
    tr.querySelectorAll('th, td').forEach((cell) => {
      cells.push(collectTextNodes(cell).replace(/\|/g, '\\|'));
    });
    rows.push(cells);
  });
  if (rows.length === 0) return '';
  const header = rows[0];
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(Math.max(0, width - r.length)).fill('')];
  const body = rows.slice(1).map((r) => `| ${pad(r).join(' | ')} |`);
  const lines = [`| ${pad(header).join(' | ')} |`, `| ${pad(header).map(() => '---').join(' | ')} |`, ...body];
  return lines.join('\n');
}

function elementToMarkdown(el: Element, depth: number): string {
  const tag = el.nodeName.toLowerCase();
  const pad = '  '.repeat(depth);
  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
      const level = Number(tag[1]);
      return `${'#'.repeat(level)} ${collectTextNodes(el)}`;
    }
    case 'p': return collectTextNodes(el) || '';
    case 'a': {
      const href = el.getAttribute('href');
      const label = collectTextNodes(el);
      return href ? `[${label || href}](${href})` : label;
    }
    case 'ul': case 'ol': {
      const ordered = tag === 'ol';
      const items = Array.from(el.children)
        .filter((c) => c.nodeName === 'LI')
        .map((li, i) => {
          const marker = ordered ? `${i + 1}.` : '-';
          const text = collectTextNodes(li);
          const nested = Array.from(li.children)
            .filter((c) => ['UL', 'OL'].includes(c.nodeName))
            .map((n) => elementToMarkdown(n, depth + 1))
            .join('\n');
          return `${pad}${marker} ${text}${nested ? `\n${nested}` : ''}`;
        });
      return items.join('\n');
    }
    case 'li': return '';
    case 'blockquote': return `> ${collectTextNodes(el)}`;
    case 'pre': {
      const code = (el.textContent ?? '').replace(/\n$/, '');
      return `\`\`\`\n${code}\n\`\`\``;
    }
    case 'code': return `\`${collectTextNodes(el)}\``;
    case 'hr': return '---';
    case 'img': {
      const alt = el.getAttribute('alt') ?? '';
      const src = el.getAttribute('src') ?? '';
      return src ? `![${alt}](${src})` : '';
    }
    case 'table': return tableToMarkdown(el, depth);
    case 'br': return '';
    case 'div': case 'section': case 'article': case 'main': case 'header': case 'footer': case 'body': case 'span': {
      return Array.from(el.children)
        .map((c) => elementToMarkdown(c, depth))
        .filter(Boolean)
        .join('\n\n');
    }
    default: {
      const text = collectTextNodes(el);
      if (text.length === 0 && el.children.length > 0) {
        return Array.from(el.children)
          .map((c) => elementToMarkdown(c, depth))
          .filter(Boolean)
          .join('\n\n');
      }
      return text;
    }
  }
}

function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body ?? doc.documentElement;
  if (!body) return '';
  const output = Array.from(body.children)
    .map((el) => elementToMarkdown(el, 0))
    .filter(Boolean)
    .join('\n\n');
  return output.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      cell = '';
      if (row.some((r) => r.length > 0) || row.length > 1) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((r) => r.length > 0)) rows.push(row);
  return rows.filter((r) => !r.every((c) => c.length === 0));
}

function csvToMarkdown(text: string): string {
  const rows = parseCsv(text);
  if (rows.length === 0) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(Math.max(0, width - r.length)).fill('')];
  const cells = (r: string[]) => r.map((c) => c.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' '));
  const header = pad(rows[0]);
  const body = rows.slice(1).map((r) => `| ${cells(pad(r)).join(' | ')} |`);
  return [`| ${cells(header).join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...body].join('\n') + '\n';
}

function linkify(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"']+/g, (m) => `[${m}](${m})`);
}

function textToMarkdown(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd());
  const looksLikeMarkdown = lines.some((l) => /^#{1,6}\s/.test(l) || /^([-*]|\d+[.)])\s/.test(l) || /^\|.*\|$/.test(l));
  if (looksLikeMarkdown) return text.replace(/\r\n/g, '\n').trimEnd() + '\n';
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim().length === 0) {
      if (current.length > 0) {
        blocks.push(current.map(linkify).join('  \n'));
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.map(linkify).join('  \n'));
  return blocks.join('\n\n') + '\n';
}

type SourceFormat = 'html' | 'csv' | 'text';

function detectFormat(text: string): SourceFormat {
  const trimmed = text.trim();
  const startsWithTag = /^<!doctype|^<html|^<[a-z][a-z0-9-]*[^>]*>/i.test(trimmed);
  if (startsWithTag && /<(p|h[1-6]|div|table|ul|ol|section|article|body)/i.test(trimmed)) return 'html';
  const firstLines = trimmed.split('\n').slice(0, 5).filter((l) => l.includes(',') || l.includes(';'));
  if (firstLines.length >= 1 && firstLines[0].split(/,|;/).length >= 2 && !startsWithTag) return 'csv';
  return 'text';
}

function convert(source: string, format: SourceFormat): string {
  switch (format) {
    case 'html': return htmlToMarkdown(source);
    case 'csv': return csvToMarkdown(source);
    default: return textToMarkdown(source);
  }
}

/* ── Lightweight syntax highlighting for the preview ──────── */

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
    const [head, ...rest] = line.split(/(?<=^\s*([-*]|\d+[.)])\s)/);
    return <span key={key}><span className={classes.bullet}>{head}</span>{rest.join('')}</span>;
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

/* ── Page ─────────────────────────────────────────────────── */

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<body>
  <h1>Welcome to Acme Corp</h1>
  <p>We build <strong>AI-powered</strong> tools for <em>growing</em> SaaS teams. See our <a href="https://example.com/pricing">pricing page</a>.</p>
  <h2>Why choose us</h2>
  <ul>
    <li>Deploy in 5 minutes</li>
    <li>No credit card required</li>
    <li>99.9% uptime</li>
  </ul>
  <table>
    <tr><th>Plan</th><th>Price</th></tr>
    <tr><td>Free</td><td>$0</td></tr>
    <tr><td>Pro</td><td>$49</td></tr>
  </table>
</body>
</html>`;

export default function DocumentToMarkdownPage() {
  const { addToast } = useToast();
  const [source, setSource] = useState('');
  const [fileName, setFileName] = useState('');
  const [output, setOutput] = useState('');
  const [format, setFormat] = useState<SourceFormat | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleConvert = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = source.trim();
    if (trimmed.length === 0) {
      addToast('Paste a document or upload a file first', 'error');
      return;
    }
    const detected = detectFormat(trimmed);
    setFormat(detected);
    setOutput(convert(trimmed, detected));
    track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'convert_document', format: detected });
    addToast(detected === 'csv' ? 'Detected CSV → converted to a Markdown table' : `Detected ${detected.toUpperCase()} → converted to Markdown`, 'success');
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setSource(text);
      setFileName(file.name);
      const detected = detectFormat(text);
      setFormat(detected);
      setOutput(convert(text, detected));
      track('tool_used', { tool_id: tool.slug, category: tool.category, action: 'upload_document', format: detected, file_size: file.size });
      addToast(`Loaded ${file.name} — detected ${detected.toUpperCase()}`, 'success');
    };
    reader.readAsText(file);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      track('tool_result_copied', { tool_id: tool.slug, category: tool.category, result: 'markdown' });
      addToast('Markdown copied to clipboard', 'success');
    } catch {
      addToast('Could not copy. Please copy manually.', 'error');
    }
  };

  const lineCount = output.length > 0 ? output.split('\n').length : 0;

  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert pasted HTML, plain text, or CSV — or an uploaded file — into clean, structured Markdown with a highlighted preview."
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Source */}
        <div className="space-y-5">
          <form onSubmit={handleConvert} className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="doc-source" className="text-sm font-semibold text-[var(--color-neutral-900)]">
                  Paste HTML / Text / CSV
                </label>
                <button
                  type="button"
                  onClick={() => setSource(SAMPLE_HTML)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)]"
                >
                  Load sample
                </button>
              </div>
              <textarea
                id="doc-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Paste HTML, plain text, or CSV here…"
                rows={10}
                spellCheck={false}
                className="mt-2 w-full rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 px-4 py-3 font-mono text-xs leading-relaxed text-[var(--color-neutral-900)] placeholder-[var(--color-neutral-300)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-600)]/30 focus:border-[var(--color-accent-600)] transition"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent-600)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[var(--color-accent-700)]"
              >
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                Convert to Markdown
              </button>
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
                accept=".html,.htm,.txt,.csv,.md,text/plain,text/csv,text/html"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
            </div>
            {fileName && (
              <p className="text-xs text-[var(--color-neutral-500)]">
                Uploaded: <span className="font-semibold">{fileName}</span>
                {format && <span className="text-[var(--color-neutral-400)]"> · detected {format.toUpperCase()}</span>}
              </p>
            )}
          </form>
          <p className="text-xs text-[var(--color-neutral-400)]">
            Conversion runs entirely in your browser — nothing is uploaded to a server.
          </p>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-neutral-900)]">Markdown preview</h2>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!output}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-neutral-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-neutral-600)] transition-colors hover:border-[var(--color-accent-600)]/40 hover:text-[var(--color-accent-700)] disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy Markdown
            </button>
          </div>
          <div className="mt-3 min-h-[20rem] rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)]/50 p-5">
            {output ? (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-neutral-700)]">
                {output.split('\n').map((line, i) => highlightLine(line, i))}
              </pre>
            ) : (
              <p className="text-sm text-[var(--color-neutral-400)]">
                Your Markdown will appear here with syntax highlighting. Paste a document or upload a file, then click “Convert to Markdown”.
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--color-neutral-400)]">
            {lineCount} lines · {output.length.toLocaleString()} characters
          </p>
        </div>
      </div>
    </GenericToolWrapper>
  );
}