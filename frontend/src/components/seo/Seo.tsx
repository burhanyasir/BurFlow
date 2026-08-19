import { useEffect } from 'react';
import { SITE_URL } from '../../lib/site';

export interface SeoProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'BurFlow';
const BASE_URL = SITE_URL;
const DEFAULT_OG_IMAGE = '/og-default.png';

function upsertTag(tagName: string, attributes: Record<string, string>, parent: HTMLElement = document.head) {
  let element = document.querySelector(`${tagName}[${Object.keys(attributes)[0]}="${Object.values(attributes)[0]}"]`) as HTMLElement | null;
  if (!element) {
    element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
    parent.appendChild(element);
  }
  return element;
}

export function Seo({ title, description, path = '', ogImage = DEFAULT_OG_IMAGE, ogType = 'website', noIndex }: SeoProps) {
  const fullTitle = `${title} — ${SITE_NAME}`;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const canonicalUrl = `${BASE_URL}${normalizedPath || '/'}`;

  useEffect(() => {
    document.title = fullTitle;

    const descriptionTag = document.querySelector('meta[name="description"]') || document.createElement('meta');
    if (!descriptionTag.parentElement) {
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.setAttribute('name', 'description');
    descriptionTag.setAttribute('content', description);

    upsertTag('meta', { name: 'robots', content: noIndex ? 'noindex,nofollow' : 'index,follow' });
    upsertTag('meta', { property: 'og:title', content: fullTitle }, document.head);
    upsertTag('meta', { property: 'og:description', content: description }, document.head);
    upsertTag('meta', { property: 'og:type', content: ogType }, document.head);
    upsertTag('meta', { property: 'og:image', content: ogImage }, document.head);
    upsertTag('meta', { property: 'og:url', content: canonicalUrl }, document.head);

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
  }, [canonicalUrl, description, fullTitle, noIndex, ogImage, ogType]);

  return null;
}
