import { type ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { Container } from './Container';

const navLinks = [
  { label: 'Product', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' }
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
      { label: 'API Documentation', href: '/docs/api' },
      { label: 'Widget Guide', href: '/docs/widget' },
      { label: 'Status', href: '/status' }
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
    title: 'Resources',
    links: [
      { label: 'How Grounding Works', href: '/methodology' },
      { label: 'Trust Center', href: '/trust' },
      { label: 'Privacy Policy', href: '/privacy' }
    ]
  }
];

export interface PublicLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PublicLayout({ children, className }: PublicLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handle, { passive: true });
    handle();
    return () => window.removeEventListener('scroll', handle);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header
        className={cn(
          'sticky top-0 z-30 transition-all duration-200',
          scrolled
            ? 'border-b border-[var(--color-neutral-200)] bg-white/80 backdrop-blur-xl shadow-sm'
            : 'bg-transparent'
        )}
      >
        <Container className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-[var(--color-neutral-900)] shrink-0">
            <svg className="h-7 w-7 text-[var(--color-accent-600)]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5z"/></svg>
            BurFlow
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'relative px-3 py-2 text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] focus-visible:ring-offset-2',
                    isActive ? 'text-[var(--color-accent-600)] font-medium' : 'text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] hover:bg-[var(--color-neutral-50)]'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.span layoutId="nav-active" className="absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--color-accent-600)] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors">Log in</Link>
            <Link to="/signup" className="inline-flex h-9 items-center px-4 text-sm font-medium rounded-lg bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)] transition-colors shadow-sm hover:shadow-md">Start free</Link>
          </div>
          <button
            type="button"
            className="md:hidden p-2 text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)]"
            onClick={() => setMenuOpen(p => !p)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </Container>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden border-t border-[var(--color-neutral-200)] bg-white overflow-hidden"
            >
              <Container className="py-4 space-y-1">
                {navLinks.map(link => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={cn('block px-3 py-2 text-sm rounded-lg transition-colors', isActive ? 'text-[var(--color-accent-600)] font-medium bg-[var(--color-accent-200)]' : 'text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] hover:bg-[var(--color-neutral-50)]')}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <hr className="border-[var(--color-neutral-200)] my-2" />
                <Link to="/login" className="block px-3 py-2 text-sm font-medium text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] rounded-lg hover:bg-[var(--color-neutral-50)]">Log in</Link>
                <Link to="/signup" className="block px-3 py-2 text-sm font-medium text-white bg-[var(--color-accent-600)] rounded-lg hover:bg-[var(--color-accent-700)]">Start free</Link>
              </Container>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main className={cn('flex-1', className)}>{children}</main>
      <footer className="border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-0)] py-12">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {footerColumns.map(col => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-[var(--color-neutral-900)] mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <Link to={link.href} className="text-sm text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] transition-colors">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-[var(--color-neutral-200)] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-neutral-400)]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                SOC 2
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-neutral-400)]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
                GDPR
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-neutral-400)]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                HIPAA
              </span>
            </div>
            <p className="text-sm text-[var(--color-neutral-300)] text-center">&copy; 2026 BurFlow. All rights reserved. AI website sales agents.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
