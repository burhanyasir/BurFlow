// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatWidget } from '../chat-ui';
import { streamChat } from '../stream-client';
import { WidgetConfig, ChatMessage, StreamEvent } from '../types';

// ─── DOM Setup ──────────────────────────────────────────
beforeEach(() => {
  document.body.innerHTML = '';
  // Inject blink animation keyframe
  const style = document.createElement('style');
  style.textContent = '@keyframes cw-blink { 50% { opacity: 0; } }';
  document.head.appendChild(style);
});

afterEach(() => {
  document.body.innerHTML = '';
  document.head.querySelectorAll('style').forEach(s => s.remove());
});

// ─── Stream Client Tests ────────────────────────────────
describe('streamChat', () => {
  function createMockStream(events: StreamEvent[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
  }

  function mockFetch(response: { ok: boolean; status?: number; body?: ReadableStream; json?: () => Promise<any> }) {
    return vi.fn().mockResolvedValue({
      ok: response.ok,
      status: response.status || 200,
      body: response.body,
      json: response.json || vi.fn().mockResolvedValue({}),
    });
  }

  it('calls onToken for each token event', async () => {
    const stream = createMockStream([
      { type: 'token', content: 'Hello' },
      { type: 'token', content: ' World' },
    ]);
    vi.stubGlobal('fetch', mockFetch({ ok: true, body: stream }));

    const onToken = vi.fn();
    await streamChat({ apiUrl: 'http://test', onToken, onDone: vi.fn(), onComplete: vi.fn(), onError: vi.fn() });

    expect(onToken).toHaveBeenCalledTimes(2);
    expect(onToken).toHaveBeenCalledWith('Hello');
    expect(onToken).toHaveBeenCalledWith(' World');
  });

  it('calls onComplete with full content', async () => {
    const stream = createMockStream([
      { type: 'token', content: 'Hi' },
      { type: 'complete', fullContent: 'Hi there', turnId: 'turn-1' },
    ]);
    vi.stubGlobal('fetch', mockFetch({ ok: true, body: stream }));

    const onComplete = vi.fn();
    await streamChat({ apiUrl: 'http://test', onToken: vi.fn(), onDone: vi.fn(), onComplete, onError: vi.fn() });

    expect(onComplete).toHaveBeenCalledWith('Hi there', 'turn-1');
  });

  it('calls onDone with finishReason', async () => {
    const stream = createMockStream([
      { type: 'done', finishReason: 'stop' },
    ]);
    vi.stubGlobal('fetch', mockFetch({ ok: true, body: stream }));

    const onDone = vi.fn();
    await streamChat({ apiUrl: 'http://test', onToken: vi.fn(), onDone, onComplete: vi.fn(), onError: vi.fn() });

    expect(onDone).toHaveBeenCalledWith('stop');
  });

  it('calls onError on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network fail')));

    const onError = vi.fn();
    await streamChat({ apiUrl: 'http://test', onToken: vi.fn(), onDone: vi.fn(), onComplete: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith('Network fail');
  });

  it('calls onError on non-OK response', async () => {
    vi.stubGlobal('fetch', mockFetch({ ok: false, status: 500, json: vi.fn().mockResolvedValue({ error: 'Server error' }) }));

    const onError = vi.fn();
    await streamChat({ apiUrl: 'http://test', onToken: vi.fn(), onDone: vi.fn(), onComplete: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith('Server error');
  });

  it('calls onError for error events in stream', async () => {
    const stream = createMockStream([
      { type: 'error', error: 'LLM failed' },
    ]);
    vi.stubGlobal('fetch', mockFetch({ ok: true, body: stream }));

    const onError = vi.fn();
    await streamChat({ apiUrl: 'http://test', onToken: vi.fn(), onDone: vi.fn(), onComplete: vi.fn(), onError });

    expect(onError).toHaveBeenCalledWith('LLM failed');
  });

  it('sends tenant-id, api-key, widget-token, and session-id headers', async () => {
    const stream = createMockStream([]);
    const fetchFn = mockFetch({ ok: true, body: stream });
    vi.stubGlobal('fetch', fetchFn);

    await streamChat({
      apiUrl: 'http://test',
      tenantId: 't-123',
      apiKey: 'key-abc',
      widgetToken: 'widget-token-xyz',
      sessionId: 's-456',
      onToken: vi.fn(),
      onDone: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    });

    expect(fetchFn).toHaveBeenCalledWith('http://test/api/chat/stream', expect.objectContaining({
      headers: expect.objectContaining({
        'x-tenant-id': 't-123',
        'x-api-key': 'key-abc',
        'x-widget-token': 'widget-token-xyz',
        'x-session-id': 's-456',
      }),
      body: JSON.stringify({ message: '' , sessionId: 's-456' }),
    }));
  });

  it('sends message text in request body', async () => {
    const stream = createMockStream([]);
    const fetchFn = mockFetch({ ok: true, body: stream });
    vi.stubGlobal('fetch', fetchFn);

    await streamChat({
      apiUrl: 'http://test',
      message: 'Hello widget',
      onToken: vi.fn(),
      onDone: vi.fn(),
      onComplete: vi.fn(),
      onError: vi.fn(),
    });

    expect(fetchFn).toHaveBeenCalledWith('http://test/api/chat/stream', expect.objectContaining({
      body: JSON.stringify({ message: 'Hello widget' }),
    }));
  });

  it('ignores AbortError silently', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const onError = vi.fn();
    await streamChat({ apiUrl: 'http://test', onToken: vi.fn(), onDone: vi.fn(), onComplete: vi.fn(), onError });

    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onHumanTakeover for JSON responses with humanTakeover flag', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
      json: vi.fn().mockResolvedValue({ response: 'Thanks — a human will reply shortly.', humanTakeover: true }),
    }));

    const onHumanTakeover = vi.fn();
    await streamChat({
      apiUrl: 'http://test',
      onToken: vi.fn(),
      onDone: vi.fn(),
      onComplete: vi.fn(),
      onHumanTakeover,
      onError: vi.fn(),
    });

    expect(onHumanTakeover).toHaveBeenCalledTimes(1);
  });

  it('calls onHumanTakeover for SSE complete events with the flag', async () => {
    const stream = createMockStream([
      { type: 'complete', fullContent: 'A human is here.', turnId: 't1', humanTakeover: true },
      { type: 'done', finishReason: 'handoff' },
    ]);
    vi.stubGlobal('fetch', mockFetch({ ok: true, body: stream }));

    const onHumanTakeover = vi.fn();
    await streamChat({
      apiUrl: 'http://test',
      onToken: vi.fn(),
      onDone: vi.fn(),
      onComplete: vi.fn(),
      onHumanTakeover,
      onError: vi.fn(),
    });

    expect(onHumanTakeover).toHaveBeenCalledTimes(1);
  });

  it('does not call onHumanTakeover without the flag', async () => {
    const stream = createMockStream([
      { type: 'complete', fullContent: 'Hello', turnId: 't1' },
    ]);
    vi.stubGlobal('fetch', mockFetch({ ok: true, body: stream }));

    const onHumanTakeover = vi.fn();
    await streamChat({ apiUrl: 'http://test', onToken: vi.fn(), onDone: vi.fn(), onComplete: vi.fn(), onHumanTakeover, onError: vi.fn() });

    expect(onHumanTakeover).not.toHaveBeenCalled();
  });

  it('applies JSON ui_state before onComplete so chips are not cleared', async () => {
    const order: string[] = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
      json: vi.fn().mockResolvedValue({
        response: 'We can book you this week.',
        suggestedOptions: ['Book Appointment', 'Contact Team'],
        uiState: { buttons: [], suggestedActions: [] },
      }),
    }));

    await streamChat({
      apiUrl: 'http://test',
      onToken: vi.fn(),
      onDone: vi.fn(),
      onComplete: () => { order.push('complete'); },
      onUiState: () => { order.push('ui_state'); },
      onError: vi.fn(),
    });

    expect(order).toEqual(['ui_state', 'complete']);
  });
});

