// Markdown-driven blog content engine.
// Articles live in `src/content/blog/*.md` with YAML frontmatter and are
// loaded at build time via import.meta.glob. The markdown renderer is
// dependency-free and HTML-escaping: article content can never inject
// raw HTML — every string is escaped before block/inline rendering.

export interface MarkdownArticle {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  keywords: string[];
  content: string;
  toolName?: string;
  toolPath?: string;
}

const markdownModules = import.meta.glob<string>('/src/content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// ── Frontmatter ────────────────────────────────────────────────────────────

function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data: Record<string, unknown> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const rawValue = line.slice(index + 1).trim();
    if (!key) continue;
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      data[key] = rawValue
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      data[key] = rawValue.slice(1, -1);
    } else {
      data[key] = rawValue;
    }
  }
  return { data, content: match[2]! };
}

// ── Markdown rendering ─────────────────────────────────────────────────────

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  const tokens: string[] = [];
  const protect = (html: string) => {
    const index = tokens.length;
    tokens.push(html);
    return `\u0000${index}\u0000`;
  };

  const out = text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, src: string) =>
      protect(`<img src="${src}" alt="${alt}" loading="lazy" />`)
    )
    .replace(/`([^`]+)`/g, (_, code: string) => protect(`<code>${code}</code>`))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      const external = /^https?:\/\//i.test(href);
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return protect(`<a href="${href}"${attrs}>${label}</a>`);
    })
    .replace(/\*\*([^*]+)\*\*/g, (_, bold: string) => protect(`<strong>${bold}</strong>`))
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, (_, prefix: string, italic: string) =>
      `${prefix}${protect(`<em>${italic}</em>`)}`
    );

  return out.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)] ?? '');
}

function renderBlock(block: string): string {
  const fence = block.match(/^```([\w-]*)\r?\n([\s\S]*?)\r?\n```$/);
  if (fence) return `<pre><code>${fence[2]}</code></pre>`;

  const heading = block.match(/^(#{1,6})\s+(.+)$/);
  if (heading) {
    const level = heading[1]!.length;
    return `<h${level}>${renderInline(heading[2]!)}</h${level}>`;
  }

  if (/^\s*(?:---+|\*\*\*+)\s*$/.test(block)) return '<hr />';

  if (/^>\s?/m.test(block)) {
    const inner = block
      .split(/\r?\n/)
      .map((line) => line.replace(/^>\s?/, ''))
      .join(' ');
    return `<blockquote>${renderInline(inner)}</blockquote>`;
  }

  const lines = block.split(/\r?\n/);
  if (lines.length > 0 && lines.every((line) => /^\s*[-*+]\s+/.test(line))) {
    return `<ul>${lines
      .map((line) => `<li>${renderInline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`)
      .join('')}</ul>`;
  }
  if (lines.length > 0 && lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
    return `<ol>${lines
      .map((line) => `<li>${renderInline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`)
      .join('')}</ol>`;
  }

  return `<p>${renderInline(block)}</p>`;
}

export function renderMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown);
  return escaped
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(renderBlock)
    .join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

// ── Loader ─────────────────────────────────────────────────────────────────

export function getMarkdownArticles(): MarkdownArticle[] {
  return Object.entries(markdownModules)
    .map(([path, raw]) => {
      const slug = path.split('/').pop()!.replace(/\.md$/, '');
      const { data, content } = parseFrontmatter(raw);
      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ''),
        date: String(data.date ?? ''),
        author: String(data.author ?? 'BurFlow Team'),
        category: String(data.category ?? 'Guide'),
        keywords: Array.isArray(data.keywords)
          ? data.keywords.map(String)
          : String(data.keywords ?? '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
        content: content.trim(),
        toolName: data.toolName ? String(data.toolName) : undefined,
        toolPath: data.toolPath ? String(data.toolPath) : undefined,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getMarkdownArticle(slug: string): MarkdownArticle | undefined {
  return getMarkdownArticles().find((article) => article.slug === slug);
}