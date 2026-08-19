import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  schema?: string | string[];
  path?: string;
}

const SITE_URL: string = import.meta.env.VITE_SITE_URL ?? 'https://burflow.vercel.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

function toAbsoluteUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

function toCanonicalUrl(canonicalPath: string): string {
  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  return `${SITE_URL}${path === '/' ? '/' : path.replace(/\/+$/, '')}`;
}

export function SEO({ title, description, canonicalPath, ogImage = DEFAULT_OG_IMAGE, schema }: SEOProps) {
  const canonicalUrl = toCanonicalUrl(canonicalPath);
  const imageUrl = toAbsoluteUrl(ogImage);

  const schemaRender =
    schema &&
    (Array.isArray(schema)
      ? schema.map((s) => <script key={s} type="application/ld+json">{s}</script>)
      : <script type="application/ld+json">{schema}</script>);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {schemaRender}
    </Helmet>
  );
}