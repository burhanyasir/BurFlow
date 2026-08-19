import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import UrlToMarkdownTool from '../../components/tools/UrlToMarkdownTool';

const tool = getToolBySlug('google-docs-to-markdown')!;

function buildDemo(url: string): string {
  return `# ${new URL(url).hostname} — Google Doc

> Converted with BurFlow Google Docs to Markdown — demo output for a publicly shared document.

## Document title

This is a demo conversion of ${url}.

Google Docs headings map to Markdown headings, lists and tables are preserved, and inline formatting (bold, italic, links) carries over. The document outline becomes a clean set of headings.

## How to make your document readable

1. Open the document in Google Docs.
2. Click **Share** in the top-right.
3. Set access to “Anyone with the link can view”.
4. Paste that link above and convert.

> **Note:** Some documents block cross-origin browser access. For full drive-wide extraction with AI cleanup, [try BurFlow Free](/signup).
`;
}

export default function GoogleDocsToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert any public Google Doc to clean, structured Markdown — headings, tables, and lists preserved."
    >
      <UrlToMarkdownTool
        tool={tool}
        placeholder="https://docs.google.com/document/d/…"
        urlLabel="Google Docs URL"
        note={
          <>
            <p>
              Paste a link to a <span className="font-semibold text-[var(--color-neutral-700)]">public</span> Google
              Doc. The document is fetched and converted in your browser — if Google blocks cross-origin access, a
              demo conversion is shown instead.
            </p>
          </>
        }
        buildDemo={buildDemo}
      />
    </GenericToolWrapper>
  );
}