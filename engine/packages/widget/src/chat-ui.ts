import { WidgetConfig, ChatMessage } from './types';
import { streamChat } from './stream-client';

const DEFAULT_CONFIG: Required<Omit<WidgetConfig, 'tenantId' | 'apiKey' | 'widgetToken' | 'sessionId'>> & { tenantId?: string; apiKey?: string; widgetToken?: string; sessionId?: string } = {
  apiUrl: '',
  tenantId: undefined as any,
  apiKey: undefined as any,
  sessionId: undefined as any,
  widgetToken: undefined as any,
  title: 'Chat Support',
  subtitle: 'We typically reply in a few minutes',
  primaryColor: '#3B82F6',
  greeting: 'Hello! How can I help you today?',
  position: 'bottom-right',
};

let messageIdCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++messageIdCounter}`;
}

export class ChatWidget {
  private config: typeof DEFAULT_CONFIG;
  private messages: ChatMessage[] = [];
  private isOpen = false;
  private isStreaming = false;
  private abortController: AbortController | null = null;
  private container: HTMLDivElement | null = null;
  private messagesEl: HTMLDivElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;
  private sendBtnEl: HTMLButtonElement | null = null;
  private bubbleEl: HTMLDivElement | null = null;
  private unreadCount = 0;
  private unreadBadge: HTMLSpanElement | null = null;

  constructor(config: WidgetConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  mount(): void {
    if (this.container) return;
    this.createBubble();
    this.createChatWindow();
  }

  unmount(): void {
    this.abort();
    this.container?.remove();
    this.bubbleEl?.remove();
    this.container = null;
    this.bubbleEl = null;
    this.messagesEl = null;
    this.inputEl = null;
  }

  private createBubble(): void {
    const bubble = document.createElement('div');
    bubble.className = 'cw-bubble';
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.setAttribute('tabindex', '0');
    bubble.style.cssText = this.getBubbleStyles();

    const icon = document.createElement('div');
    icon.className = 'cw-bubble-icon';
    icon.innerHTML = this.getChatIconSvg();
    bubble.appendChild(icon);

    const badge = document.createElement('span');
    badge.className = 'cw-bubble-badge';
    badge.style.cssText = 'display:none;position:absolute;top:-4px;right:-4px;background:#EF4444;color:#fff;border-radius:50%;width:20px;height:20px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:600;';
    bubble.appendChild(badge);
    this.unreadBadge = badge;

    bubble.addEventListener('click', () => this.toggle());
    bubble.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggle(); }
    });

    document.body.appendChild(bubble);
    this.bubbleEl = bubble;
  }

  private createChatWindow(): void {
    const container = document.createElement('div');
    container.className = 'cw-container';
    container.style.cssText = this.getContainerStyles();
    container.style.display = 'none';

    container.appendChild(this.createHeader());
    this.messagesEl = this.createMessagesArea();
    container.appendChild(this.messagesEl);
    container.appendChild(this.createInputArea());

    document.body.appendChild(container);
    this.container = container;
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'cw-header';
    header.style.cssText = `background:${this.config.primaryColor};color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between;border-radius:12px 12px 0 0;`;

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;font-size:15px;';
    title.textContent = this.config.title;
    info.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:12px;opacity:0.85;margin-top:2px;';
    subtitle.textContent = this.config.subtitle;
    info.appendChild(subtitle);
    header.appendChild(info);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'cw-close';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.style.cssText = 'background:none;border:none;color:#fff;cursor:pointer;padding:4px;border-radius:4px;font-size:18px;line-height:1;';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.toggle());
    header.appendChild(closeBtn);

    return header;
  }

  private createMessagesArea(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'cw-messages';
    el.style.cssText = 'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;min-height:300px;max-height:400px;background:#F9FAFB;';
    return el;
  }

  private createInputArea(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'cw-input-area';
    wrapper.style.cssText = 'padding:12px;border-top:1px solid #E5E7EB;display:flex;gap:8px;align-items:flex-end;background:#fff;border-radius:0 0 12px 12px;';

    const textarea = document.createElement('textarea');
    textarea.className = 'cw-input';
    textarea.placeholder = 'Type your message...';
    textarea.rows = 1;
    textarea.style.cssText = 'flex:1;resize:none;border:1px solid #D1D5DB;border-radius:8px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none;max-height:120px;min-height:40px;line-height:1.4;';
    textarea.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
    this.inputEl = textarea;

    const sendBtn = document.createElement('button');
    sendBtn.className = 'cw-send';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.style.cssText = `background:${this.config.primaryColor};color:#fff;border:none;border-radius:8px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;`;
    sendBtn.innerHTML = this.getSendIconSvg();
    sendBtn.addEventListener('click', () => this.send());
    this.sendBtnEl = sendBtn;

    wrapper.appendChild(textarea);
    wrapper.appendChild(sendBtn);
    return wrapper;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (!this.container) return;
    this.container.style.display = this.isOpen ? 'flex' : 'none';
    if (this.isOpen) {
      this.unreadCount = 0;
      this.updateBadge();
      this.inputEl?.focus();
      this.scrollToBottom();
      if (this.messages.length === 0 && this.config.greeting) {
        this.addMessage({ role: 'assistant', content: this.config.greeting });
      }
    }
  }

  send(): void {
    const text = this.inputEl?.value.trim();
    if (!text || this.isStreaming) return;

    this.inputEl!.value = '';
    this.inputEl!.style.height = 'auto';
    this.addMessage({ role: 'user', content: text });
    this.streamResponse(text);
  }

  private async streamResponse(userMessage: string): Promise<void> {
    this.isStreaming = true;
    this.updateSendButton();

    const assistantMsg = this.addMessage({ role: 'assistant', content: '', streaming: true });
    this.scrollToBottom();

    this.abortController = new AbortController();

    await streamChat({
      apiUrl: this.config.apiUrl,
      tenantId: this.config.tenantId,
      apiKey: this.config.apiKey,
      widgetToken: this.config.widgetToken,
      sessionId: this.config.sessionId,
      signal: this.abortController.signal,
      onToken: (delta) => {
        assistantMsg.content += delta;
        this.updateMessageContent(assistantMsg);
        this.scrollToBottom();
      },
      onDone: () => {},
      onComplete: (fullContent) => {
        if (fullContent) assistantMsg.content = fullContent;
        assistantMsg.streaming = false;
        this.updateMessageContent(assistantMsg);
        this.isStreaming = false;
        this.updateSendButton();
        this.scrollToBottom();
      },
      onError: (error) => {
        assistantMsg.streaming = false;
        assistantMsg.content = assistantMsg.content || `Error: ${error}`;
        this.updateMessageContent(assistantMsg);
        this.isStreaming = false;
        this.updateSendButton();
      },
    });
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.isStreaming = false;
    this.updateSendButton();
  }

  private addMessage(partial: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const msg: ChatMessage = {
      id: nextId(),
      timestamp: Date.now(),
      ...partial,
    };
    this.messages.push(msg);
    this.renderMessage(msg);
    if (msg.role === 'assistant' && !this.isOpen) {
      this.unreadCount++;
      this.updateBadge();
    }
    return msg;
  }

  private renderMessage(msg: ChatMessage): void {
    if (!this.messagesEl) return;
    const el = document.createElement('div');
    el.className = `cw-message cw-message-${msg.role}`;
    el.setAttribute('data-message-id', msg.id);
    el.style.cssText = `display:flex;${msg.role === 'user' ? 'justify-content:flex-end' : 'justify-content:flex-start'};`;

    const bubble = document.createElement('div');
    bubble.className = 'cw-message-bubble';
    const isUser = msg.role === 'user';
    bubble.style.cssText = `max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;word-wrap:break-word;${isUser
      ? `background:${this.config.primaryColor};color:#fff;border-bottom-right-radius:4px;`
      : 'background:#fff;color:#111827;border:1px solid #E5E7EB;border-bottom-left-radius:4px;'
    }`;

    const content = document.createElement('div');
    content.className = 'cw-message-content';
    content.textContent = msg.content;
    bubble.appendChild(content);

    if (msg.streaming) {
      const cursor = document.createElement('span');
      cursor.className = 'cw-cursor';
      cursor.style.cssText = 'display:inline-block;width:2px;height:14px;background:' + (isUser ? '#fff' : this.config.primaryColor) + ';margin-left:2px;animation:cw-blink 1s step-end infinite;vertical-align:text-bottom;';
      bubble.appendChild(cursor);
    }

    el.appendChild(bubble);
    this.messagesEl.appendChild(el);
  }

  private updateMessageContent(msg: ChatMessage): void {
    if (!this.messagesEl) return;
    const el = this.messagesEl.querySelector(`[data-message-id="${msg.id}"]`);
    if (!el) return;
    const contentEl = el.querySelector('.cw-message-content');
    if (contentEl) {
      contentEl.textContent = msg.content;
    }
    const cursor = el.querySelector('.cw-cursor');
    if (cursor && !msg.streaming) {
      cursor.remove();
    }
  }

  private scrollToBottom(): void {
    if (this.messagesEl) {
      this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }
  }

  private updateSendButton(): void {
    if (!this.sendBtnEl) return;
    this.sendBtnEl.disabled = this.isStreaming;
    this.sendBtnEl.style.opacity = this.isStreaming ? '0.5' : '1';
    this.sendBtnEl.style.cursor = this.isStreaming ? 'not-allowed' : 'pointer';
  }

  private updateBadge(): void {
    if (!this.unreadBadge) return;
    if (this.unreadCount > 0) {
      this.unreadBadge.textContent = String(this.unreadCount);
      this.unreadBadge.style.display = 'flex';
    } else {
      this.unreadBadge.style.display = 'none';
    }
  }

  private getBubbleStyles(): string {
    const pos = this.config.position === 'bottom-left' ? 'left:20px;' : 'right:20px;';
    return `position:fixed;bottom:20px;${pos}width:56px;height:56px;border-radius:50%;background:${this.config.primaryColor};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;transition:transform 0.2s;`;
  }

  private getContainerStyles(): string {
    const pos = this.config.position === 'bottom-left' ? 'left:20px;' : 'right:20px;';
    return `position:fixed;bottom:88px;${pos}width:380px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.15);z-index:999998;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`;
  }

  private getChatIconSvg(): string {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  }

  private getSendIconSvg(): string {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }
}
