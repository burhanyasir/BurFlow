import { motion } from 'framer-motion';

interface CookieEntry {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  type: 'Essential' | 'Analytics' | 'Functional' | 'Third-Party';
}

const COOKIE_LIST: CookieEntry[] = [
  { name: 'session_id', provider: 'Conversation Engine', purpose: 'Maintains login session and authentication state', duration: 'Session', type: 'Essential' },
  { name: 'csrf_token', provider: 'Conversation Engine', purpose: 'Prevents cross-site request forgery attacks', duration: 'Session', type: 'Essential' },
  { name: 'workspace_id', provider: 'Conversation Engine', purpose: 'Remembers active workspace selection', duration: '30 days', type: 'Functional' },
  { name: 'preferences', provider: 'Conversation Engine', purpose: 'Stores user interface preferences and settings', duration: '1 year', type: 'Functional' },
  { name: '_ga', provider: 'Google Analytics', purpose: 'Distinguishes unique users for analytics', duration: '2 years', type: 'Analytics' },
  { name: '_gid', provider: 'Google Analytics', purpose: 'Tracks user interaction for analytics', duration: '24 hours', type: 'Analytics' },
  { name: '_ga_*', provider: 'Google Analytics', purpose: 'Maintains analytics session state', duration: '2 years', type: 'Analytics' },
  { name: 'paddle_*', provider: 'Paddle', purpose: 'Payment processing and fraud prevention', duration: 'Session', type: 'Third-Party' },
  { name: '__cf_bm', provider: 'Cloudflare', purpose: 'Bot detection and rate limiting', duration: '30 minutes', type: 'Third-Party' },
];

const sections = [
  {
    title: 'What Are Cookies?',
    body: 'Cookies are small text files stored on your device by your web browser. They allow websites to remember your actions, preferences, and authentication state over time. Cookies can be "session" cookies (deleted when you close your browser) or "persistent" cookies (remain until they expire or are deleted).',
  },
  {
    title: 'How We Use Cookies',
    body: 'We use three categories of cookies: (1) Essential cookies are required for the platform to function — authentication, security, and session management. (2) Analytics cookies help us understand how users interact with the platform so we can improve performance and usability. (3) Functional cookies remember your preferences and settings. We do not use advertising or tracking cookies.',
  },
  {
    title: 'Third-Party Cookies',
    body: 'Some cookies are set by third-party services we use to operate the platform. Paddle sets cookies for payment processing and fraud prevention. Cloudflare sets cookies for security and performance optimization. Google Analytics sets cookies for anonymous usage analytics. These third parties may not use the data they collect for their own purposes.',
  },
  {
    title: 'How to Control Cookies',
    body: 'Most browsers allow you to view, block, or delete cookies through their settings. In Chrome: Settings &rarr; Privacy and Security &rarr; Cookies and other site data. In Firefox: Options &rarr; Privacy & Security &rarr; Cookies and Site Data. In Safari: Preferences &rarr; Privacy &rarr; Cookies and website data. Blocking essential cookies may prevent the platform from functioning correctly.',
  },
  {
    title: 'Updates to This Policy',
    body: 'We may update this Cookie Policy to reflect changes in technology, regulation, or our practices. Changes will be posted on this page with an updated date. Material changes will be communicated via email to account holders. Continued use of the platform after changes constitutes acceptance of the updated policy.',
  },
];

const typeColors: Record<string, string> = {
  'Essential': '#1F9D6B',
  'Analytics': '#C94F72',
  'Functional': '#8A1538',
  'Third-Party': '#A1A1AA',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen" style={{ background: '#08080A' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Cookie Policy
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            How Conversation Engine uses cookies and similar technologies.
          </p>
          <p className="mt-2 text-sm text-white/50">Last updated: July 28, 2026</p>
        </motion.div>

        {/* Cookie table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-10 overflow-x-auto"
        >
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'rgba(18,18,24,0.65)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B76' }}>Cookie</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B76' }}>Provider</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B76' }}>Purpose</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B76' }}>Duration</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6B76' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_LIST.map((cookie, i) => (
                  <tr
                    key={cookie.name}
                    style={{ borderBottom: i < COOKIE_LIST.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-white font-medium">{cookie.name}</td>
                    <td className="p-4 text-white/70">{cookie.provider}</td>
                    <td className="p-4 text-white/70">{cookie.purpose}</td>
                    <td className="p-4 text-white/70">{cookie.duration}</td>
                    <td className="p-4">
                      <span
                        className="inline-flex px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          background: `${typeColors[cookie.type]}20`,
                          color: typeColors[cookie.type],
                        }}
                      >
                        {cookie.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Content sections */}
        <div className="space-y-5">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 + i * 0.06 }}
            >
              <div
                className="p-6 md:p-8 rounded-xl"
                style={{
                  background: 'rgba(18,18,24,0.65)',
                  backdropFilter: 'blur(28px)',
                  WebkitBackdropFilter: 'blur(28px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.6)',
                }}
              >
                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}