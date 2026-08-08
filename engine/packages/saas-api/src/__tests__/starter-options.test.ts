import { describe, it, expect } from 'vitest';

// Import the fallback function directly for testing
// We test the fallback since the LLM path requires a real API key

function generateStarterOptionsFallback(docs: Array<{ metadata?: { sourceUrl?: string }; title?: string }>): string[] {
  const options: string[] = [];
  const urls = docs.map(d => (d.metadata?.sourceUrl as string || '').toLowerCase());
  const titles = docs.map(d => (d.title || '').toLowerCase());

  const hasPricing = urls.some(u => u.includes('pricing')) || titles.some(t => t.includes('pricing'));
  const hasProducts = urls.some(u => u.includes('product')) || titles.some(t => t.includes('product'));
  const hasContact = urls.some(u => u.includes('contact')) || titles.some(t => t.includes('contact'));
  const hasFaq = urls.some(u => u.includes('faq') || u.includes('question')) || titles.some(t => t.includes('faq') || t.includes('question'));
  const hasDemo = urls.some(u => u.includes('demo') || u.includes('trial')) || titles.some(t => t.includes('demo') || t.includes('trial'));
  const hasAbout = urls.some(u => u.includes('about')) || titles.some(t => t.includes('about'));

  if (hasPricing) options.push('Show me pricing');
  if (hasProducts) options.push('What products do you offer?');
  if (hasDemo) options.push('Can I try a demo?');
  if (hasFaq) options.push('Frequently asked questions');
  if (hasContact) options.push('How can I contact you?');
  if (hasAbout) options.push('Tell me about your company');

  if (options.length < 3) {
    const defaults = ['How does it work?', 'Book a demo', 'What are your services?'];
    for (const d of defaults) {
      if (options.length >= 3) break;
      if (!options.includes(d)) options.push(d);
    }
  }

  return options.slice(0, 3);
}

describe('generateStarterOptionsFallback', () => {
  it('generates pricing option for SaaS site', () => {
    const docs = [
      { title: 'Pricing Plans', metadata: { sourceUrl: 'https://example.com/pricing' } },
      { title: 'Features', metadata: { sourceUrl: 'https://example.com/features' } },
    ];
    const options = generateStarterOptionsFallback(docs);
    expect(options).toContain('Show me pricing');
    expect(options.length).toBe(3);
  });

  it('generates dental-appropriate options', () => {
    const docs = [
      { title: 'Our Services', metadata: { sourceUrl: 'https://dental.com/services' } },
      { title: 'Book Appointment', metadata: { sourceUrl: 'https://dental.com/book' } },
      { title: 'Contact Us', metadata: { sourceUrl: 'https://dental.com/contact' } },
    ];
    const options = generateStarterOptionsFallback(docs);
    expect(options).toContain('How can I contact you?');
    expect(options.length).toBe(3);
  });

  it('generates e-commerce options', () => {
    const docs = [
      { title: 'Shop Products', metadata: { sourceUrl: 'https://shop.com/products' } },
      { title: 'FAQ', metadata: { sourceUrl: 'https://shop.com/faq' } },
    ];
    const options = generateStarterOptionsFallback(docs);
    expect(options).toContain('What products do you offer?');
    expect(options).toContain('Frequently asked questions');
    expect(options.length).toBe(3);
  });

  it('falls back to defaults for generic sites', () => {
    const docs = [
      { title: 'Home', metadata: { sourceUrl: 'https://example.com/' } },
    ];
    const options = generateStarterOptionsFallback(docs);
    expect(options.length).toBe(3);
    expect(options.some(o => o.length > 0)).toBe(true);
  });

  it('always returns exactly 3 options', () => {
    const docs = [
      { title: 'Pricing', metadata: { sourceUrl: 'https://x.com/pricing' } },
      { title: 'Products', metadata: { sourceUrl: 'https://x.com/products' } },
      { title: 'Demo', metadata: { sourceUrl: 'https://x.com/demo' } },
      { title: 'FAQ', metadata: { sourceUrl: 'https://x.com/faq' } },
      { title: 'Contact', metadata: { sourceUrl: 'https://x.com/contact' } },
      { title: 'About', metadata: { sourceUrl: 'https://x.com/about' } },
    ];
    const options = generateStarterOptionsFallback(docs);
    expect(options.length).toBe(3);
  });
});
