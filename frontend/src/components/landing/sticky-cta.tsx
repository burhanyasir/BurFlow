import { useEffect, useState } from 'react';
import { track } from '../../lib/analytics';

export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 720);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div        className={`fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-background/90 pl-4 pr-[210px] py-3 backdrop-blur-md transition-transform duration-300 hidden ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-xs leading-tight text-muted-foreground">
          Free scan · live in 10 min
          <span className="block font-semibold text-foreground">No card required</span>
        </p>
        <a
          href="#scan"
          onClick={() => track('cta_click', { label: 'Scan my website', location: 'sticky_mobile' })}
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Scan my website
        </a>
      </div>
    </div>
  );
}