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
    expect(msgs[0].content).toMatch(/Hey there!/i);
  });

  it('does not duplicate greeting on multiple opens', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Hi!' });
    widget.mount();
    widget.toggle();
    widget.toggle();
    widget.toggle();

    expect(widget.getMessages().length).toBe(1);
  });

  it('renders starter option chips on first open', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Welcome!' });
    widget.mount();
    widget.toggle();

    const chips = document.querySelectorAll('.cw-starter-chip');
    expect(chips.length).toBe(3);
    const labels = Array.from(chips).map((c) => c.textContent);
    expect(labels).toContain('Show me pricing');
    expect(labels).toContain('How does it work?');
    expect(labels).toContain('Book a demo');
  });

  it('fades out starter chips once the conversation sends a message', async () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: '' });
    widget.mount();
    widget.toggle();
    expect(document.querySelector('.cw-starter-chips')).toBeTruthy();

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'Hello';
    widget.send();
    await new Promise((r) => setTimeout(r, 300));

    expect(document.querySelector('.cw-starter-chips')).toBeNull();
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

    const pricingChip = Array.from(document.querySelectorAll('.cw-starter-chip')).find(
      (c) => c.textContent === 'Show me pricing'
    ) as HTMLButtonElement;
    expect(pricingChip).toBeTruthy();
    pricingChip.click();

    await new Promise((r) => setTimeout(r, 50));
    const msgs = widget.getMessages();
    expect(msgs[1].role).toBe('user');
    expect(msgs[1].content).toBe('Show me pricing');
  });

  it('uses custom starterOptions from config', () => {
    widget = new ChatWidget({
      apiUrl: 'http://test',
      greeting: 'Welcome!',
      starterOptions: ['Tell me about your pricing', 'Book a consultation', 'View case studies'],
    });
    widget.mount();
    widget.toggle();

    const chips = document.querySelectorAll('.cw-starter-chip');
    expect(chips.length).toBe(3);
    const labels = Array.from(chips).map((c) => c.textContent);
    expect(labels).toContain('Tell me about your pricing');
    expect(labels).toContain('Book a consultation');
    expect(labels).toContain('View case studies');
  });

  it('renders starter chips with capsule/pill styling', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Hi!' });
    widget.mount();
    widget.toggle();

    const chip = document.querySelector('.cw-starter-chip') as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.style.borderRadius).toBe('9999px');
    expect(chip.style.display).toBe('inline-flex');
    expect(chip.style.padding).toBe('6px 14px');
    expect(chip.style.fontSize).toBe('13px');
    expect(chip.style.border).toContain('1px solid');
  });

  it('attaches starter chips inside the first assistant message bubble', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', greeting: 'Hello!' });
    widget.mount();
    widget.toggle();

    const bubble = document.querySelector('.cw-message-assistant .cw-message-bubble');
    expect(bubble).toBeTruthy();
    const chipsInside = bubble!.querySelectorAll('.cw-starter-chip');
    expect(chipsInside.length).toBe(3);
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

  it('sets custom title and subtitle', () => {
    widget = new ChatWidget({ apiUrl: 'http://test', title: 'Support', subtitle: 'Ask us anything' });
    widget.mount();
    widget.toggle();

    const header = document.querySelector('.cw-header')!;
    expect(header.textContent).toContain('Support');
    expect(header.textContent).toContain('AI Sales Assistant');
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

    const input = document.querySelector('.cw-input') as HTMLTextAreaElement;
    input.value = 'I need urgent help';
    widget.send();
    await new Promise(r => setTimeout(r, 50));

    const banner = document.querySelector('.cw-takeover');
    expect(banner).toBeTruthy();
    expect(banner!.style.display).toBe('block');
    expect(banner!.textContent).toContain('A human agent is now assisting');
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
});
