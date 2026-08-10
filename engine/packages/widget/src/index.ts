import { ChatWidget } from './chat-ui';
import { WidgetConfig } from './types';

export { ChatWidget } from './chat-ui';
export { streamChat } from './stream-client';
export type { WidgetConfig, ChatMessage, StreamEvent, StreamClientOptions } from './types';

// Capture the script element IMMEDIATELY during execution — currentScript is null after this
const _scriptEl = typeof document !== 'undefined' ? document.currentScript as HTMLScriptElement | null : null;

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
  //    so the pasted snippet never hardcodes an expiring JWT
  function autoInit() {
    try {
      const script = _scriptEl;
      if (!script) return;
      const apiUrl = script.getAttribute('data-api-url') || '';
      const primaryColor = script.getAttribute('data-primary-color') || undefined;
      const position = script.getAttribute('data-position') as any || undefined;
      const title = script.getAttribute('data-title') || undefined;

      const token = script.getAttribute('data-token');
      if (token) {
        initChatWidget({ widgetToken: token, apiUrl, primaryColor, position, title });
        return;
      }

      const tenantId = script.getAttribute('data-tenant-id');
      if (tenantId && apiUrl) {
        fetch(`${apiUrl}/api/widget/public-token?tenantId=${encodeURIComponent(tenantId)}`)
          .then((res) => {
            if (!res.ok) throw new Error(`public-token request failed (${res.status})`);
            return res.json();
          })
          .then((data) => {
            if (data && data.token) {
              initChatWidget({ widgetToken: data.token, apiUrl, primaryColor, position, title });
            }
          })
          .catch(() => {
            // Widget stays dormant if the bootstrap fails — never throw on page load.
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
