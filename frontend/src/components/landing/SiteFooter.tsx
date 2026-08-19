import { Link } from 'react-router-dom';
import { Logo } from './primitives';

const footerColumns = [
  {
    h: 'Product',
    l: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Changelog', to: '/changelog' },
    ],
  },
  {
    h: 'Free Tools',
    l: [
      { label: 'All Free Tools', to: '/free-tools' },
      { label: 'Lead Leak Calculator', to: '/tools/lead-leak-calculator' },
      { label: 'Chatbot ROI Calculator', to: '/tools/chatbot-roi-calculator' },
      { label: 'AI Prompt Generator', to: '/tools/ai-prompt-generator' },
      { label: 'Document to Markdown', to: '/tools/document-to-markdown' },
    ],
  },
  {
    h: 'Platform',
    l: [
      { label: 'API docs', to: '/docs/api' },
      { label: 'Widget guide', to: '/docs/widget' },
      { label: 'Status', to: '/status' },
    ],
  },
  {
    h: 'Company',
    l: [
      { label: 'About', to: '/about' },
      { label: 'Contact sales', to: '/contact' },
      { label: 'Blog', to: '/blog' },
      { label: 'Compare', to: '/compare' },
      { label: 'Alternatives', to: '/alternatives' },
      { label: 'Case Studies', to: '/case-studies' },
    ],
  },
  {
    h: 'Resources',
    l: [
      { label: 'How grounding works', to: '/methodology' },
      { label: 'Trust center', to: '/trust' },
      { label: 'Privacy policy', to: '/privacy' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline px-6 py-14">
      <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-[1.4fr_repeat(5,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            AI website sales agents that turn traffic into qualified pipeline.
          </p>
          <div className="mt-5 flex gap-2">
            {['SOC 2', 'GDPR', 'HIPAA'].map((b) => (
              <span
                key={b}
                className="rounded-full border border-hairline px-3 py-1 text-xs text-muted-foreground"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
        {footerColumns.map((c) => (
          <div key={c.h}>
            <p className="text-sm font-semibold">{c.h}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {c.l.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-12 w-full max-w-6xl text-sm text-muted-foreground">
        © 2026 BurFlow. All rights reserved.
      </p>
    </footer>
  );
}
