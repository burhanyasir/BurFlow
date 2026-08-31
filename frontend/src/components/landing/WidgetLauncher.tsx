import { useEffect } from 'react';

declare global {
  interface Window {
    initChatWidget?: (config: Record<string, unknown>) => void;
  }
}

const SCRIPT_ID = 'burflow-widget-script';
const STYLE_ID = 'burflow-widget-styles';

// Default to the seeded SaaS demo tenant so the widget appears on the landing
// page immediately, with no per-deployment configuration. Override via
// VITE_WIDGET_TENANT_ID in .env.production/.env.development.
const DEFAULT_TENANT_ID = 'burflow-saas';
const WIDGET_CDN = 'https://burflow.onrender.com';

export function WidgetLauncher() {
  useEffect(() => {
    // Tokenless bootstrap: the widget exchanges the public tenant id for a
    // fresh widget token at runtime. Configure via .env.development:
    //   VITE_WIDGET_TENANT_ID=<tenant id or slug>
    const tenantId =
      (import.meta.env.VITE_WIDGET_TENANT_ID as string | undefined) || DEFAULT_TENANT_ID;
    const apiUrl = (import.meta.env.VITE_WIDGET_API_URL as string | undefined) || '';
    if (!tenantId || document.getElementById(SCRIPT_ID)) return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('link');
      style.id = STYLE_ID;
      style.rel = 'stylesheet';
      style.href = WIDGET_CDN + '/widget/styles.css';
      document.head.appendChild(style);
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = WIDGET_CDN + '/widget/widget.js';
    script.async = true;
    // The widget's autoInit reads these attributes and bootstraps itself.
    script.setAttribute('data-tenant-id', tenantId);
    if (apiUrl) script.setAttribute('data-api-url', apiUrl);
    script.setAttribute('data-primary-color', '#006248');
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-title', 'BurFlow');
    document.body.appendChild(script);
  }, []);

  return null;
}
