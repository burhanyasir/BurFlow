import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const trustItems = [
  { label: 'SOC 2', desc: 'Certified' },
  { label: 'GDPR', desc: 'Compliant' },
  { label: 'AES-256', desc: 'Encryption' },
  { label: '99.9%', desc: 'Uptime SLA' },
];

export function AuthLayout({
  children,
  title,
  subtitle,
  showTrustBadges = false,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showTrustBadges?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg wine-gradient">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            BurFlow
          </Link>
        </div>

        <div className="glass-strong rounded-2xl p-6 md:p-8">
          <h1 className="text-xl font-semibold text-foreground text-center">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-muted-foreground text-center leading-relaxed">
              {subtitle}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>

        {showTrustBadges && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {trustItems.map((item) => (
              <div key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-wine/20">
                  <div className="h-2 w-2 rounded-full bg-wine" />
                </div>
                <span className="font-medium">{item.label}</span>
                <span className="text-subtle">·</span>
                <span className="text-subtle">{item.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
