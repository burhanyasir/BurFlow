import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionContainer } from '../../components/ui/SectionContainer';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { Seo } from '../../components/seo/Seo';

const PLATFORMS = [
  {
    name: 'HTML Snippet',
    description: 'Copy and paste the embed script into any HTML page.',
    code: `<script>
  window.CE_WIDGET_CONFIG = {
    apiKey: "your_api_key",
    position: "bottom-right",
    primaryColor: "#8A1538",
    greeting: "Hi! How can I help?",
    suggestions: ["What plans do you offer?", "How does grounding work?"]
  };
</script>
<script src="https://cdn.conversationengine.com/widget.js" async defer></script>`,
  },
  {
    name: 'React / Next.js',
    description: 'Install the npm package and render the Widget component.',
    code: `import { ConversationWidget } from "@conversation-engine/react-widget";

export default function App() {
  return (
    <ConversationWidget
      apiKey="your_api_key"
      position="bottom-right"
      primaryColor="#8A1538"
      greeting="Hi! How can I help?"
    />
  );
}`,
  },
  {
    name: 'Shopify',
    description: 'Add the widget snippet to your theme layout file.',
    code: `<!-- In theme.liquid, before </body> -->
{% if template != 'checkout' %}
<script>
  window.CE_WIDGET_CONFIG = {
    apiKey: "your_api_key",
    position: "bottom-right",
    primaryColor: "#8A1538"
  };
</script>
<script src="https://cdn.conversationengine.com/widget.js" async defer></script>
{% endif %}`,
  },
  {
    name: 'WordPress',
    description: 'Add the embed code via a plugin or theme footer.',
    code: `// Add to functions.php or use a code snippet plugin
add_action('wp_footer', function() {
  if (!is_checkout()) {
    ?>
    <script>
      window.CE_WIDGET_CONFIG = {
        apiKey: "<?= get_option('ce_api_key') ?>",
        position: "bottom-right"
      };
    </script>
    <script src="https://cdn.conversationengine.com/widget.js" async defer></script>
    <?php
  }
});`,
  },
  {
    name: 'Webflow',
    description: 'Add an embed element before the closing </body> tag.',
    code: `<!-- Add an "Embed" element in Webflow Designer before </body> -->
<script>
  window.CE_WIDGET_CONFIG = {
    apiKey: "your_api_key",
    position: "bottom-right",
    primaryColor: "#8A1538",
    greeting: "Hi! How can I help?"
  };
</script>
<script src="https://cdn.conversationengine.com/widget.js" async defer></script>`,
  },
];

const CONFIG_OPTIONS = [
  { key: 'apiKey', type: 'string', description: 'Your unique widget API key from the dashboard.' },
  { key: 'position', type: '"bottom-right" | "bottom-left"', description: 'Widget position on the page.' },
  { key: 'primaryColor', type: 'string (hex)', description: 'Primary brand color for the widget.' },
  { key: 'greeting', type: 'string', description: 'Initial greeting message shown in the widget.' },
  { key: 'suggestions', type: 'string[]', description: 'Up to 4 suggested questions to start with.' },
  { key: 'showBranding', type: 'boolean', description: 'Show or hide the Conversation Engine branding.' },
];

export default function WidgetPage() {
  return (
    <div className="relative min-h-screen bg-obsidian text-white">
      <Seo title="Widget Integration" description="Embed the Conversation Engine widget on any website with a single snippet or package install." path="/docs/widget" />
      <div className="pt-20 px-4 max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-sm text-white/50">
          <Link to="/docs" className="hover:text-white transition-colors">Docs Home</Link>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          <span className="text-white/80">Widget Integration</span>
        </nav>
      </div>

      <PageHeader
        badge="WIDGET INTEGRATION"
        title="Embed on any platform."
        description="Our widget works everywhere. Copy a snippet, install a package, or follow the platform-specific guide below."
      />

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-8">Supported platforms</h2>
        <div className="space-y-8">
          {PLATFORMS.map((platform, i) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <GlassPanel className="p-6 md:p-8">
                <h3 className="text-lg font-semibold text-white mb-2">{platform.name}</h3>
                <p className="text-sm text-white/60 mb-4">{platform.description}</p>
                <pre className="text-sm text-[#e4e4f0] bg-[#16162a] p-4 rounded-xl border border-[rgba(255,255,255,0.08)] overflow-x-auto">{platform.code}</pre>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-8">Configuration options</h2>
        <GlassPanel className="p-6 md:p-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-4 font-semibold text-white/80">Key</th>
                  <th className="text-left py-3 pr-4 font-semibold text-white/80">Type</th>
                  <th className="text-left py-3 font-semibold text-white/80">Description</th>
                </tr>
              </thead>
              <tbody>
                {CONFIG_OPTIONS.map((opt) => (
                  <tr key={opt.key} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-mono text-[#E8A0B4]">{opt.key}</td>
                    <td className="py-3 pr-4 text-white/60">{opt.type}</td>
                    <td className="py-3 text-white/70">{opt.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <h2 className="text-2xl font-bold text-white mb-8">Verify installation</h2>
        <GlassPanel className="p-6 md:p-8">
          <ol className="space-y-3 text-sm text-white/70 list-decimal list-inside">
            <li>Open your live site where you installed the widget.</li>
            <li>Look for the chat bubble in the bottom corner of the page.</li>
            <li>Click the bubble to open the widget — you should see your custom greeting.</li>
            <li>Type a test question that your knowledge base can answer.</li>
            <li>Check that the response includes citations and a confidence indicator.</li>
            <li>If the widget does not appear, check the browser console for errors and verify your API key.</li>
          </ol>
        </GlassPanel>
      </SectionContainer>

      <SectionContainer containerClassName="max-w-4xl">
        <div className="border-t border-white/10 pt-12">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 mb-4">Related documentation</h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/docs/quick-start" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Quick Start →</Link>
            <Link to="/docs/knowledge" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Knowledge Management →</Link>
            <Link to="/docs/api" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">API Reference →</Link>
            <Link to="/docs/integrations" className="text-sm text-[#C94F72] hover:text-[#E8A0B4] transition-colors">Integrations →</Link>
          </div>
        </div>
      </SectionContainer>
    </div>
  );
}