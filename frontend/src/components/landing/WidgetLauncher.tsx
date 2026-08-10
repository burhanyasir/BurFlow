import { useEffect } from 'react';

declare global {
  interface Window {
    initChatWidget?: (config: Record<string, unknown>) => void;
  }
}

const SCRIPT_ID = 'burflow-widget-script';
const STYLE_ID = 'burflow-widget-styles';

export function WidgetLauncher() {
  useEffect(() => {
    const token = import.meta.env.VITE_WIDGET_TOKEN as string | undefined;
    const apiUrl = (import.meta.env.VITE_WIDGET_API_URL as string | undefined) || '';
    if (!token || document.getElementById(SCRIPT_ID)) return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('link');
      style.id = STYLE_ID;
      style.rel = 'stylesheet';
      style.href = '/widget/styles.css';
      document.head.appendChild(style);
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = '/widget/widget.js';
    script.async = true;
    script.onload = () => {
      if (window.initChatWidget) {
        window.initChatWidget({
          apiUrl,
          widgetToken: token,
          primaryColor: '#016248',
          title: 'BurFlow',
          position: 'bottom-right',
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
