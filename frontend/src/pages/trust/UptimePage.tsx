import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Service Availability Commitment',
    body: 'Conversation Engine is architected for high availability across multiple availability zones. Our Enterprise plan includes a 99.9% uptime SLA, calculated on a monthly basis. If we fail to meet this commitment, customers are eligible for service credits as outlined in their subscription agreement.',
  },
  {
    title: 'Current Status',
    body: 'All systems are currently operational. For real-time status updates, incident reports, and historical uptime data, visit our status page at status.conversationengine.com.',
    status: 'operational' as const,
  },
  {
    title: 'Uptime SLA',
    body: 'Enterprise customers receive a 99.9% monthly uptime SLA. This excludes planned maintenance windows (notified at least 7 days in advance) and outages caused by factors outside our reasonable control, including customer infrastructure, third-party services, or force majeure events.',
  },
  {
    title: 'Maintenance Windows',
    body: 'Planned maintenance is scheduled during low-traffic periods and communicated at least 7 days in advance via email and status page. We strive for zero-downtime deployments through our blue-green architecture. Emergency patches are applied with minimal disruption and communicated post-event.',
  },
  {
    title: 'Incident History',
    body: 'We maintain a publicly available incident history on our status page. Each incident includes the timeline, root cause analysis, and corrective actions taken. Our goal is full transparency — we publish post-mortems for all significant incidents.',
  },
  {
    title: 'Status Page',
    body: 'Monitor real-time availability, subscribe to notifications via email or Slack, and review historical uptime at status.conversationengine.com. We also publish a status API endpoint for integration with your own monitoring systems.',
  },
];

function Section({ title, body, index, status }: { title: string; body: string; index: number; status?: 'operational' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
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
        <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
        {status === 'operational' && (
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#1F9D6B' }} />
            <span className="text-sm font-semibold" style={{ color: '#1F9D6B' }}>All systems operational</span>
          </div>
        )}
        <p className="text-sm text-white/70 leading-relaxed">{body}</p>
      </div>
    </motion.div>
  );
}

export default function UptimePage() {
  return (
    <div className="min-h-screen" style={{ background: '#08080A' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
        <motion.nav
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm mb-10"
          style={{ color: '#6B6B76' }}
        >
          <Link to="/trust" className="hover:text-white transition-colors">
            Trust Center
          </Link>
          <span>&rarr;</span>
          <span style={{ color: '#A1A1AA' }}>Uptime</span>
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Uptime & Availability
          </h1>
          <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl leading-relaxed">
            Our commitment to keeping your AI support online and responsive.
          </p>
        </motion.div>

        <div className="space-y-5">
          {sections.map((s, i) => (
            <Section key={s.title} title={s.title} body={s.body} index={i} status={s.status} />
          ))}
        </div>
      </div>
    </div>
  );
}