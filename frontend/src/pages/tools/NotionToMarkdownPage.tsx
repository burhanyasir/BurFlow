import { getToolBySlug } from '../../data/toolsData';
import { GenericToolWrapper } from './GenericToolWrapper';
import UrlToMarkdownTool from '../../components/tools/UrlToMarkdownTool';

const tool = getToolBySlug('notion-to-markdown')!;

function buildDemo(url: string): string {
  return `# ${new URL(url).hostname} — Notion Page

> Converted with BurFlow Notion to Markdown — demo output for a publicly shared page.

## Page title

This is a demo conversion of ${url}.

Notion pages convert heading blocks to headings, bulleted and numbered lists to Markdown lists, and callout blocks to blockquotes. Checkboxes become \`- [ ]\` task items and code blocks are fenced with their language tag.

## How to make your page readable

1. Open the page in Notion.
2. Click **Share** in the top-right.
3. Set the link access to “Anyone with the link”.
4. Paste that link above and convert.

> **Note:** Some Notion pages block cross-origin browser access. For full workspace extraction with AI cleanup, [try BurFlow Free](/signup).
`;
}

export default function NotionToMarkdownPage() {
  return (
    <GenericToolWrapper
      tool={tool}
      subtitle="Convert any public Notion page to clean, structured Markdown — headings, lists, callouts, and code blocks preserved."
    >
      <UrlToMarkdownTool
        tool={tool}
        placeholder="https://your-workspace.notion.site/page-id"
        urlLabel="Notion page URL"
        note={
          <>
            <p>
              Paste a link to a <span className="font-semibold text-[var(--color-neutral-700)]">public</span> Notion
              page. The page content is fetched and converted in your browser — if the site blocks cross-origin
              access, a demo conversion is shown instead.
            </p>
          </>
        }
        buildDemo={buildDemo}
      />
    </GenericToolWrapper>
  );
}