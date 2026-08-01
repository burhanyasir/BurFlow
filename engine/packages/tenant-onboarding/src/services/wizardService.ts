import { v4 as uuidv4 } from 'uuid';
import { loadTemplate } from './templateLoader';
import { isSupportedLanguage, isSupportedCategory, isValidDomain } from './validation';

// WizardService: in-memory orchestration for onboarding wizard


export interface WizardState {
  id: string;
  createdAt: string;
  currentStep: number;
  steps: Record<number, any>;
  completed?: boolean;
  status?: 'draft' | 'saved' | 'completed' | 'abandoned' | 'expired';
  lastSavedAt?: string;
  skippedSteps?: number[];
  expiresAt?: string;
  requiredSteps?: number[];
}

export default class WizardService {
  private store: Map<string, WizardState> = new Map();
  // default TTL: 30 days
  private ttlMs = 30 * 24 * 60 * 60 * 1000;

  start(initial?: any): string {
    const id = uuidv4();
    const now = Date.now();
    const state: WizardState = { id, createdAt: new Date(now).toISOString(), currentStep: 1, steps: {}, status: 'draft', lastSavedAt: new Date(now).toISOString(), skippedSteps: [], expiresAt: new Date(now + this.ttlMs).toISOString(), requiredSteps: [1,2,3,4,5,6,7] };
    if (initial) state.steps[1] = initial;
    this.store.set(id, state);
    return id;
  }

  get(id: string): WizardState | undefined {
    const s = this.store.get(id);
    if (!s) return undefined;
    // check expiration
    if (s.expiresAt && new Date(s.expiresAt).getTime() < Date.now()) {
      s.status = 'expired';
    }
    return s;
  }

  resume(id: string): WizardState | undefined {
    const s = this.get(id);
    if (!s) return undefined;
    if (s.status === 'expired') return s;
    s.status = s.status === 'completed' ? 'completed' : 'saved';
    return s;
  }

  async submitStep(id: string, stepNumber: number, payload: any): Promise<void> {
    const s = this.store.get(id);
    if (!s) throw new Error('wizard not found');
    // recompute expiration on each save
    s.lastSavedAt = new Date().toISOString();
    s.expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
    s.steps[stepNumber] = payload;
    if (s.skippedSteps && s.skippedSteps.includes(stepNumber)) {
      s.skippedSteps = s.skippedSteps.filter((x) => x !== stepNumber);
    }
    // update current step pointer
    if (stepNumber >= s.currentStep) s.currentStep = stepNumber + 1;
    s.status = 'saved';
    // if step 2 (business type) set, compute required steps via journey template
    if (stepNumber === 2) {
      try {
        const businessType = (payload.type || 'generic').toLowerCase();
        // Load richer template bundle (journeys, buttons, widget defaults, ai modules)
        const bundle = loadTemplate(businessType, s.steps[5] || {});
        // attach template bundle to state without overwriting user selections
        (s as any).templateBundle = bundle;

        // compute required steps from bundle metadata (default: all)
        const required: number[] = [1,2,3,4,5,6,7];
        // If no website, skip step 4
        if (s.steps[1] && s.steps[1].website && String(s.steps[1].website).length > 0) {
          // keep 4
        } else {
          // skip step 4
          const idx = required.indexOf(4);
          if (idx >= 0) required.splice(idx,1);
          if (!s.skippedSteps) s.skippedSteps = [];
          if (!s.skippedSteps.includes(4)) s.skippedSteps.push(4);
        }

        // Conditional additions based on business type using bundle.journeys or bundle metadata
        if (bundle && bundle.journeys) {
          // For dental, ensure appointment/insurance flow ordering hint (no structural change)
          if (businessType === 'dental') {
            // ensure step 4 (knowledge) present, step 3 (products) still present
            if (!required.includes(4)) required.push(4);
          }
          if (businessType === 'restaurant') {
            // restaurants often require reservation step -> ensure widget customization and booking are enabled
            if (!required.includes(5)) required.push(5);
          }
        }

        s.requiredSteps = Array.from(new Set(required)).sort((a,b) => a-b);
      } catch (err) {
        console.error('compute required steps error', err);
      }
    }
  }

  listSteps(id: string): Record<number, any> {
    const s = this.store.get(id);
    if (!s) throw new Error('wizard not found');
    return s.steps;
  }

