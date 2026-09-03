import { StreamClientOptions, StreamEvent } from './types';

export async function streamChat(options: StreamClientOptions): Promise<void> {
  const { apiUrl, tenantId, apiKey, widgetToken, sessionId, message, onToken, onDone, onComplete, onError, signal } = options;

  const body: Record<string, string> = {
    message: message || '',
  };
  if (sessionId) body.sessionId = sessionId;

  let completeCalled = false;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
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
    console.error('[BurFlow Widget] Fetch error:', err);
    onError(err.message || 'Network error');
    return;
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {}
    console.error('[BurFlow Widget] HTTP error:', errorMsg, 'status:', response.status);
    onError(errorMsg);
    return;
  }

  const headersObj = response.headers as Headers | { get?: (name: string) => string | null } | undefined;
  const contentType = headersObj && typeof headersObj.get === 'function' ? headersObj.get('content-type') || '' : '';
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      if (data.humanTakeover) {
        options.onHumanTakeover?.();
      }
      if (options.onUiState) {
        options.onUiState(data.uiState, data.cta, data.suggestedOptions, data.quickReplies);
      }
      if (data.response) {
        if (!completeCalled) { completeCalled = true; onComplete(data.response, data.turnId || ''); }
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
  let fullContent = '';
  let lastTurnId = '';

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
          if (!completeCalled) { completeCalled = true; onComplete(fullContent, lastTurnId); }
          return;
        }

        try {
          const event: StreamEvent = JSON.parse(data);
          switch (event.type) {
            case 'token':
              if (event.content) {
                fullContent += event.content;
                onToken(event.content);
              }
              break;
            case 'done':
              if (event.finishReason) onDone(event.finishReason);
              if (event.turnId) lastTurnId = event.turnId;
              if (event.humanTakeover) options.onHumanTakeover?.();
              break;
            case 'complete':
              if (options.onUiState && (event.suggestedOptions || event.uiState || event.cta || event.quickReplies)) {
                options.onUiState(event.uiState, event.cta, event.suggestedOptions, event.quickReplies);
              }
              if (!completeCalled) { completeCalled = true; onComplete(event.fullContent || '', event.turnId || ''); }
              if (event.humanTakeover) options.onHumanTakeover?.();
              break;
            case 'ui_state':
              if (options.onUiState) options.onUiState(event.uiState, event.cta, event.suggestedOptions, event.quickReplies);
              if (event.humanTakeover) options.onHumanTakeover?.();
              break;
            case 'error':
              onError(event.error || 'Unknown error');
              break;
          }
        } catch {}
      }
    }
    // Fallback: if stream ended without [DONE] sentinel, fire onComplete with
    // whatever content was accumulated so the UI can finalize the message.
    if (!completeCalled && fullContent) {
      completeCalled = true;
      onComplete(fullContent, lastTurnId);
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      onError(err.message || 'Stream error');
    }
  } finally {
    reader.releaseLock();
  }
}
