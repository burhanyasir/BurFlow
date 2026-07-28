import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { getAuth } from '../core/auth';
import { toast } from '../core/toast';

export class SettingsPage extends Component {
  private api: ApiClient;
  private tenant: any = null;
  private activeTab = 'branding';

  constructor(api: ApiClient) {
    super();
    this.api = api;
    this.setTestId('settings-page');
  }

  onMount(): void { this.loadData(); }

  async loadData(): Promise<void> {
    const auth = getAuth();
    if (!auth.tenantId) return;
    try {
      const res = await this.api.getTenant(auth.tenantId);
      this.tenant = res.tenant;
    } catch { /* ignore */ }
    this.render();
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  render(): void {
    const s = this.tenant?.settings || {};
    this.el.innerHTML = `
      <div class="page-header"><h1>Settings</h1><p class="page-subtitle">Configure your tenant</p></div>
      <div class="tabs" data-testid="settings-tabs">
        <button class="tab ${this.activeTab === 'branding' ? 'active' : ''}" data-tab="branding">Branding</button>
        <button class="tab ${this.activeTab === 'ai' ? 'active' : ''}" data-tab="ai">AI Prompt</button>
        <button class="tab ${this.activeTab === 'safety' ? 'active' : ''}" data-tab="safety">Safety</button>
        <button class="tab ${this.activeTab === 'widget' ? 'active' : ''}" data-tab="widget">Widget</button>
      </div>
      <div class="tab-content" data-testid="settings-content">
        ${this.activeTab === 'branding' ? this.renderBranding(s.branding || {}) : ''}
        ${this.activeTab === 'ai' ? this.renderAI(s.ai || {}) : ''}
        ${this.activeTab === 'safety' ? this.renderSafety(s.safety || {}) : ''}
        ${this.activeTab === 'widget' ? this.renderWidget(s.widget || {}) : ''}
      </div>
    `;
    this.el.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = (tab as HTMLElement).dataset.tab || 'branding';
        this.render();
      });
    });
    this.el.querySelectorAll('.form-input, .form-textarea').forEach(input => {
      input.addEventListener('change', () => this.handleSave());
    });
  }

  private renderBranding(b: any): string {
    return `<div class="settings-form">
      <div class="form-group"><label>Company Name</label><input class="form-input" data-testid="input-company" value="${this.esc(b.companyName || '')}" data-field="branding.companyName" /></div>
      <div class="form-group"><label>Primary Color</label><input type="color" class="form-input" data-testid="input-color" value="${this.esc(b.primaryColor || '#3b82f6')}" data-field="branding.primaryColor" style="height:40px;" /></div>
      <div class="form-group"><label>Welcome Message</label><textarea class="form-textarea" data-testid="input-welcome" data-field="branding.welcomeMessage" rows="3">${this.esc(b.welcomeMessage || '')}</textarea></div>
      <div class="form-group"><label>Offline Message</label><textarea class="form-textarea" data-testid="input-offline" data-field="branding.offlineMessage" rows="2">${this.esc(b.offlineMessage || '')}</textarea></div>
    </div>`;
  }

  private renderAI(a: any): string {
    return `<div class="settings-form">
      <div class="form-group"><label>System Prompt</label><textarea class="form-textarea" data-testid="input-prompt" data-field="ai.systemPrompt" rows="6">${this.esc(a.systemPrompt || '')}</textarea></div>
      <div class="form-group"><label>Model</label><input class="form-input" data-testid="input-model" value="${this.esc(a.model || 'gpt-4')}" data-field="ai.model" /></div>
      <div class="form-group"><label>Temperature</label><input type="number" class="form-input" data-testid="input-temp" value="${this.esc(String(a.temperature || 0.7))}" min="0" max="2" step="0.1" data-field="ai.temperature" /></div>
      <div class="form-group"><label>Max Tokens</label><input type="number" class="form-input" data-testid="input-maxtokens" value="${this.esc(String(a.maxTokens || 1024))}" data-field="ai.maxTokens" /></div>
      <div class="form-group"><label>Fallback Response</label><textarea class="form-textarea" data-testid="input-fallback" data-field="ai.fallbackResponse" rows="2">${this.esc(a.fallbackResponse || '')}</textarea></div>
    </div>`;
  }

  private renderSafety(s: any): string {
    return `<div class="settings-form">
      <div class="form-group"><label>Content Filter Threshold</label><select class="form-input" data-testid="input-filter" data-field="safety.contentFilterThreshold">
        <option value="strict" ${s.contentFilterThreshold === 'strict' ? 'selected' : ''}>Strict</option>
        <option value="moderate" ${s.contentFilterThreshold === 'moderate' ? 'selected' : ''}>Moderate</option>
        <option value="relaxed" ${s.contentFilterThreshold === 'relaxed' ? 'selected' : ''}>Relaxed</option>
      </select></div>
      <div class="form-group"><label>PII Redaction Mode</label><select class="form-input" data-testid="input-pii" data-field="safety.piiRedactionMode">
        <option value="allow" ${s.piiRedactionMode === 'allow' ? 'selected' : ''}>Allow</option>
        <option value="notify" ${s.piiRedactionMode === 'notify' ? 'selected' : ''}>Notify</option>
        <option value="mask" ${s.piiRedactionMode === 'mask' ? 'selected' : ''}>Mask</option>
        <option value="block" ${s.piiRedactionMode === 'block' ? 'selected' : ''}>Block</option>
      </select></div>
      <div class="form-group"><label><input type="checkbox" data-testid="input-crisis" data-field="safety.crisisResponseEnabled" ${s.crisisResponseEnabled ? 'checked' : ''} /> Enable Crisis Response</label></div>
    </div>`;
  }

  private renderWidget(w: any): string {
    return `<div class="settings-form">
      <div class="form-group"><label>Position</label><select class="form-input" data-testid="input-position" data-field="widget.position">
        <option value="bottom-right" ${w.position === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
        <option value="bottom-left" ${w.position === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
      </select></div>
      <div class="form-group"><label>Theme</label><select class="form-input" data-testid="input-theme" data-field="widget.theme">
        <option value="light" ${w.theme === 'light' ? 'selected' : ''}>Light</option>
        <option value="dark" ${w.theme === 'dark' ? 'selected' : ''}>Dark</option>
        <option value="auto" ${w.theme === 'auto' ? 'selected' : ''}>Auto</option>
      </select></div>
      <div class="form-group"><label><input type="checkbox" data-testid="input-autoopen" data-field="widget.autoOpen" ${w.autoOpen ? 'checked' : ''} /> Auto Open</label></div>
    </div>`;
  }

  private async handleSave(): Promise<void> {
    const auth = getAuth();
    if (!auth.tenantId || !this.tenant) return;
    const settings = { ...this.tenant.settings };
    this.el.querySelectorAll('[data-field]').forEach(el => {
      const field = (el as HTMLElement).dataset.field!;
      const [section, key] = field.split('.');
      if (!settings[section]) settings[section] = {};
      if (el instanceof HTMLInputElement && el.type === 'checkbox') settings[section][key] = el.checked;
      else if (el instanceof HTMLInputElement && el.type === 'number') settings[section][key] = parseFloat(el.value);
      else settings[section][key] = el.value;
    });
    try {
      await this.api.updateTenant(auth.tenantId, { settings });
      this.tenant.settings = settings;
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
  }
}
