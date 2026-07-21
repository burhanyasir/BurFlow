import { type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Container } from './Container';

interface NavLink { label: string; href: string; }

const navLinks: NavLink[] = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' }
];

export interface PublicLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PublicLayout({ children, className }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-[#D0D5DD] bg-white/80 backdrop-blur-xl">
        <Container className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2 font-bold text-lg text-[#0B0C10]">
            <svg className="h-7 w-7 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5z"/></svg>
            Conversation Engine
          </a>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm text-[#5F6570] hover:text-[#0B0C10] transition-colors">{link.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm font-medium text-[#5F6570] hover:text-[#0B0C10] transition-colors">Sign In</a>
            <a href="/signup" className="inline-flex h-9 items-center px-4 text-sm font-medium rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors">Get Started</a>
          </div>
        </Container>
      </header>
      <main className={cn('flex-1', className)}>{children}</main>
      <footer className="border-t border-[#D0D5DD] bg-[#F8F9FA] py-12">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-sm font-semibold text-[#0B0C10] mb-3">Product</h4>
              <ul className="space-y-2">{['Features', 'Pricing', 'Changelog'].map(i => <li key={i}><a href="#" className="text-sm text-[#5F6570] hover:text-[#0B0C10] transition-colors">{i}</a></li>)}</ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#0B0C10] mb-3">Platform</h4>
              <ul className="space-y-2">{['API Documentation', 'Widget Guide', 'Status Page'].map(i => <li key={i}><a href="#" className="text-sm text-[#5F6570] hover:text-[#0B0C10] transition-colors">{i}</a></li>)}</ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#0B0C10] mb-3">Company</h4>
              <ul className="space-y-2">{['About Us', 'Contact Sales', 'Blog'].map(i => <li key={i}><a href="#" className="text-sm text-[#5F6570] hover:text-[#0B0C10] transition-colors">{i}</a></li>)}</ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#0B0C10] mb-3">Legal</h4>
              <ul className="space-y-2">{['Privacy Policy', 'Terms of Service', 'Security & Compliance'].map(i => <li key={i}><a href="#" className="text-sm text-[#5F6570] hover:text-[#0B0C10] transition-colors">{i}</a></li>)}</ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#D0D5DD]">
            <p className="text-sm text-[#A0A5B0] text-center">&copy; 2026 Conversation Engine. All rights reserved. Precision Customer AI.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
