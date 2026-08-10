import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { track } from '../../lib/analytics';
import { Logo } from './primitives';

const navLinks = [
  { label: 'Product', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Docs', to: '/docs' },
  { label: 'Blog', to: '/blog' },
  { label: 'About', to: '/about' },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${
        scrolled
          ? 'border-hairline bg-background/95 shadow-soft'
          : 'border-transparent bg-background/70'
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="BurFlow home" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              onClick={() => track('nav_click', { item: n.label })}
              className={`text-sm transition-colors ${
                pathname === n.to
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            onClick={() => track('cta_click', { label: 'Start free', location: 'header' })}
            className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Start free
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="p-1.5 text-foreground md:hidden"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-hairline bg-background/95 md:hidden">
          <div className="mx-auto w-full max-w-6xl space-y-1 px-6 py-4">
            {navLinks.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  pathname === n.to
                    ? 'bg-accent font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                }`}
              >
                {n.label}
              </Link>
            ))}
            <hr className="my-2 border-hairline" />
            <Link to="/login" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground">
              Log in
            </Link>
            <Link
              to="/signup"
              onClick={() => track('cta_click', { label: 'Start free', location: 'mobile_menu' })}
              className="block rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
