import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../../../components/ui/Button';

interface Props {
  agentId: string;
  widgetToken: string | null;
  snippet: string | null;
  onGenerateToken: () => Promise<string>;
  onUpdateConfig: () => Promise<void>;
  onGetSnippet: () => Promise<string>;
}

const TABS = [
  { id: 'vanilla', label: 'HTML' },
  { id: 'react', label: 'React / Next.js' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'webflow', label: 'Webflow' },
] as const;

function buildSnippet(tabId: string, agentId: string, token: string): string {
  const base = import.meta.env.VITE_WIDGET_CDN_URL || `https://widget.conversationengine.ai/chatbot.js`;
  const attr = `data-agent-id="${agentId}" data-token="${token}" data-primary-color="#A8244B" data-position="right"`;
  switch (tabId) {
    case 'vanilla':
      return `<!-- Conversation Engine Chatbot -->\n<script src="${base}" ${attr}></script>`;
    case 'react':
      return `// Install: npm install @conversationengine/react\nimport { ChatWidget } from '@conversationengine/react';\n\nfunction App() {\n  return <ChatWidget agentId="${agentId}" token="${token}"/>;\n}`;
    case 'wordpress':
      return `// Add to theme's functions.php:\nadd_action('wp_footer', function() {\n  echo '<script src="${base}" ${attr}></script>';\n});`;
    case 'shopify':
      return `// In theme.liquid before </body>:\n<script src="${base}" ${attr}></script>`;
    case 'webflow':
      return `// Project Settings → Custom Code → Footer Code:\n<script src="${base}" ${attr}></script>`;
    default:
      return `<!-- Conversation Engine Chatbot -->\n<script src="${base}" ${attr}></script>`;
  }
}

export function Step6Embed({ agentId, widgetToken, snippet, onGenerateToken, onUpdateConfig, onGetSnippet }: Props) {
  const [activeTab, setActiveTab] = useState('vanilla');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    setError(null);
    setGenerating(true);
    try {
      if (!widgetToken) await onGenerateToken();
      await onUpdateConfig();
      if (!snippet) {
        try {
          await onGetSnippet();
        } catch {}
      }
      setActiveTab('vanilla');
    } catch (err: any) {
      setError(err.message || 'Failed to generate widget. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const displaySnippet = snippet || buildSnippet(activeTab, agentId, widgetToken || 'YOUR_TOKEN');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displaySnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!agentId) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto py-4">
        <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Embed Code</h2>
        <p className="text-sm text-[var(--color-neutral-500)] mb-8">First create your workspace to generate the embed code.</p>
        <div className="bg-[var(--color-warning-50)] border border-[var(--color-warning-100)] rounded-xl p-6 text-center">
          <p className="text-sm text-[var(--color-warning-700)]">Please complete the Workspace step first, then return here to get your embed code.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto py-4">
      <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] mb-2">Install on Your Website</h2>
      <p className="text-sm text-[var(--color-neutral-500)] mb-8">Add the chatbot to your website with a single snippet of code. Choose your platform below.</p>

      {!widgetToken && !snippet && (
        <div className="bg-[var(--color-accent-50)] border border-[var(--color-accent-100)] rounded-xl p-6 mb-6 text-center">
          <p className="text-sm text-[var(--color-accent-700)] mb-3">Generate your widget code to get started.</p>
          <Button onClick={handleSetup} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Widget Code'}
          </Button>
        </div>
      )}

      {(widgetToken || snippet) && (
        <>
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-[var(--color-accent-600)] text-white' : 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-200)]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--color-neutral-200)] overflow-hidden bg-[#1a1a2e] mb-6">
            <div className="flex items-center justify-between px-4 py-2 bg-[#16162a] border-b border-[#2a2a4a]">
              <span className="text-xs text-[var(--color-neutral-400)]">{activeTab === 'vanilla' ? 'HTML' : activeTab === 'react' ? 'TSX' : 'Code'}</span>
              <div className="flex items-center gap-2">
                <button onClick={handleSetup} className="text-xs text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-200)]">
                  Regenerate
                </button>
                <Button size="sm" variant="secondary" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            <pre className="p-4 text-sm text-[#e4e4f0] overflow-x-auto"><code>{displaySnippet}</code></pre>
          </div>

          <div className="bg-[var(--color-neutral-50)] rounded-xl p-4 border border-[var(--color-neutral-100)]">
            <h4 className="text-sm font-semibold text-[var(--color-neutral-700)] mb-2">Installation Instructions</h4>
            <ol className="space-y-2 text-xs text-[var(--color-neutral-500)] list-decimal list-inside">
              <li>Copy the code snippet above</li>
              <li>Paste it just before the closing <code className="text-[var(--color-accent-600)] bg-[var(--color-accent-50)] px-1 rounded">&lt;/body&gt;</code> tag on your website</li>
              <li>Save your changes and reload your website</li>
              <li>Return to the next step to verify the installation</li>
            </ol>
          </div>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--color-error-50)] border border-[var(--color-error-100)] text-sm text-[var(--color-error-700)]">
          {error}
        </div>
      )}
    </motion.div>
  );
}
