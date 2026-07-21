import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';
import { Container } from './Container';

const navLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Docs', href: '/docs' }
];

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' }
    ]
  },
  {
    title: 'Platform',
    links: [
      { label: 'API Documentation', href: '/docs' },
      { label: 'Widget Guide', href: '/docs' },
      { label: 'Status Page', href: '#' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact Sales', href: '/contact' },
      { label: 'Blog', href: '/blog' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Security & Compliance', href: '/security' }
    ]
  }
];

export interface PublicLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PublicLayout({ children, className }: PublicLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-[#D0D5DD] bg-white/80 backdrop-blur-xl">
        <Container className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-[#0B0C10]">
            <svg className="h-7 w-7 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5z"/></svg>
            Conversation Engine
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link key={link.href} to={link.href} className="text-sm text-[#5F6570] hover:text-[#0B0C10] transition-colors">{link.label}</Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-[#5F6570] hover:text-[#0B0C10] transition-colors">Sign In</Link>
            <Link to="/signup" className="inline-flex h-9 items-center px-4 text-sm font-medium rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors">Get Started</Link>
          </div>
          <button
            type="button"
            className="md:hidden p-2 text-[#5F6570] hover:text-[#0B0C10]"
            onClick={() => setMenuOpen(p => !p)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </Container>
        {menuOpen && (
          <div className="md:hidden border-t border-[#D0D5DD] bg-white">
            <Container className="py-4 space-y-3">
              {navLinks.map(link => (
                <Link key={link.href} to={link.href} className="block text-sm text-[#5F6570] hover:text-[#0B0C10] py-1" onClick={() => setMenuOpen(false)}>{link.label}</Link>
              ))}
              <hr className="border-[#D0D5DD]" />
              <Link to="/login" className="block text-sm font-medium text-[#5F6570] hover:text-[#0B0C10] py-1" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/signup" className="block text-sm font-medium text-[#5865F2] hover:text-[#4752C4] py-1" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </Container>
          </div>
        )}
      </header>
      <main className={cn('flex-1', className)}>{children}</main>
      <footer className="border-t border-[#D0D5DD] bg-[#F8F9FA] py-12">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {footerColumns.map(col => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-[#0B0C10] mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link to={link.href} className="text-sm text-[#5F6570] hover:text-[#0B0C10] transition-colors">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-[#D0D5DD]">
            <p className="text-sm text-[#A0A5B0] text-center">&copy; 2026 Conversation Engine. All rights reserved. Precision Customer AI.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
