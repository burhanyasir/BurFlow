import { Component } from '../core/component';

export class HelpPanel extends Component {
  private collapsed: boolean;

  constructor(collapsed = false) {
    super();
    this.collapsed = collapsed;
    this.setTestId('help-panel');
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.render();
  }

  render(): void {
    if (this.collapsed) {
      this.el.innerHTML = `
        <div style="padding:8px;border-top:1px solid #374151;">
          <button data-testid="help-toggle" style="width:100%;padding:8px;background:transparent;border:none;cursor:pointer;color:#9ca3af;font-size:18px;" title="Help">?</button>
        </div>
      `;
      return;
    }

    const links = [
      { icon: '📖', label: 'Documentation', url: '/docs' },
      { icon: '🎥', label: 'Video Tutorials', url: '/docs#tutorials' },
      { icon: '💬', label: 'Support', url: '/contact' },
      { icon: '📅', label: 'Book Demo', url: '/contact' },
    ];

    this.el.innerHTML = `
      <div style="padding:12px 16px;border-top:1px solid #374151;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Help & Resources</span>
          <button data-testid="help-toggle" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:16px;padding:2px;">−</button>
        </div>
        ${links.map(link => `
          <a href="${link.url}" style="display:flex;align-items:center;gap:8px;padding:8px 0;text-decoration:none;color:#d1d5db;font-size:13px;transition:color 0.15s;"
             onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#d1d5db'">
            <span>${link.icon}</span>
            <span>${link.label}</span>
          </a>
        `).join('')}
      </div>
    `;

    this.el.querySelector('[data-testid="help-toggle"]')?.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.render();
    });
  }
}
