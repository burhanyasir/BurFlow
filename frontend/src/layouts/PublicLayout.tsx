import { type ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handle = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none" aria-hidden="true">
      <div className="h-full bg-gradient-to-r from-[#5865F2] via-[#00F0FF] to-[#5865F2] transition-all duration-150 ease-out" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handle = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-white shadow-lg border border-[#D0D5DD] flex items-center justify-center text-[#5F6570] hover:text-[#0B0C10] hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]"
          aria-label="Back to top"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function PublicLayout({ children, className }: PublicLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <ScrollProgress />
      <header className="sticky top-0 z-30 border-b border-[#D0D5DD] bg-white/80 backdrop-blur-xl">
        <Container className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-[#0B0C10] shrink-0">
            <svg className="h-7 w-7 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7l-10-5z"/></svg>
            Conversation Engine
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'relative px-3 py-2 text-sm rounded-lg transition-colors',
                    isActive ? 'text-[#5865F2] font-medium' : 'text-[#5F6570] hover:text-[#0B0C10] hover:bg-[#F0F1F3]'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.span layoutId="nav-active" className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#5865F2] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-[#5F6570] hover:text-[#0B0C10] transition-colors">Sign In</Link>
            <Link to="/signup" className="inline-flex h-9 items-center px-4 text-sm font-medium rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors shadow-sm hover:shadow-md">Get Started</Link>
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
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden border-t border-[#D0D5DD] bg-white overflow-hidden"
            >
              <Container className="py-4 space-y-1">
                {navLinks.map(link => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={cn('block px-3 py-2 text-sm rounded-lg transition-colors', isActive ? 'text-[#5865F2] font-medium bg-[#F0F3FF]' : 'text-[#5F6570] hover:text-[#0B0C10] hover:bg-[#F0F1F3]')}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <hr className="border-[#D0D5DD] my-2" />
                <Link to="/login" className="block px-3 py-2 text-sm font-medium text-[#5F6570] hover:text-[#0B0C10] rounded-lg hover:bg-[#F0F1F3]">Sign In</Link>
                <Link to="/signup" className="block px-3 py-2 text-sm font-medium text-white bg-[#5865F2] rounded-lg hover:bg-[#4752C4]">Get Started</Link>
              </Container>
            </motion.div>
          )}
        </AnimatePresence>
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
      <BackToTop />
    </div>
  );
}
