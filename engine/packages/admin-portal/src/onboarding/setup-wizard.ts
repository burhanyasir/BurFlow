import { Component } from '../core/component';
import { ApiClient } from '../core/api-client';
import { getOnboardingProgress, setOnboardingProgress } from './store';
import type { OnboardingStepId } from './types';
import { toast } from '../core/toast';

const KNOWLEDGE_FALLBACK_WARNING = 'Website scan did not complete; the widget will continue with a basic setup.';

interface WizardCallbacks {
  onComplete: () => void;
  onClose: () => void;
}

const STEPS: { id: OnboardingStepId; label: string; desc: string }[] = [
  { id: 'workspace', label: 'Workspace Name', desc: 'What should we call your workspace?' },
  { id: 'business_type', label: 'Business Type', desc: 'What type of business are you?' },
  { id: 'website', label: 'Primary Website', desc: 'Where can customers find you online?' },
  { id: 'brand_color', label: 'Brand Color', desc: 'Choose a color that represents your brand.' },
  { id: 'logo', label: 'Logo', desc: 'Upload your company logo (optional).' },
  { id: 'knowledge_source', label: 'Knowledge Source', desc: 'Add content so your chatbot can answer questions.' },
  { id: 'widget_install', label: 'Widget Installation', desc: 'Install the chat widget on your site.' },
  { id: 'test_chatbot', label: 'Test Chatbot', desc: 'Send a test message to your chatbot.' },
];

export class SetupWizard extends Component {
  private api: ApiClient;
  private callbacks: WizardCallbacks;
  private currentIndex = 0;
  private formData: Record<string, string> = {};

  // Knowledge source state
  private knowledgeMode: 'upload' | 'crawl' | 'faq' | null = null;
  private knowledgeContent = '';

  constructor(api: ApiClient, callbacks: WizardCallbacks) {
    super();
    this.api = api;
    this.callbacks = callbacks;
    this.setTestId('setup-wizard');
    this.loadProgress();
  }

  private loadProgress(): void {
    const p = getOnboardingProgress();
    if (p?.completedSteps) {
      // Resume from first incomplete step
      for (let i = 0; i < STEPS.length; i++) {
        if (!p.completedSteps.includes(STEPS[i].id)) {
          this.currentIndex = i;
          break;
        }
      }
      this.currentIndex = Math.max(0, this.currentIndex);
    }
  }

