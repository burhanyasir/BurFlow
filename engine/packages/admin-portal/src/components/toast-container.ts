import { Component } from '../core/component';

export class ToastContainer extends Component {
  private toasts: Array<{ id: string; type: string; message: string }> = [];

  constructor() {
    super('div');
    this.setClassName('toast-container');
    this.setTestId('toast-container');
    this.setStyle({ position: 'fixed', top: '16px', right: '16px', zIndex: '9999', display: 'flex', flexDirection: 'column', gap: '8px' });
  }

  render(): void {
    this.el.innerHTML = '';
    this.toasts.forEach(t => {
      const toast = this.createElement('div', { class: `toast toast-${t.type}`, 'data-testid': 'toast' }, t.message);
      this.setStyle_forToast(toast, t.type);
      const closeBtn = this.createElement('button', { class: 'toast-close', 'aria-label': 'Close' }, '\u00D7');
      closeBtn.style.cssText = 'background:none;border:none;color:inherit;cursor:pointer;font-size:16px;margin-left:8px;float:right;';
      toast.appendChild(closeBtn);
      this.on(closeBtn, 'click', () => this.removeToast(t.id));
      this.el.appendChild(toast);
    });
  }

  private setStyle_forToast(el: HTMLElement, type: string): void {
    const colors: Record<string, string> = {
      success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b',
    };
    el.style.cssText = `padding:12px 16px;border-radius:6px;color:white;display:flex;align-items:center;justify-content:space-between;min-width:300px;background:${colors[type] || colors.info};box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
  }

  addToast(type: string, message: string, duration = 5000): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.toasts = [...this.toasts, { id, type, message }];
    this.render();
    if (duration > 0) setTimeout(() => this.removeToast(id), duration);
    return id;
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.render();
  }

  success(msg: string, duration?: number): string { return this.addToast('success', msg, duration); }
  error(msg: string, duration?: number): string { return this.addToast('error', msg, duration); }
  info(msg: string, duration?: number): string { return this.addToast('info', msg, duration); }
  warning(msg: string, duration?: number): string { return this.addToast('warning', msg, duration); }
  getToasts(): readonly { id: string; type: string; message: string }[] { return this.toasts; }
}
