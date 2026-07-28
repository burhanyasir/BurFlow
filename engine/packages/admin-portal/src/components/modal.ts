import { Component } from '../core/component';

export interface ModalOptions {
  title: string;
  content: string | HTMLElement;
  onClose?: () => void;
  actions?: Array<{ label: string; onClick: () => void; variant?: 'primary' | 'danger' | 'secondary' }>;
  testId?: string;
}

export class Modal extends Component {
  private options: ModalOptions;
  private backdrop: HTMLElement;
  private escapeHandler?: (e: KeyboardEvent) => void;

  constructor(options: ModalOptions) {
    super('div');
    this.options = options;
    this.backdrop = document.createElement('div');
    this.backdrop.setAttribute('data-testid', options.testId || 'modal-backdrop');
    this.backdrop.className = 'modal-backdrop';
    this.setClassName('modal-container');
  }

  render(): void {
    this.backdrop.innerHTML = '';
    this.el.innerHTML = '';

    const modal = this.createElement('div', { class: 'modal' });
    if (this.options.testId) modal.setAttribute('data-testid', this.options.testId!);

    const header = this.createElement('div', { class: 'modal-header' });
    header.appendChild(this.createElement('h2', {}, this.options.title));
    const closeBtn = this.createElement('button', { class: 'modal-close', 'aria-label': 'Close' }, '\u00D7');
    this.on(closeBtn, 'click', () => this.close());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const body = this.createElement('div', { class: 'modal-body' });
    if (typeof this.options.content === 'string') body.innerHTML = this.options.content;
    else body.appendChild(this.options.content);
    modal.appendChild(body);

    if (this.options.actions && this.options.actions.length > 0) {
      const footer = this.createElement('div', { class: 'modal-footer' });
      this.options.actions.forEach(action => {
        const btn = this.createElement('button', {
          class: `btn btn-${action.variant || 'primary'}`,
        }, action.label);
        this.on(btn, 'click', () => { action.onClick(); this.close(); });
        footer.appendChild(btn);
      });
      modal.appendChild(footer);
    }

    this.backdrop.appendChild(modal);
    this.on(this.backdrop, 'click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
    this.el.appendChild(this.backdrop);
  }

  open(): void {
    this.render();
    document.body.appendChild(this.el);
    this.escapeHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this.escapeHandler);
  }

  close(): void {
    if (this.escapeHandler) document.removeEventListener('keydown', this.escapeHandler);
    this.options.onClose?.();
    this.unmount();
  }
}