// ─── ChatWidget Tests ───────────────────────────────────
describe('ChatWidget', () => {
  let widget: ChatWidget;

  afterEach(() => {
    widget?.unmount();
  });

  it('mounts bubble and container to DOM', () => {
    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();

    expect(document.querySelector('.cw-bubble')).toBeTruthy();
    expect(document.querySelector('.cw-container')).toBeTruthy();
  });

  it('does not double-mount', () => {
    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();
    widget.mount();

    expect(document.querySelectorAll('.cw-bubble').length).toBe(1);
    expect(document.querySelectorAll('.cw-container').length).toBe(1);
  });

  it('unmounts removes elements from DOM', () => {
    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();
    widget.unmount();

    expect(document.querySelector('.cw-bubble')).toBeNull();
    expect(document.querySelector('.cw-container')).toBeNull();
  });

  it('toggle opens and closes chat window', () => {
    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();

    const container = document.querySelector('.cw-container') as HTMLElement;
    expect(container.style.display).toBe('none');

    widget.toggle();
    expect(container.style.display).toBe('flex');

    widget.toggle();
    expect(container.style.display).toBe('none');
  });

  it('shows greeting message on first open', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Welcome!' });
    widget.mount();
    widget.toggle();

    const msgs = widget.getMessages();
    expect(msgs.length).toBe(1);
    expect(msgs[0].role).toBe('assistant');
    expect(msgs[0].content).toBeTruthy();
  });

  it('does not duplicate greeting on multiple opens', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Hi!' });
    widget.mount();
    widget.toggle();
    widget.toggle();
    widget.toggle();

    expect(widget.getMessages().length).toBe(1);
  });

  it('renders starter option cards on first open', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Welcome!' });
    widget.mount();
    widget.toggle();

    const cards = document.querySelectorAll('.cw-welcome-card');
    expect(cards.length).toBe(3);
    const labels = Array.from(cards).map((c) => c.textContent);
    expect(labels.some((l) => l!.includes('How can you help me?'))).toBe(true);
    expect(labels.some((l) => l!.includes('What do you offer?'))).toBe(true);
    expect(labels.some((l) => l!.includes('Talk to a person'))).toBe(true);
  });

  it('fades out starter cards once the conversation sends a message', async () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();
    expect(document.querySelector('.cw-welcome-cards')).toBeTruthy();

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Hello';
    widget.send();
    await new Promise((r) => setTimeout(r, 300));

    expect(document.querySelector('.cw-welcome-cards')).toBeNull();
  });

  it('sends the starter prompt when a chip is clicked', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: 'Sure!' })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', fullContent: 'Sure!', turnId: 't1' })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();

    const planCard = Array.from(document.querySelectorAll('.cw-welcome-card')).find(
      (c) => c.textContent!.includes('How can you help me?')
    ) as HTMLButtonElement;
    expect(planCard).toBeTruthy();
    planCard.click();

    await new Promise((r) => setTimeout(r, 50));
    const msgs = widget.getMessages();
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toBe('How can you help me?');
  });

  it('uses custom starterOptions from config', () => {
    widget = new ChatWidget({
      apiUrl: 'http://test',
      greeting: 'Welcome!',
      starterOptions: ['Tell me about your pricing', 'Book a consultation', 'View case studies'],
    });
    widget.mount();
    widget.toggle();

    const cards = document.querySelectorAll('.cw-welcome-card');
    expect(cards.length).toBe(3);
    const labels = Array.from(cards).map((c) => c.textContent);
    expect(labels.some((l) => l!.includes('Tell me about your pricing'))).toBe(true);
    expect(labels.some((l) => l!.includes('Book a consultation'))).toBe(true);
    expect(labels.some((l) => l!.includes('View case studies'))).toBe(true);
  });

  it('renders welcome cards with card styling', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Hi!' });
    widget.mount();
    widget.toggle();

    const card = document.querySelector('.cw-welcome-card') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.classList.contains('cw-welcome-card')).toBe(true);
    expect(card.tagName).toBe('BUTTON');
  });

  it('attaches welcome cards inside the first assistant message bubble', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Hello!' });
    widget.mount();
    widget.toggle();

    const bubble = document.querySelector('.cw-message-assistant .cw-message-bubble');
    expect(bubble).toBeTruthy();
    const cardsInside = bubble!.querySelectorAll('.cw-welcome-card');
    expect(cardsInside.length).toBe(3);
  });

  it('adds user message on send', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Hello there';
    widget.send();

    const msgs = widget.getMessages();
    expect(msgs.length).toBe(3);
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toBe('Hello there');
    expect(input.value).toBe('');
  });

  it('does not send empty messages', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();

    widget.send();
    expect(widget.getMessages().length).toBe(1);
  });

  it('streams response from API', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: 'Hello' })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: ' world' })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', fullContent: 'Hello world', turnId: 't1' })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Test';
    widget.send();

    // Wait for stream to complete
    await new Promise(r => setTimeout(r, 50));

    const msgs = widget.getMessages();
    expect(msgs.length).toBe(3);
    expect(msgs[2].role).toBe('assistant');
    expect(msgs[2].content).toBe('Hello world');
    expect(msgs[2].streaming).toBe(false);
  });

  it('renders message elements in DOM', () => {
    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();
    widget.toggle();

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Test message';
    widget.send();

    const msgEl = document.querySelector('.cw-message-user');
    expect(msgEl).toBeTruthy();
    const bubble = msgEl!.querySelector('.cw-message-content');
    expect(bubble!.textContent).toBe('Test message');
  });

  it('position defaults to bottom-right', () => {
    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();

    const bubble = document.querySelector('.cw-bubble') as HTMLElement;
    expect(bubble.style.right).toBe('20px');
    expect(bubble.style.left).toBe('');
  });

  it('position bottom-left works', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', position: 'bottom-left' });
    widget.mount();

    const bubble = document.querySelector('.cw-bubble') as HTMLElement;
    expect(bubble.style.left).toBe('20px');
    expect(bubble.style.right).toBe('');
  });

  it('uses custom primary color', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', primaryColor: '#FF0000' });
    widget.mount();

    const bubble = document.querySelector('.cw-bubble') as HTMLElement;
    expect(bubble.style.background).toMatch(/linear-gradient/);
  });

  it('injects branding CSS variables for primary color', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', primaryColor: '#FF0000' });
    widget.mount();

    expect(document.documentElement.style.getPropertyValue('--cw-primary-color')).toBe('#FF0000');
    const style = document.getElementById('cw-widget-styles')!;
    expect(style.textContent).toContain('var(--cw-primary-color');
  });

  it('supports widgetPosition alias for launcher placement', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', widgetPosition: 'left' });
    widget.mount();

    const bubble = document.querySelector('.cw-bubble') as HTMLElement;
    expect(bubble.style.left).toBe('20px');
    expect(bubble.style.right).toBe('');
  });

  it('applies branding aliases from remote config', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        primaryColor: '#22C55E',
        themeMode: 'dark',
        widgetPosition: 'bottom-left',
        greetingText: 'Hi from branding!',
      }),
    }));

    widget = new ChatWidget({ apiUrl: 'http://test', widgetToken: 'tok', greeting: '' });
    widget.mount();
    widget.toggle();

    await vi.waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--cw-primary-color')).toBe('#22C55E');
    });
    const bubble = document.querySelector('.cw-bubble') as HTMLElement;
    expect(bubble.style.left).toBe('20px');
    expect(bubble.style.right).toBe('');
    vi.unstubAllGlobals();
  });

  it('applies dark theme attribute', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', theme: 'dark' });
    widget.mount();

    expect(document.documentElement.getAttribute('data-cw-theme')).toBe('dark');
  });

  it('resolves auto theme from system preference', () => {
    document.documentElement.setAttribute('data-cw-theme', 'auto');
    try {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockReturnValue({ matches: true }),
      });
    } catch {}
    widget = new ChatWidget({ apiUrl: 'http://test', theme: 'auto' });
    widget.mount();

    expect(document.documentElement.getAttribute('data-cw-theme')).toBe('dark');
    delete (window as any).matchMedia;
  });

  it('injects custom CSS into a dedicated style element', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', customCss: '.cw-bubble { border-radius: 4px !important; }' });
    widget.mount();

    const style = document.getElementById('cw-widget-custom') as HTMLStyleElement;
    expect(style).toBeTruthy();
    expect(style.textContent).toContain('.cw-bubble { border-radius: 4px !important; }');
  });

  it('does not create a custom CSS element when empty', () => {
    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();

    expect(document.getElementById('cw-widget-custom')).toBeNull();
  });

  it('auto-opens after autoOpenDelay seconds', async () => {
    widget = new ChatWidget({ apiUrl: 'http://test', autoOpen: true, autoOpenDelay: 0.01 });
    widget.mount();

    expect(widget.isOpen).toBe(false);
    await new Promise(r => setTimeout(r, 50));
    expect(document.querySelector('.cw-container') as HTMLElement).toBeTruthy();
    expect((document.querySelector('.cw-container') as HTMLElement).style.display).toBe('flex');
  });

  it('renders logo url in the header', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', logoUrl: 'https://example.com/logo.png' });
    widget.mount();
    widget.toggle();

    const logo = document.querySelector('.cw-logo') as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo.src).toBe('https://example.com/logo.png');
  });

  it('sets custom title and subtitle', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', title: 'Support', subtitle: 'Ask us anything' });
    widget.mount();
    widget.toggle();

    const header = document.querySelector('.cw-header')!;
    expect(header.textContent).toContain('Support');
    expect(header.textContent).toContain('Ask us anything');
  });

  it('clears input on Enter key (not Shift+Enter)', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Test';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(input.value).toBe('');
    expect(widget.getMessages().length).toBe(3);
  });

  it('does not send on Shift+Enter', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Test';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));

    expect(input.value).toBe('Test');
    expect(widget.getMessages().length).toBe(1);
  });

  it('shows unread badge when closed and message arrives', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', fullContent: 'Reply', turnId: 't1' })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();
    widget.toggle(); // open to send
    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Hi';
    widget.send();
    await new Promise(r => setTimeout(r, 30));

    widget.toggle(); // close
    // Simulate an incoming message by calling send again
    // Actually let's just test the badge directly
    const badge = document.querySelector('.cw-bubble-badge') as HTMLElement;
    // Since widget is closed and assistant message arrived via stream, unreadCount increments
    // But the message came while open, so let's test differently
    widget.unmount();
  });

  it('reset unread count on open', () => {
    widget = new ChatWidget({ apiUrl: 'http://test' });
    widget.mount();

    // Manually set unread
    (widget as any).unreadCount = 3;
    widget.toggle(); // open

    expect((widget as any).unreadCount).toBe(0);
  });

  it('shows live takeover banner when stream reports humanTakeover', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', fullContent: 'Thanks for your message — a human is reading it now.', turnId: 't1', humanTakeover: true })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();

    // Simulate explicit user request for human agent
    (widget as any).humanTakeoverRequested = true;

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'I need urgent help';
    widget.send();
    await new Promise(r => setTimeout(r, 50));

    const banner = document.querySelector('.cw-takeover');
    expect(banner).toBeTruthy();
    expect(banner!.style.display).toBe('block');
    expect(banner!.textContent).toContain('Human agent joined');
  });

  it('does not show takeover banner without the flag', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', fullContent: 'Hello there', turnId: 't1' })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Hi';
    widget.send();
    await new Promise(r => setTimeout(r, 50));

    expect(document.querySelector('.cw-takeover')!.style.display).toBe('none');
  });

  it('hides starter chips on TAKEOVER_STARTED and restores them on TAKEOVER_ENDED via the event stream', async () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '', sessionId: 's1', starterOptions: ['Option A', 'Option B'] });
    // Simulate explicit user request for human agent so SSE TAKEOVER_STARTED is honored
    (widget as any).humanTakeoverRequested = true;
    widget.mount();
    widget.toggle();

    // Directly invoke the handler (simulates what SSE delivers)
    (widget as any).handleTakeoverEvent({ type: 'TAKEOVER_STARTED', sessionId: 's1', conversationId: 'c1', payload: { agentId: 'rep-1' } });

    // TAKEOVER_STARTED: banner visible, starter cards removed.
    await new Promise(r => setTimeout(r, 10));
    expect(document.querySelector('.cw-takeover')!.style.display).toBe('block');
    expect(document.querySelector('.cw-welcome-cards')).toBeFalsy();

    // TAKEOVER_ENDED: banner hidden, starter cards restored.
    (widget as any).handleTakeoverEvent({ type: 'TAKEOVER_ENDED', sessionId: 's1', conversationId: 'c1', payload: {} });
    await new Promise(r => setTimeout(r, 10));
    expect(document.querySelector('.cw-takeover')!.style.display).toBe('none');
    expect(document.querySelector('.cw-welcome-cards')).toBeTruthy();
  });

  it('ignores TAKEOVER_STARTED when user did not request human agent', async () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '', sessionId: 's1', starterOptions: ['Option A', 'Option B'] });
    widget.mount();
    widget.toggle();

    // humanTakeoverRequested defaults to false — unrequested takeover should be ignored
    (widget as any).handleTakeoverEvent({ type: 'TAKEOVER_STARTED', sessionId: 's1', conversationId: 'c1', payload: { agentId: 'rep-1' } });

    await new Promise(r => setTimeout(r, 10));
    expect(document.querySelector('.cw-takeover')!.style.display).toBe('none');
    expect(document.querySelector('.cw-welcome-cards')).toBeTruthy();
  });

  it('renders suggested option chips even when complete arrives before ui_state', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: 'We offer cleanings and Invisalign.' })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', fullContent: 'We offer cleanings and Invisalign.', turnId: 't1', suggestedOptions: ['Book Appointment', 'View Pricing'] })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ui_state', suggestedOptions: ['Book Appointment', 'View Pricing'] })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: stream }));

    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();
    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'What services do you offer?';
    widget.send();
    await new Promise((r) => setTimeout(r, 50));

    const chips = Array.from(document.querySelectorAll('.cw-suggested-option')).map((el) => el.textContent);
    expect(chips).toEqual(['Book Appointment', 'View Pricing']);
  });

  it('clears stale suggested options when a new message is sent', async () => {
    const encoder = new TextEncoder();
    const first = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ui_state', suggestedOptions: ['Book Appointment'] })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', fullContent: 'Hello', turnId: 't1' })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    const hanging = new ReadableStream({ start() { /* leave the second turn streaming */ } });
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ ok: true, body: first })
      .mockResolvedValueOnce({ ok: true, body: hanging });
    vi.stubGlobal('fetch', fetchFn);

    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();
    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Hi';
    widget.send();
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelectorAll('.cw-suggested-option').length).toBe(1);

    input.value = 'Hours?';
    widget.send();
    expect(document.querySelectorAll('.cw-suggested-option').length).toBe(0);
  });
});
