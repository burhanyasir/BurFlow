import { ChatWidget } from './chat-ui';
import { WidgetConfig } from './types';

export { ChatWidget } from './chat-ui';
export { streamChat } from './stream-client';
export type { WidgetConfig, ChatMessage, StreamEvent, StreamClientOptions } from './types';

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
}
