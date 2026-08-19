export type MdSourceFormat = 'html' | 'csv' | 'json' | 'xml' | 'rtf' | 'text' | 'markdown';

function collectText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  const el = node as HTMLElement;
  if (el.nodeName === 'BR') return '\n';
  if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.nodeName)) return '';
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
  let out = '';
  for (const child of Array.from(el.childNodes)) out += collectText(child);
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

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body ?? doc.documentElement;
  if (!body) return '';
  const output = Array.from(body.children)
    .map((el) => elementToMarkdown(el, 0))
    .filter(Boolean)
    .join('\n\n');
  return output.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function parseCsv(text: string): string[][] {
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

export function csvToMarkdown(text: string): string {
  const rows = parseCsv(text);
  if (rows.length === 0) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(Math.max(0, width - r.length)).fill('')];
  const cells = (r: string[]) => r.map((c) => c.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' '));
  const header = pad(rows[0]);
  const body = rows.slice(1).map((r) => `| ${cells(pad(r)).join(' | ')} |`);
  return [`| ${cells(header).join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...body].join('\n') + '\n';
}

function stringifyValue(value: unknown, depth: number): string {
  const indent = '  '.repeat(depth);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') {
    const lines = value.split('\n');
    if (lines.length > 1) {
      return ['```', ...lines, '```'].join('\n');
    }
    return value;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries
      .map(([k, v]) => {
        const child = stringifyValue(v, depth + 1);
        return `${indent}- **${k}**: ${child.startsWith('\n') ? child : child}`;
      })
      .join('\n');
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map((v, i) => `${indent}- ${stringifyValue(v, depth + 1)}`).join('\n');
  }
  return String(value);
}

export function jsonToMarkdown(json: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return `\`\`\`json\n${json.trim()}\n\`\`\``;
  }
  if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((o) => o && typeof o === 'object' && !Array.isArray(o))) {
    const keys = Array.from(new Set(parsed.flatMap((o) => Object.keys(o as Record<string, unknown>))));
    const cells = (r: Record<string, unknown>) => keys.map((k) => String(r[k] ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' '));
    const body = parsed.map((o) => `| ${cells(o as Record<string, unknown>).join(' | ')} |`);
    return [`| ${keys.join(' | ')} |`, `| ${keys.map(() => '---').join(' | ')} |`, ...body].join('\n') + '\n';
  }
  return `# JSON document\n\n${stringifyValue(parsed, 0)}\n`;
}

export function xmlToMarkdown(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return `\`\`\`xml\n${xml.trim()}\n\`\`\``;
  }
  const root = doc.documentElement;
  if (!root) return '';
  const lines: string[] = [];
  const walk = (node: Element, depth: number) => {
    const name = node.nodeName.replace(/^.*:/, '');
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    const children = Array.from(node.children);
    const pad = '  '.repeat(depth);
    const attrs = Array.from(node.attributes)
      .map((a) => `${a.name}="${a.value}"`)
      .join(' ');
    const label = attrs ? `${name} (${attrs})` : name;
    if (children.length === 0) {
      lines.push(`${pad}- **${label}**: ${text || '—'}`);
    } else {
      lines.push(`${pad}- **${label}**`);
      for (const child of children) walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return `# ${root.nodeName.replace(/^.*:/, '')}\n\n${lines.join('\n')}\n`;
}

function linkify(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"']+/g, (m) => `[${m}](${m})`);
}

export function textToMarkdown(text: string): string {
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

export function detectFormat(text: string): MdSourceFormat {
  const trimmed = text.trim();
  const startsWithTag = /^<!doctype|^<html|^<[a-z][a-z0-9-]*[^>]*>/i.test(trimmed);
  if (startsWithTag && /<(p|h[1-6]|div|table|ul|ol|section|article|body)/i.test(trimmed)) return 'html';
  if (startsWithTag && /<\?xml|^<[a-zA-Z]+[^>]*>[\s\S]*<\/[a-zA-Z]+>/.test(trimmed)) return 'xml';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { JSON.parse(trimmed); return 'json'; } catch { /* fallthrough */ }
  }
  const firstLines = trimmed.split('\n').slice(0, 5).filter((l) => l.includes(',') || l.includes(';'));
  if (firstLines.length >= 1 && firstLines[0].split(/,|;/).length >= 2 && !startsWithTag) return 'csv';
  if (trimmed.startsWith('{\\rtf')) return 'rtf';
  const looksLikeMarkdown = trimmed.split('\n').some((l) => /^#{1,6}\s/.test(l) || /^([-*]|\d+[.)])\s/.test(l) || /^\|.*\|$/.test(l));
  if (looksLikeMarkdown) return 'markdown';
  return 'text';
}

export function convertToMarkdown(source: string, format: MdSourceFormat): string {
  switch (format) {
    case 'html': return htmlToMarkdown(source);
    case 'csv': return csvToMarkdown(source);
    case 'json': return jsonToMarkdown(source);
    case 'xml': return xmlToMarkdown(source);
    case 'rtf': return textToMarkdown(source.replace(/\\par[d]?\b/g, '\n').replace(/\\tab\b/g, '\t').replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\[a-zA-Z]+-?\d* ?/g, '').replace(/[{}]/g, ''));
    case 'markdown': return source.replace(/\r\n/g, '\n').trimEnd() + '\n';
    default: return textToMarkdown(source);
  }
}

export const SAMPLE_INPUTS: Record<Exclude<MdSourceFormat, 'markdown' | 'rtf'>, string> = {
  html: `<!DOCTYPE html>
<html><body>
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
</body></html>`,
  csv: `name,role,company
Jane Smith,Head of Growth,Acme Corp
John Doe,VP Sales,Beta Inc
Alice Brown,Founder,Gamma Labs`,
  json: `[
  { "name": "Jane Smith", "role": "Head of Growth", "company": "Acme Corp" },
  { "name": "John Doe", "role": "VP Sales", "company": "Beta Inc" }
]`,
  xml: `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="1">
    <title>AI Lead Capture</title>
    <author>BurFlow</author>
  </book>
  <book id="2">
    <title>Chatbot ROI</title>
    <author>BurFlow</author>
  </book>
</catalog>`,
  text: `Welcome to Example

This is a sample paragraph. It shows how plain text becomes Markdown.

- First item
- Second item

A quoted insight worth keeping.`,
};