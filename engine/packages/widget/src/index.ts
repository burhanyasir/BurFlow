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

  // Auto-initialize from script tag data attributes
  function autoInit() {
    try {
      const script = _scriptEl;
      if (!script) return;
      const token = script.getAttribute('data-token');
      if (!token) return;
      const apiUrl = script.getAttribute('data-api-url') || '';
      const primaryColor = script.getAttribute('data-primary-color') || undefined;
      const position = script.getAttribute('data-position') as any || undefined;
      const title = script.getAttribute('data-title') || undefined;
      initChatWidget({ widgetToken: token, apiUrl, primaryColor, position, title });
    } catch {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}