  render(): void {
    const step = STEPS[this.currentIndex];
    const total = STEPS.length;
    const pct = Math.round(((this.currentIndex) / total) * 100);

    this.el.innerHTML = `
      <div style="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;" data-testid="wizard-overlay">
        <div style="background:#fff;border-radius:16px;width:560px;max-width:90vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);" data-testid="wizard-container">
          <div style="padding:24px 24px 0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <span style="font-size:13px;color:#6b7280;">Step ${this.currentIndex + 1} of ${total}</span>
              <button data-testid="wizard-close" style="background:none;border:none;cursor:pointer;font-size:20px;color:#9ca3af;padding:4px;">×</button>
            </div>
            <div style="height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-bottom:24px;">
              <div style="height:100%;width:${pct}%;background:#7c2d12;border-radius:2px;transition:width 0.3s;"></div>
            </div>
            <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 4px 0;">${step.label}</h2>
            <p style="font-size:14px;color:#6b7280;margin:0 0 24px 0;">${step.desc}</p>
          </div>
          <div style="padding:0 24px 24px;">
            ${this.renderStepContent(step.id)}
          </div>
          <div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
            <button data-testid="wizard-prev" style="padding:10px 20px;background:transparent;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;${this.currentIndex === 0 ? 'visibility:hidden;' : ''}">Back</button>
            <div style="display:flex;gap:8px;">
              ${this.currentIndex < total - 1
                ? `<button data-testid="wizard-next" style="padding:10px 24px;background:#7c2d12;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Continue</button>`
                : `<button data-testid="wizard-finish" style="padding:10px 24px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;">Complete Setup</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(step.id);
  }

  private renderStepContent(stepId: OnboardingStepId): string {
    switch (stepId) {
      case 'workspace':
        return `
          <div class="form-group">
            <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Workspace Name</label>
            <input class="form-input" data-testid="input-workspace" id="wizard-workspace" value="${this.esc(this.formData.workspace || '')}" placeholder="My Company" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;" />
          </div>
        `;
      case 'business_type':
        return `
          <div class="form-group">
            <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Business Type</label>
            <select class="form-input" data-testid="input-business-type" id="wizard-business" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;">
              <option value="">Select...</option>
              <option value="ecommerce" ${this.formData.businessType === 'ecommerce' ? 'selected' : ''}>E-commerce</option>
              <option value="saas" ${this.formData.businessType === 'saas' ? 'selected' : ''}>SaaS / Technology</option>
              <option value="healthcare" ${this.formData.businessType === 'healthcare' ? 'selected' : ''}>Healthcare</option>
              <option value="finance" ${this.formData.businessType === 'finance' ? 'selected' : ''}>Finance</option>
              <option value="education" ${this.formData.businessType === 'education' ? 'selected' : ''}>Education</option>
              <option value="enterprise" ${this.formData.businessType === 'enterprise' ? 'selected' : ''}>Enterprise</option>
              <option value="other" ${this.formData.businessType === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        `;
      case 'website':
        return `
          <div class="form-group">
            <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Website URL</label>
            <input class="form-input" data-testid="input-website" id="wizard-website" value="${this.esc(this.formData.website || '')}" placeholder="https://example.com" type="url" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;" />
          </div>
        `;
      case 'brand_color':
        return `
          <div class="form-group">
            <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Brand Color</label>
            <div style="display:flex;gap:12px;align-items:center;">
              <input type="color" data-testid="input-brand-color" id="wizard-color" value="${this.formData.brandColor || '#7c2d12'}" style="width:60px;height:40px;border:1px solid #d1d5db;border-radius:8px;cursor:pointer;" />
              <span style="font-size:13px;color:#6b7280;" id="wizard-color-label">${this.formData.brandColor || '#7c2d12'}</span>
            </div>
          </div>
        `;
      case 'logo':
        return `
          <div class="form-group">
            <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Company Logo</label>
            <div style="border:2px dashed #d1d5db;border-radius:12px;padding:40px;text-align:center;cursor:pointer;transition:border-color 0.15s;" data-testid="logo-upload-zone">
              <div style="font-size:32px;margin-bottom:8px;">📁</div>
              <p style="font-size:14px;color:#6b7280;margin:0;">Drag and drop your logo here, or <span style="color:#7c2d12;font-weight:500;">browse</span></p>
              <p style="font-size:12px;color:#9ca3af;margin:4px 0 0 0;">PNG, JPG, SVG — max 2MB</p>
            </div>
          </div>
        `;
      case 'knowledge_source':
        return `
          <div style="margin-bottom:16px;">
            <p style="font-size:14px;color:#374151;margin:0 0 12px 0;">Choose how to add your first knowledge source:</p>
            <div style="display:grid;gap:12px;">
              <button data-testid="kb-upload" class="kb-option ${this.knowledgeMode === 'upload' ? 'selected' : ''}" style="text-align:left;padding:16px;border:2px solid ${this.knowledgeMode === 'upload' ? '#7c2d12' : '#e5e7eb'};border-radius:10px;background:${this.knowledgeMode === 'upload' ? '#fef3c7' : '#fff'};cursor:pointer;font-family:inherit;width:100%;">
                <div style="font-weight:600;color:#111827;margin-bottom:4px;">📄 Upload Files</div>
                <div style="font-size:13px;color:#6b7280;">Upload documents, PDFs, or text files</div>
              </button>
              <button data-testid="kb-crawl" class="kb-option ${this.knowledgeMode === 'crawl' ? 'selected' : ''}" style="text-align:left;padding:16px;border:2px solid ${this.knowledgeMode === 'crawl' ? '#7c2d12' : '#e5e7eb'};border-radius:10px;background:${this.knowledgeMode === 'crawl' ? '#fef3c7' : '#fff'};cursor:pointer;font-family:inherit;width:100%;">
                <div style="font-weight:600;color:#111827;margin-bottom:4px;">🌐 Website Crawl</div>
                <div style="font-size:13px;color:#6b7280;">Automatically crawl your website for content</div>
              </button>
              <button data-testid="kb-faq" class="kb-option ${this.knowledgeMode === 'faq' ? 'selected' : ''}" style="text-align:left;padding:16px;border:2px solid ${this.knowledgeMode === 'faq' ? '#7c2d12' : '#e5e7eb'};border-radius:10px;background:${this.knowledgeMode === 'faq' ? '#fef3c7' : '#fff'};cursor:pointer;font-family:inherit;width:100%;">
                <div style="font-weight:600;color:#111827;margin-bottom:4px;">❓ Manual FAQ</div>
                <div style="font-size:13px;color:#6b7280;">Write common questions and answers</div>
              </button>
            </div>
          </div>
          ${this.knowledgeMode ? this.renderKnowledgeForm() : ''}
        `;
      case 'widget_install':
        return `
          <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:16px;">
            <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px;">Widget Installation</div>
            <p style="font-size:13px;color:#6b7280;margin:0 0 12px 0;">Add this snippet to your website's &lt;head&gt; tag:</p>
            <pre style="background:#1f2937;color:#e5e7eb;padding:16px;border-radius:8px;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;">&lt;script src="${window.location.origin}/widget.js" data-tenant-id="${this.esc(this.formData.tenantId || 'YOUR_TENANT_ID')}"&gt;&lt;/script&gt;</pre>
          </div>
          <div style="display:flex;align-items:center;gap:12px;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
            <input type="checkbox" data-testid="check-widget-installed" id="wizard-widget-check" style="width:18px;height:18px;accent-color:#10b981;" />
            <label for="wizard-widget-check" style="font-size:14px;color:#166534;cursor:pointer;">I have installed the widget on my website</label>
          </div>
        `;
      case 'test_chatbot':
        return `
          <div style="margin-bottom:16px;">
            <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:12px;">
              <p style="font-size:14px;color:#374151;margin:0 0 8px 0;">Send a test message:</p>
              <div style="display:flex;gap:8px;">
                <input class="form-input" data-testid="input-test-query" id="wizard-test-query" placeholder="Type a question..." style="flex:1;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;" />
                <button data-testid="btn-send-test" style="padding:10px 16px;background:#7c2d12;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">Send</button>
              </div>
            </div>
            <div id="test-response" style="display:none;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;font-size:14px;color:#166534;"></div>
          </div>
        `;
      default:
        return '<p>Unknown step</p>';
    }
  }

  private renderKnowledgeForm(): string {
    switch (this.knowledgeMode) {
      case 'upload':
        return `<div class="form-group" style="margin-top:12px;">
          <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">File Content</label>
          <textarea class="form-textarea" data-testid="textarea-knowledge" id="wizard-knowledge" rows="5" placeholder="Paste your document content here..." style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;resize:vertical;">${this.esc(this.knowledgeContent)}</textarea>
        </div>`;
      case 'crawl':
        return `<div class="form-group" style="margin-top:12px;">
          <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">Website URL to Crawl</label>
          <input class="form-input" data-testid="input-crawl-url" id="wizard-crawl-url" placeholder="https://example.com/docs" value="${this.esc(this.formData.crawlUrl || '')}" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;" />
        </div>`;
      case 'faq':
        return `<div class="form-group" style="margin-top:12px;">
          <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px;">FAQ Content</label>
          <p style="font-size:12px;color:#6b7280;margin:0 0 8px 0;">Format: Q: question? A: answer. One per line or paragraph.</p>
          <textarea class="form-textarea" data-testid="textarea-faq" id="wizard-faq" rows="5" placeholder="Q: What are your business hours?\nA: We are open 9 AM to 6 PM EST." style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;resize:vertical;">${this.esc(this.knowledgeContent)}</textarea>
        </div>`;
    }
  }

  private bindEvents(stepId: OnboardingStepId): void {
    this.el.querySelector('[data-testid="wizard-close"]')?.addEventListener('click', () => this.callbacks.onClose());
    this.el.querySelector('[data-testid="wizard-prev"]')?.addEventListener('click', () => {
      if (this.currentIndex > 0) { this.currentIndex--; this.render(); }
    });

    // Knowledge source options
    this.el.querySelectorAll('.kb-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const testId = (btn as HTMLElement).dataset.testid;
        if (testId === 'kb-upload') this.knowledgeMode = 'upload';
        else if (testId === 'kb-crawl') this.knowledgeMode = 'crawl';
        else if (testId === 'kb-faq') this.knowledgeMode = 'faq';
        this.render();
      });
    });

    // Brand color live preview
    const colorInput = this.el.querySelector('#wizard-color') as HTMLInputElement;
    if (colorInput) {
      colorInput.addEventListener('input', () => {
        const label = this.el.querySelector('#wizard-color-label');
        if (label) label.textContent = colorInput.value;
      });
    }

    // Test chatbot
    const testBtn = this.el.querySelector('[data-testid="btn-send-test"]');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const query = (this.el.querySelector('#wizard-test-query') as HTMLInputElement)?.value;
        const responseEl = this.el.querySelector('#test-response') as HTMLElement;
        if (!query) { toast.info('Type a question first'); return; }
        try {
          const res = await this.api.post<any>('/api/knowledge/context', { query });
          if (responseEl) {
            responseEl.style.display = 'block';
            responseEl.textContent = res?.context || 'Chatbot is ready! No specific answer found for that question.';
            toast.success('Chatbot is working!');
          }
        } catch {
          if (responseEl) {
            responseEl.style.display = 'block';
            responseEl.textContent = 'Add some knowledge first, then test again.';
          }
          toast.info('Add knowledge before testing');
        }
      });
    }

    // Continue / Finish
    const nextBtn = this.el.querySelector('[data-testid="wizard-next"]');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.handleNext(stepId));
    }
    const finishBtn = this.el.querySelector('[data-testid="wizard-finish"]');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => this.handleFinish(stepId));
    }
  }

  private async handleNext(stepId: OnboardingStepId): Promise<void> {
    const saved = await this.saveStep(stepId);
    if (saved) {
      this.currentIndex++;
      this.render();
    }
  }

  private async handleFinish(stepId: OnboardingStepId): Promise<void> {
    const saved = await this.saveStep(stepId);
    if (saved) {
      try {
        await this.api.put('/api/onboarding/progress', {
          completedSteps: STEPS.map(s => s.id),
          currentStep: null,
          completedAt: new Date().toISOString(),
        });
        const p = getOnboardingProgress();
        if (p) {
          p.completedSteps = STEPS.map(s => s.id);
          p.completedAt = new Date().toISOString();
          setOnboardingProgress(p);
        }
        toast.success('Setup complete! Welcome aboard.');
        this.callbacks.onComplete();
      } catch { toast.error('Failed to complete setup'); }
    }
  }

  private async saveStep(stepId: OnboardingStepId): Promise<boolean> {
    try {
      let completedSteps: string[] = [];
      const p = getOnboardingProgress();
      if (p) completedSteps = [...p.completedSteps];

      if (!completedSteps.includes(stepId)) {
        completedSteps.push(stepId);
      }

      const payload: any = { completedSteps, currentStep: null };

      switch (stepId) {
        case 'workspace': {
          const val = (this.el.querySelector('#wizard-workspace') as HTMLInputElement)?.value?.trim();
          if (!val) { toast.error('Workspace name is required'); return false; }
          this.formData.workspace = val;
          // Update tenant name
          const auth = (await import('../core/auth')).getAuth();
          if (auth.tenantId) {
            await this.api.put(`/api/tenants/${auth.tenantId}`, { name: val });
          }
          break;
        }
        case 'business_type': {
          const val = (this.el.querySelector('#wizard-business') as HTMLSelectElement)?.value;
          if (!val) { toast.error('Please select a business type'); return false; }
          this.formData.businessType = val;
          payload.businessType = val;
          break;
        }
        case 'website': {
          const val = (this.el.querySelector('#wizard-website') as HTMLInputElement)?.value?.trim();
          if (!val) { toast.error('Website URL is required'); return false; }
          this.formData.website = val;
          payload.primaryWebsite = val;
          break;
        }
        case 'brand_color': {
          const val = (this.el.querySelector('#wizard-color') as HTMLInputElement)?.value;
          this.formData.brandColor = val;
          const auth = (await import('../core/auth')).getAuth();
          if (auth.tenantId) {
            const tenant = await this.api.get<any>(`/api/tenants/${auth.tenantId}`);
            const settings = { ...tenant.tenant.settings, branding: { ...tenant.tenant.settings.branding, primaryColor: val } };
            await this.api.put(`/api/tenants/${auth.tenantId}`, { settings });
          }
          break;
        }
        case 'logo':
          // Logo upload is placeholder - skip validation
          break;
        case 'knowledge_source': {
          let ingestionWarning = '';
          try {
            if (this.knowledgeMode === 'upload') {
              const content = (this.el.querySelector('#wizard-knowledge') as HTMLTextAreaElement)?.value?.trim();
              if (!content) { toast.error('Please enter document content'); return false; }
              await this.api.post('/api/knowledge/upload', { filename: 'Onboarding Document.txt', sourceType: 'text', content });
            } else if (this.knowledgeMode === 'crawl') {
              const url = (this.el.querySelector('#wizard-crawl-url') as HTMLInputElement)?.value?.trim();
              if (!url) { toast.error('Please enter a URL to crawl'); return false; }
              await this.api.post('/api/knowledge/crawl', { url, maxDepth: 2, maxPages: 10 });
            } else if (this.knowledgeMode === 'faq') {
              const content = (this.el.querySelector('#wizard-faq') as HTMLTextAreaElement)?.value?.trim();
              if (!content) { toast.error('Please enter FAQ content'); return false; }
              await this.api.post('/api/knowledge/upload/faq', { filename: undefined, content });
            } else {
              toast.error('Please select a knowledge source type');
              return false;
            }

            try { await this.api.post('/api/knowledge/publish'); } catch { /* not critical */ }
          } catch (err: any) {
            ingestionWarning = KNOWLEDGE_FALLBACK_WARNING;
            console.warn('onboarding.knowledge_ingestion_fallback', {
              error: err?.message || 'Unknown onboarding knowledge-ingestion error',
              mode: this.knowledgeMode,
            });
            toast.warning(ingestionWarning);
          }
          break;
        }
        case 'widget_install': {
          const checked = (this.el.querySelector('#wizard-widget-check') as HTMLInputElement)?.checked;
          if (!checked) { toast.error('Please confirm widget installation'); return false; }
          payload.widgetInstalled = true;
          break;
        }
        case 'test_chatbot': {
          // already handled via test button
          break;
        }
      }

      await this.api.put('/api/onboarding/progress', payload);
      const updated = await this.api.get<any>('/api/onboarding/progress');
      if (updated?.progress) setOnboardingProgress(updated.progress);

      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save step');
      return false;
    }
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
