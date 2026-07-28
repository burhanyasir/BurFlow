import { Component } from '../core/component';

export class ProgressBar extends Component {
  private value: number;
  private max: number;
  private label: string;
  private showPercent: boolean;

  constructor(value: number, max = 100, label = '', showPercent = true) {
    super('div');
    this.value = value;
    this.max = max;
    this.label = label;
    this.showPercent = showPercent;
    this.setClassName('progress-bar');
    this.setTestId('progress-bar');
  }

  render(): void {
    this.el.innerHTML = '';
    const pct = this.max > 0 ? Math.min(100, (this.value / this.max) * 100) : 0;

    if (this.label) {
      const labelEl = this.createElement('div', { class: 'progress-label' });
      labelEl.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;color:#374151;';
      labelEl.appendChild(this.createElement('span', {}, this.label));
      if (this.showPercent) labelEl.appendChild(this.createElement('span', {}, `${Math.round(pct)}%`));
      this.el.appendChild(labelEl);
    }

    const track = this.createElement('div', { class: 'progress-track', 'data-testid': 'progress-track' });
    track.style.cssText = 'height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;';
    const fill = this.createElement('div', { class: 'progress-fill', 'data-testid': 'progress-fill' });
    fill.style.cssText = `height:100%;width:${pct}%;background:${this.getColor(pct)};border-radius:4px;transition:width 0.3s ease;`;
    track.appendChild(fill);
    this.el.appendChild(track);
  }

  private getColor(pct: number): string {
    if (pct >= 100) return '#10b981';
    if (pct >= 60) return '#3b82f6';
    if (pct >= 30) return '#f59e0b';
    return '#ef4444';
  }

  update(value: number): void { this.value = value; this.render(); }
}

export class Badge extends Component {
  private text: string;
  private variant: string;

  constructor(text: string, variant = 'default') {
    super('span');
    this.text = text;
    this.variant = variant;
    this.setClassName(`badge badge-${variant}`);
  }

  render(): void {
    this.el.textContent = this.text;
    const colors: Record<string, string> = {
      success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6',
      default: '#6b7280', purple: '#8b5cf6',
    };
    this.el.style.cssText = `display:inline-block;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:500;background:${colors[this.variant] || colors.default};color:white;`;
  }

  updateText(text: string): void { this.text = text; this.render(); }
}

export function StatusBadge({ status }: { status: string }): Badge {
  const variants: Record<string, string> = {
    active: 'success', published: 'success', completed: 'success',
    queued: 'info', processing: 'info', parsing: 'info', normalizing: 'info', chunking: 'info', embedding: 'info', indexed: 'info',
    failed: 'error', escalated: 'error',
    ended: 'default',
  };
  return new Badge(status, variants[status] || 'default');
}

export function RoleBadge({ role }: { role: string }): Badge {
  const variants: Record<string, string> = {
    owner: 'purple', admin: 'error', operator: 'warning', member: 'info', viewer: 'default',
    'end-user': 'default', service: 'info',
  };
  return new Badge(role, variants[role] || 'default');
}
