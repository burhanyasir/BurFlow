import { useEffect } from 'react';

export interface SeoProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'Conversation Engine';
const BASE_URL = 'https://conversationengine.ai';
const DEFAULT_OG_IMAGE = '/og-default.png';

export function Seo({ title, description, path = '', ogImage = DEFAULT_OG_IMAGE, ogType = 'website', noIndex }: SeoProps) {
  const fullTitle = `${title} — ${SITE_NAME}`;

  useEffect(() => {
    document.title = fullTitle;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
  }, [fullTitle, description]);

  return null;
}
