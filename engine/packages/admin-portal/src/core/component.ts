export type EventListener = (event: Event) => void;

export abstract class Component {
  protected el: HTMLElement;
  protected listeners: Array<() => void> = [];
  private childComponents: Component[] = [];

  constructor(tag = 'div') {
    this.el = document.createElement(tag);
  }

  abstract render(): void;

  mount(parent: HTMLElement): void {
    this.render();
    parent.appendChild(this.el);
    this.onMount();
  }

  onMount(): void {}

  unmount(): void {
    this.childComponents.forEach(c => c.unmount());
    this.childComponents = [];
    this.listeners.forEach(unsub => unsub());
    this.listeners = [];
    this.el.remove();
  }

  getElement(): HTMLElement { return this.el; }

  on(target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions): void {
    target.addEventListener(event, handler, options);
    this.listeners.push(() => target.removeEventListener(event, handler, options));
  }

  addChild(child: Component, parent?: HTMLElement): void {
    this.childComponents.push(child);
    child.mount(parent || this.el);
  }

  removeChild(child: Component): void {
    child.unmount();
    this.childComponents = this.childComponents.filter(c => c !== child);
  }

  setClassName(name: string): void { this.el.className = name; }
  setStyle(styles: Partial<CSSStyleDeclaration>): void { Object.assign(this.el.style, styles); }
  setText(text: string): void { this.el.textContent = text; }
  setHTML(html: string): void { this.el.innerHTML = html; }
  setAttr(name: string, value: string): void { this.el.setAttribute(name, value); }
  setTestId(id: string): void { this.el.setAttribute('data-testid', id); }

  show(): void { this.el.style.display = ''; }
  hide(): void { this.el.style.display = 'none'; }

  createElement<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string>, text?: string): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text) el.textContent = text;
    return el;
  }
}
