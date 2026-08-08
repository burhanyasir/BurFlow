import { StreamClientOptions, StreamEvent } from './types';

export async function streamChat(options: StreamClientOptions): Promise<void> {
  const { apiUrl, tenantId, apiKey, widgetToken, sessionId, message, onToken, onDone, onComplete, onError, signal } = options;

  const body: Record<string, string> = {
    message: message || '',
  };
  if (sessionId) body.sessionId = sessionId;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (tenantId) headers['x-tenant-id'] = tenantId;
  if (apiKey) headers['x-api-key'] = apiKey;
  if (widgetToken) headers['x-widget-token'] = widgetToken;
  if (sessionId) headers['x-session-id'] = sessionId;

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    onError(err.message || 'Network error');
    return;
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {}
    onError(errorMsg);
    return;
  }

  const headersObj = response.headers as Headers | { get?: (name: string) => string | null } | undefined;
  const contentType = headersObj && typeof headersObj.get === 'function' ? headersObj.get('content-type') || '' : '';
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      if (data.response) {
        onComplete(data.response, data.turnId || '');
      }
      if (data.humanTakeover) {
        options.onHumanTakeover?.();
      }
      if (options.onUiState) {
        options.onUiState(data.uiState, data.cta);
      }
      return;
    } catch (err: any) {
      onError(err.message || 'Failed to parse JSON response');
      return;
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          return;
        }

        try {
          const event: StreamEvent = JSON.parse(data);
          switch (event.type) {
            case 'token':
              if (event.content) onToken(event.content);
              break;
            case 'done':
              if (event.finishReason) onDone(event.finishReason);
              if (event.humanTakeover) options.onHumanTakeover?.();
              break;
            case 'complete':
              onComplete(event.fullContent || '', event.turnId || '');
              if (event.humanTakeover) options.onHumanTakeover?.();
              break;
            case 'ui_state':
              if (options.onUiState) options.onUiState(event.uiState, event.cta);
              if (event.humanTakeover) options.onHumanTakeover?.();
              break;
            case 'error':
              onError(event.error || 'Unknown error');
              break;
          }
        } catch {}
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      onError(err.message || 'Stream error');
    }
  } finally {
    reader.releaseLock();
  }
}