  computeProgress(id: string): { percent: number; completedSteps: number[]; skippedSteps: number[]; remainingSteps: number[] } {
    const s = this.store.get(id);
    if (!s) throw new Error('wizard not found');
    const required = s.requiredSteps || [1,2,3,4,5,6,7];
    const completed: number[] = required.filter((n) => s.steps[n] !== undefined);
    const skipped = s.skippedSteps || [];
    const remaining = required.filter((n) => !completed.includes(n) && !skipped.includes(n));
    const percent = Math.round((completed.length / required.length) * 100);
    return { percent, completedSteps: completed, skippedSteps: skipped, remainingSteps: remaining };
  }

  complete(id: string): any {
    const s = this.store.get(id);
    if (!s) throw new Error('wizard not found');
    s.completed = true;
    s.status = 'completed';
    s.lastSavedAt = new Date().toISOString();
    // Build a tenant summary from the collected steps
    const summary: any = {
      tenantId: `tenant_${uuidv4().slice(0,8)}`,
      createdAt: new Date().toISOString(),
      business: s.steps[1] || {},
      businessType: s.steps[2] || null,
      products: (s.steps[3] && s.steps[3].products) ? s.steps[3].products : [],
      knowledge: (s.steps[4] && (s.steps[4].docs || s.steps[4].source)) ? s.steps[4] : [],
      widget: s.steps[5] || {},
      ai: s.steps[6] || {},
      install: s.steps[7] || {},
    };
    // generate an apiKey stub
    summary.apiKey = `key_${uuidv4().replace(/-/g, '').slice(0,24)}`;

    // Installation artifacts (generated, non-secret placeholders for now)
    const widgetId = `w_${uuidv4().slice(0,8)}`;
    summary.install = summary.install || {};
    summary.install.widgetId = widgetId;
    summary.install.widgetSnippet = `<script>!(function(){window.BurFlowWidget={id:'${widgetId}',apiKey:'${summary.apiKey}'}; /* loader... */})();</script>`;
    summary.install.apiKey = summary.apiKey;
    summary.install.workspaceId = `ws_${uuidv4().slice(0,8)}`;
    summary.install.webhookUrl = `https://hooks.example.com/tenants/${summary.tenantId}/events`;
    summary.install.knowledgeEndpoint = `https://api.example.com/${summary.tenantId}/knowledge`;
    summary.install.adminUrl = `https://app.example.com/${summary.install.workspaceId}/admin`;
    summary.install.dashboardUrl = `https://app.example.com/${summary.install.workspaceId}/dashboard`;

    // channel-aware snippets (placeholders)
    const channels = ['website','shopify','wordpress','webflow','wix','squarespace','html','react','vue','angular','nextjs','nuxt','api'];
    summary.install.channels = {};
    channels.forEach((ch) => {
      switch (ch) {
        case 'website':
          summary.install.channels.website = `<script>/* BurFlow widget loader for website */</script>`;
          break;
        case 'shopify':
          summary.install.channels.shopify = `<script>/* BurFlow Shopify app snippet */</script>`;
          break;
        case 'wordpress':
          summary.install.channels.wordpress = `<!-- BurFlow WP plugin shortcode [burflow_widget id=${widgetId}] -->`;
          break;
        case 'react':
          summary.install.channels.react = `import BurFlowWidget from 'burflow-widget'; <BurFlowWidget apiKey='${summary.apiKey}'/>`;
          break;
        case 'vue':
          summary.install.channels.vue = `<BurFlowWidget :apiKey="'${summary.apiKey}'"/>`;
          break;
        case 'nextjs':
          summary.install.channels.nextjs = `// Add to _document.js or app router: <script src='https://widget.example.com/${widgetId}.js'></script>`;
          break;
        case 'api':
          summary.install.channels.api = `{ "apiKey": "${summary.apiKey}", "endpoint": "${summary.install.knowledgeEndpoint}" }`;
          break;
        default:
          summary.install.channels[ch] = summary.install.widgetSnippet || '';
      }
    });

    // set expiresAt far in the future for completed
    s.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    return summary;
  }

  previewWidget(id: string): any {
    const s = this.store.get(id);
    if (!s) throw new Error('wizard not found');
    // default widget template
    const defaults = { position: 'bottom-right', theme: 'light', color: '#0066ff', welcome: 'Hi, how can we help?', language: 'en' };
    const widget = { ...defaults, ...(s.steps[5] || {}) };
    // generate preview payload (front-end will render)
    return { preview: { widget } };
  }
}
