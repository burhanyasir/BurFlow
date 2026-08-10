import { type ReactNode } from 'react';
import { SiteHeader } from '../components/landing/SiteHeader';
import { SiteFooter } from '../components/landing/SiteFooter';
import { WidgetLauncher } from '../components/landing/WidgetLauncher';

export interface PublicLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PublicLayout({ children, className }: PublicLayoutProps) {
  return (
    <div className="landing flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className={className ? `flex-1 ${className}` : 'flex-1'}>{children}</main>
      <SiteFooter />
      <WidgetLauncher />
    </div>
  );
}
