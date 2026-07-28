import { ChatWidget } from './chat-ui';
import { WidgetConfig } from './types';

export { ChatWidget } from './chat-ui';
export { streamChat } from './stream-client';
export type { WidgetConfig, ChatMessage, StreamEvent, StreamClientOptions } from './types';

export function initChatWidget(config: WidgetConfig): ChatWidget {
  const widget = new ChatWidget(config);
  widget.mount();
  return widget;
}

declare global {
  interface Window {
    ChatWidget: typeof ChatWidget;
    initChatWidget: typeof initChatWidget;
  }
}

function extractWidgetToken(): string | undefined {
  try {
    const src = document.currentScript?.getAttribute('src') || '';
    const match = src.match(/[?&]token=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

function deriveApiUrl(): string {
  try {
    const src = document.currentScript?.getAttribute('src') || '';
    const url = new URL(src);
    return url.origin;
  } catch {
    return '';
  }
}

if (typeof window !== 'undefined') {
  window.ChatWidget = ChatWidget;
  window.initChatWidget = initChatWidget;

  const scriptEl = document.currentScript as HTMLScriptElement | null;
  if (scriptEl) {
    const config: WidgetConfig = {
      apiUrl: scriptEl.getAttribute('data-api-url') || deriveApiUrl(),
      tenantId: scriptEl.getAttribute('data-tenant-id') || undefined,
      apiKey: scriptEl.getAttribute('data-api-key') || undefined,
      widgetToken: scriptEl.getAttribute('data-token') || extractWidgetToken(),
      sessionId: scriptEl.getAttribute('data-session-id') || undefined,
      title: scriptEl.getAttribute('data-title') || undefined,
      subtitle: scriptEl.getAttribute('data-subtitle') || undefined,
      primaryColor: scriptEl.getAttribute('data-primary-color') || undefined,
      greeting: scriptEl.getAttribute('data-greeting') || undefined,
      position: (scriptEl.getAttribute('data-position') as WidgetConfig['position']) || undefined,
    };
    if (config.apiUrl) {
      initChatWidget(config);
    }
  }
}
