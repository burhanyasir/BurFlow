import { ChatWidget } from './chat-ui';
import { WidgetConfig } from './types';

export { ChatWidget } from './chat-ui';
export { streamChat } from './stream-client';
export type { WidgetConfig, ChatMessage, StreamEvent, StreamClientOptions } from './types';

// Capture the script element IMMEDIATELY during execution — currentScript is null after this.
// Bundles loaded with async/defer or as modules report currentScript as null even during
// execution, so autoInit falls back to scanning the DOM (resolveScriptEl).
const _scriptEl = typeof document !== 'undefined' ? document.currentScript as HTMLScriptElement | null : null;

/**
 * Best-effort resolution of the widget's script element. Prefers the script
 * that is currently executing (document.currentScript); when that is null
 * (async/defer/module loading) finds the first script tagged with widget
 * bootstrap attributes in the document.
 */
function resolveScriptEl(): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null;
  const current = document.currentScript as HTMLScriptElement | null;
  if (current) return current;
  return document.querySelector<HTMLScriptElement>(
    'script[data-tenant-id], script[data-token]',
  );
}

export function initChatWidget(config: WidgetConfig): ChatWidget {
  const widget = new ChatWidget(config);
  widget.mount();
  if (typeof window !== 'undefined') {
    (window as any).__CURRENT_WIDGET = widget;
  }
  return widget;
}

declare global {
  interface Window {
    ChatWidget: typeof ChatWidget;
    initChatWidget: typeof initChatWidget;
    __CURRENT_WIDGET?: ChatWidget;
  }
}

if (typeof window !== 'undefined') {
  window.ChatWidget = ChatWidget;
  window.initChatWidget = initChatWidget;

  // Auto-initialize from script tag data attributes. Two modes are supported:
  //  - legacy `data-token="..."`: the token is embedded directly in the page
  //  - `data-tenant-id="..."`: the widget exchanges the public tenant
  //    identifier for a fresh token at runtime via /api/widget/public-token,
  //    so the pasted snippet never hardcodes an expiring JWT. When
  //    `data-api-url` is omitted the exchange (and all API traffic) resolves
  //    against the page's own origin — same-origin setups such as the Vite dev
  //    proxy or an nginx /api reverse proxy need no extra configuration.
  function autoInit() {
    try {
      const script = _scriptEl || resolveScriptEl();
      if (!script) return;
      let apiUrl = script.getAttribute('data-api-url') || '';
      if (!apiUrl) {
        const src = script.src || '';
        try {
          const u = new URL(src, location.href);
          apiUrl = u.origin;
        } catch {}
      }
      const primaryColor = script.getAttribute('data-primary-color') || undefined;
      const position = script.getAttribute('data-position') as any || undefined;
      const title = script.getAttribute('data-title') || undefined;

      const token = script.getAttribute('data-token');
      if (token) {
        initChatWidget({ widgetToken: token, apiUrl, primaryColor, position, title });
        return;
      }

      const tenantId = script.getAttribute('data-tenant-id');
      if (tenantId) {
        fetch(`${apiUrl}/api/widget/public-token?tenantId=${encodeURIComponent(tenantId)}`)
          .then((res) => {
            if (!res.ok) throw new Error(`public-token request failed (${res.status})`);
            return res.json();
          })
          .then((data) => {
            if (data && data.token) {
              initChatWidget({ widgetToken: data.token, apiUrl, primaryColor, position, title, tenantId: data.tenantId || tenantId });
            } else {
              // Token exchange returned no token — render with local defaults
              // so the bubble still appears (never fully dormant).
              initChatWidget({ apiUrl, primaryColor, position, title });
            }
          })
          .catch(() => {
            // Backend unreachable or tenant unknown — render the bubble with
            // local default config instead of staying dormant. This preserves
            // the pre-tokenless behavior where a failed config fetch still
            // showed the launcher with mock content.
            initChatWidget({ apiUrl, primaryColor, position, title });
          });
      }
    } catch {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}
