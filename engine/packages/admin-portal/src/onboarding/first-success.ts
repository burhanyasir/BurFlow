import { Component } from '../core/component';

interface SuccessCallbacks {
  onTestChatbot: () => void;
  onViewDashboard: () => void;
  onGoToAnalytics: () => void;
}

export class FirstSuccessScreen extends Component {
  private callbacks: SuccessCallbacks;

  constructor(callbacks: SuccessCallbacks) {
    super();
    this.callbacks = callbacks;
    this.setTestId('first-success-screen');
  }

  render(): void {
    this.el.innerHTML = `
      <div style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;" data-testid="success-overlay">
        <div style="background:#fff;border-radius:16px;width:480px;max-width:90vw;padding:40px 32px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.25);">
          <div style="width:80px;height:80px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:40px;">🎉</div>
          <h2 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 8px 0;">Widget Installed!</h2>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin:16px 0;">
            <span style="width:24px;height:24px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;">✓</span>
            <span style="font-size:16px;color:#166534;font-weight:500;">Ready to answer customers</span>
          </div>
          <p style="font-size:14px;color:#6b7280;margin:0 0 24px 0;">Your chatbot widget is now active on your website. Customers can start asking questions immediately.</p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <button data-testid="success-test" style="padding:12px 24px;background:#7c2d12;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;">Test Your Chatbot</button>
            <button data-testid="success-dashboard" style="padding:10px 24px;background:transparent;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;">View Dashboard</button>
            <button data-testid="success-analytics" style="padding:10px 24px;background:transparent;color:#7c2d12;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;">Go to Analytics</button>
          </div>
        </div>
      </div>
    `;

    this.el.querySelector('[data-testid="success-test"]')?.addEventListener('click', () => this.callbacks.onTestChatbot());
    this.el.querySelector('[data-testid="success-dashboard"]')?.addEventListener('click', () => this.callbacks.onViewDashboard());
    this.el.querySelector('[data-testid="success-analytics"]')?.addEventListener('click', () => this.callbacks.onGoToAnalytics());
  }
}
